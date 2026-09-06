import { parseWorkout } from './playerContext.js';
import { GYM_EXERCISES } from './content.js';
import { todayISO, addDays } from './dates.js';

const HIGH_INTENSITY = new Set(['gym', 'field']);

export async function scanPlan(db, playerId, daysAhead = 14) {
  const today = todayISO();
  const endDate = addDays(today, daysAhead - 1);
  const rawRows = await db.prepare(`SELECT * FROM workouts WHERE player_id = ? AND scheduled_date BETWEEN ? AND ? AND status != 'completed' ORDER BY scheduled_date ASC`)
    .all(playerId, today, endDate);
  const rows = rawRows.map(parseWorkout);
  const player = await db.prepare('SELECT equipment_json FROM players WHERE id = ?').get(playerId);
  const equipment = JSON.parse(player?.equipment_json || '[]');
  const issues = [];

  for (let i = 0; i < rows.length - 1; i++) {
    const cur = rows[i];
    const next = rows[i + 1];
    const consecutive = addDays(cur.scheduled_date, 1) === next.scheduled_date;
    if (!consecutive) continue;

    const curHeavyLegs = cur.day_type === 'gym' && cur.main.some((m) => ['lower_power', 'posterior_chain'].includes(m.category));
    if (curHeavyLegs && next.day_type === 'field') {
      issues.push({
        id: `seq_${cur.id}_${next.id}`, type: 'sequencing',
        workoutIds: [cur.id, next.id],
        description: `Heavy lower-body gym work on ${cur.scheduled_date} is scheduled the day before sprint/field work on ${next.scheduled_date} — legs may not be fresh for quality speed work.`,
        suggestedFix: 'Swap the two days, or shift the gym session to upper-body focus.',
      });
    }
    if (HIGH_INTENSITY.has(cur.day_type) && next.day_type === 'game') {
      issues.push({
        id: `pregame_${cur.id}`, type: 'pre_game_load',
        workoutIds: [cur.id],
        description: `${cur.day_type === 'field' ? 'Hard conditioning/field work' : 'A heavy gym session'} on ${cur.scheduled_date} falls right before a game on ${next.scheduled_date}.`,
        suggestedFix: 'Lighten or move this session so the player is fresher for the game.',
      });
    }
  }

  // 3+ consecutive high-intensity days without recovery
  let run = 0; let runStart = null;
  for (let i = 0; i < rows.length; i++) {
    if (HIGH_INTENSITY.has(rows[i].day_type)) {
      if (run === 0) runStart = rows[i];
      run++;
    } else {
      if (run >= 3) {
        issues.push({
          id: `fatigue_${runStart.id}`, type: 'excess_intensity',
          workoutIds: rows.slice(i - run, i).map((r) => r.id),
          description: `${run} high-intensity training days in a row (${runStart.scheduled_date} → ${rows[i - 1].scheduled_date}) with no recovery day between them.`,
          suggestedFix: 'Insert or convert one of these days to active recovery.',
        });
      }
      run = 0;
    }
  }

  // repetitive skills workouts
  const skillsWorkouts = rows.filter((r) => r.day_type === 'skills');
  for (let i = 0; i < skillsWorkouts.length - 1; i++) {
    const a = skillsWorkouts[i]; const b = skillsWorkouts[i + 1];
    const namesA = a.main.map((m) => m.name).sort().join('|');
    const namesB = b.main.map((m) => m.name).sort().join('|');
    if (namesA && namesA === namesB) {
      issues.push({
        id: `repeat_${a.id}_${b.id}`, type: 'repetitive',
        workoutIds: [a.id, b.id],
        description: `Skills workouts on ${a.scheduled_date} and ${b.scheduled_date} contain the exact same drills.`,
        suggestedFix: 'Swap in different drills for variety while keeping the same category focus.',
      });
    }
  }

  // equipment conflicts (gym exercises only — easiest to verify against the library)
  for (const w of rows) {
    if (w.day_type !== 'gym') continue;
    for (const item of w.main) {
      const def = GYM_EXERCISES.find((e) => e.name === item.name);
      if (def && !def.equipment.every((e) => equipment.includes(e))) {
        issues.push({
          id: `equip_${w.id}_${item.name}`, type: 'equipment_conflict',
          workoutIds: [w.id],
          description: `"${item.name}" on ${w.scheduled_date} requires equipment (${def.equipment.join(', ')}) not currently in the player's equipment list.`,
          suggestedFix: 'Substitute an equivalent exercise the player can actually perform.',
        });
      }
    }
  }

  // conflicts with imported external events (games, school, etc.)
  const externalEvents = await db.prepare('SELECT * FROM external_events WHERE player_id = ? AND start_date BETWEEN ? AND ?').all(playerId, today, endDate);
  for (const ev of externalEvents) {
    const sameDay = rows.filter((r) => r.scheduled_date === ev.start_date && HIGH_INTENSITY.has(r.day_type));
    for (const w of sameDay) {
      issues.push({
        id: `external_${ev.id}_${w.id}`, type: 'external_conflict',
        workoutIds: [w.id],
        description: `"${w.title}" (${w.day_type}) on ${w.scheduled_date} is scheduled the same day as "${ev.title}" from your imported calendar.`,
        suggestedFix: 'Lighten this session or move it to a different day.',
      });
    }
  }

  // missing recovery for a heavy schedule
  const trainingDaysThisWeek = rows.filter((r) => r.scheduled_date <= addDays(today, 6));
  const hasRecovery = trainingDaysThisWeek.some((r) => r.day_type === 'recovery');
  if (trainingDaysThisWeek.length >= 5 && !hasRecovery) {
    issues.push({
      id: 'missing_recovery',
      type: 'missing_recovery',
      workoutIds: trainingDaysThisWeek.map((r) => r.id),
      description: `${trainingDaysThisWeek.length} training sessions are scheduled this week with no dedicated recovery day.`,
      suggestedFix: 'Convert the lowest-priority session this week into active recovery.',
    });
  }

  return issues;
}
