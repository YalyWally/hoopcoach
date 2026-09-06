import { newId } from './ids.js';
import { addDays } from './dates.js';
import { parseWorkout } from './playerContext.js';

async function logChange(db, playerId, { changeType, summary, reason, before, after, source }) {
  await db.prepare(`INSERT INTO ai_change_history (id, player_id, change_type, summary, reason, before_json, after_json, source)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    newId('chg'), playerId, changeType, summary, reason || null,
    before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, source || 'auto_adapt'
  );
}

async function saveWorkout(db, workout) {
  await db.prepare(`UPDATE workouts SET title=?, objective=?, est_duration_min=?, main_json=?, warmup_json=?, cooldown_json=?, difficulty=?, status=?, version=version+1, updated_at=datetime('now') WHERE id=?`)
    .run(workout.title, workout.objective, workout.est_duration_min, JSON.stringify(workout.main), JSON.stringify(workout.warmup), JSON.stringify(workout.cooldown), workout.difficulty, workout.status, workout.id);
}

// Pre-workout soreness/injury check-in. Returns { workout, medicalAdvisory, changed }
export async function applyCheckin(db, workoutRow, checkin) {
  const workout = parseWorkout(workoutRow);
  const before = { title: workout.title, main: workout.main, est_duration_min: workout.est_duration_min };
  let changed = false;
  let medicalAdvisory = false;

  const severeInjury = checkin.status === 'injured' && (checkin.severity >= 6 || checkin.worsens_with_movement);
  if (checkin.status === 'injured') {
    medicalAdvisory = severeInjury;
    // Replace high-impact content with a modified session that avoids the reported area where possible.
    const loc = (checkin.location || '').toLowerCase();
    const lowerBodyHit = /ankle|knee|leg|hip|foot|calf|hamstring|quad|groin/.test(loc);
    const upperBodyHit = /shoulder|wrist|elbow|hand|back|neck/.test(loc);

    if (workout.day_type === 'field' || (workout.day_type === 'gym' && lowerBodyHit)) {
      workout.title = `${workout.title} (Modified — Injury Reported)`;
      workout.objective = 'Modified session to work around a reported injury. Upper-body/core and mobility only — avoid loading the affected area.';
      workout.main = [
        { name: 'Upper-Body Maintenance Circuit', category: 'upper_push', sets: 3, reps: '10-12', note: 'Bodyweight or light load only, pain-free range of motion.' },
        { name: 'Core Stability Work', category: 'core', sets: 3, reps: '30-45s', note: 'Planks/anti-rotation holds, no aggravation of the injury site.' },
        { name: 'Mobility & Breathing', durationMin: 10, description: 'Gentle mobility for uninjured joints and diaphragmatic breathing to aid recovery.' },
      ];
      workout.est_duration_min = Math.min(workout.est_duration_min || 45, 35);
      workout.status = 'modified';
      changed = true;
    } else if (workout.day_type === 'skills' && lowerBodyHit) {
      workout.title = `${workout.title} (Modified — Injury Reported)`;
      workout.objective = 'Seated/stationary ball-handling and passing only — no cutting, jumping, or sprinting while the injury is present.';
      workout.main = workout.main.filter((m) => m.category === 'ball_handling' || m.category === 'passing').slice(0, 2);
      if (!workout.main.length) {
        workout.main = [{ name: 'Seated Ball-Handling Series', category: 'ball_handling', durationMin: 15, description: 'Stationary, seated dribbling series that keeps load off the lower body.' }];
      }
      workout.status = 'modified';
      changed = true;
    } else if (workout.day_type === 'gym' && upperBodyHit) {
      workout.title = `${workout.title} (Modified — Injury Reported)`;
      workout.objective = 'Lower-body and core focus — avoid loading the affected upper-body area.';
      workout.main = workout.main.filter((m) => ['lower_power', 'posterior_chain', 'core'].includes(m.category));
      if (!workout.main.length) {
        workout.main = [{ name: 'Bodyweight Lower-Body Circuit', category: 'lower_power', sets: 3, reps: '10-12', note: 'Bodyweight only while the upper body recovers.' }];
      }
      workout.status = 'modified';
      changed = true;
    } else {
      workout.title = `${workout.title} (Modified — Injury Reported)`;
      workout.objective = 'Light mobility and technique only while the injury is assessed.';
      workout.est_duration_min = Math.min(workout.est_duration_min || 30, 25);
      workout.status = 'modified';
      changed = true;
    }
    await saveWorkout(db, workout);
    await logChange(db, workoutRow.player_id, {
      changeType: 'workout_modified_injury',
      summary: `Modified "${before.title}" on ${workout.scheduled_date} after an injury was reported${checkin.location ? ` (${checkin.location})` : ''}.`,
      reason: `Player reported an injury${checkin.location ? ` at the ${checkin.location}` : ''}${checkin.severity ? `, severity ${checkin.severity}/10` : ''}.`,
      before, after: { title: workout.title, main: workout.main, est_duration_min: workout.est_duration_min },
      source: 'auto_adapt',
    });
  } else if (checkin.status === 'sore') {
    const severity = checkin.severity || 4;
    if (severity >= 6) {
      workout.main = workout.main.map((m) => ({
        ...m,
        sets: m.sets ? Math.max(2, Math.round(m.sets * 0.7)) : m.sets,
        durationMin: m.durationMin ? Math.round(m.durationMin * 0.75) : m.durationMin,
      }));
      workout.est_duration_min = workout.est_duration_min ? Math.round(workout.est_duration_min * 0.8) : workout.est_duration_min;
      workout.objective = `${workout.objective} — volume reduced due to reported soreness.`;
      workout.status = 'modified';
      changed = true;
      await saveWorkout(db, workout);
      await logChange(db, workoutRow.player_id, {
        changeType: 'workout_modified_soreness',
        summary: `Reduced volume on "${before.title}" (${workout.scheduled_date}) due to significant soreness.`,
        reason: `Player reported soreness${checkin.location ? ` in the ${checkin.location}` : ''} at severity ${severity}/10.`,
        before, after: { title: workout.title, main: workout.main, est_duration_min: workout.est_duration_min },
        source: 'auto_adapt',
      });
    }
  }

  return { workout, medicalAdvisory, changed };
}

// Post-workout feedback -> adjust the *next* similar workout (progressive overload / backoff)
export async function applyPostWorkoutFeedback(db, workout, log) {
  if (workout.day_type !== 'gym' && workout.day_type !== 'field') return null;
  const painOrHard = log.pain_flag || (log.difficulty_rating != null && log.difficulty_rating >= 9);
  const tooEasy = log.difficulty_rating != null && log.difficulty_rating <= 4 && !log.pain_flag;

  const nextSimilar = await db.prepare(`SELECT * FROM workouts WHERE player_id = ? AND day_type = ? AND scheduled_date > ? AND status = 'scheduled' ORDER BY scheduled_date ASC LIMIT 1`)
    .get(workout.player_id, workout.day_type, workout.scheduled_date);
  if (!nextSimilar) return null;
  const next = parseWorkout(nextSimilar);
  const before = { main: next.main, objective: next.objective };

  if (painOrHard) {
    next.main = next.main.map((m) => ({ ...m, sets: m.sets ? Math.max(2, m.sets - 1) : m.sets, note: m.note ? `${m.note} (backed off after tough last session)` : 'Backed off slightly after a tough last session.' }));
    next.objective = `${next.objective} — intensity slightly reduced based on your last session feedback.`;
    await saveWorkout(db, next);
    await logChange(db, workout.player_id, {
      changeType: 'progression_backoff',
      summary: `Backed off "${next.title}" on ${next.scheduled_date} after tough/painful feedback on the previous ${workout.day_type} session.`,
      reason: log.pain_flag ? 'Player reported pain during the previous session.' : `Player rated the previous session ${log.difficulty_rating}/10 difficulty.`,
      before, after: { main: next.main, objective: next.objective }, source: 'auto_adapt',
    });
    return next;
  }
  if (tooEasy) {
    next.main = next.main.map((m) => (m.sets ? { ...m, reps: bumpReps(m.reps), note: m.note ? `${m.note} (progressed — last session felt easy)` : 'Progressed load/reps — last session felt easy.' } : m));
    next.objective = `${next.objective} — progressed slightly since the last session felt manageable.`;
    await saveWorkout(db, next);
    await logChange(db, workout.player_id, {
      changeType: 'progression_increase',
      summary: `Progressed "${next.title}" on ${next.scheduled_date} after the previous ${workout.day_type} session felt easy (${log.difficulty_rating}/10).`,
      reason: `Player rated the previous session ${log.difficulty_rating}/10 difficulty with no pain.`,
      before, after: { main: next.main, objective: next.objective }, source: 'auto_adapt',
    });
    return next;
  }
  return null;
}

function bumpReps(reps) {
  const match = /(\d+)(-(\d+))?/.exec(reps || '');
  if (!match) return reps;
  const lo = parseInt(match[1], 10) + 1;
  const hi = match[3] ? parseInt(match[3], 10) + 1 : null;
  return hi ? `${lo}-${hi}` : `${lo}`;
}

export { logChange, saveWorkout };
