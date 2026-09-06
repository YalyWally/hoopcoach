import { newId } from './ids.js';
import { addDays, dayKeyOf, todayISO, DAY_KEYS } from './dates.js';
import {
  SKILL_DRILLS, GYM_EXERCISES, FIELD_DRILLS, RECOVERY_ACTIVITIES,
  GOAL_TO_SKILL_CATEGORY, GOAL_TO_GYM_CATEGORY, GOAL_TO_FIELD_CATEGORY,
  POSITION_SKILL_BOOST, POSITION_GYM_BOOST,
} from './content.js';

const BLOCK_TEMPLATE = [
  { phase: 'foundation', weeks: 4, label: 'Foundation' },
  { phase: 'development', weeks: 4, label: 'Development' },
  { phase: 'performance', weeks: 3, label: 'Performance' },
  { phase: 'deload', weeks: 1, label: 'Deload + Retest' },
];

const DAY_TYPE_PATTERNS = {
  1: ['skills'],
  2: ['skills', 'gym'],
  3: ['skills', 'gym', 'field'],
  4: ['skills', 'gym', 'field', 'skills'],
  5: ['skills', 'gym', 'field', 'skills', 'recovery'],
  6: ['skills', 'gym', 'field', 'skills', 'gym', 'recovery'],
};

function sortByWeekday(days) {
  return [...days].sort((a, b) => DAY_KEYS.indexOf(a) - DAY_KEYS.indexOf(b));
}

export function goalWeights(goals) {
  // goals: [{key, rank}] rank starting at 1
  const sorted = [...(goals || [])].sort((a, b) => a.rank - b.rank);
  const baseWeights = [0.42, 0.28, 0.18, 0.07, 0.05];
  const weights = {};
  let total = 0;
  sorted.forEach((g, i) => {
    const w = baseWeights[i] ?? 0.02;
    weights[g.key] = (weights[g.key] || 0) + w;
    total += w;
  });
  if (total === 0) return { overall_performance: 1 };
  Object.keys(weights).forEach((k) => (weights[k] = weights[k] / total));
  return weights;
}

function categoryWeightsFor(goalW, mapping, availableCategories, positionBoost) {
  const catW = {};
  for (const [goalKey, weight] of Object.entries(goalW)) {
    const cats = mapping[goalKey];
    if (!cats) continue;
    for (const c of cats) {
      if (!availableCategories.includes(c)) continue;
      catW[c] = (catW[c] || 0) + weight;
    }
  }
  // ensure every available category gets at least a small baseline so sessions stay balanced
  for (const c of availableCategories) {
    catW[c] = (catW[c] || 0) + 0.08;
  }
  // small positional nudge (e.g. bigs get a bit more finishing/post work, guards more ball handling)
  if (positionBoost) {
    for (const [c, boost] of Object.entries(positionBoost)) {
      if (availableCategories.includes(c)) catW[c] = (catW[c] || 0) + boost;
    }
  }
  const total = Object.values(catW).reduce((a, b) => a + b, 0) || 1;
  Object.keys(catW).forEach((k) => (catW[k] = catW[k] / total));
  return catW;
}

function pickDrillsForCategory(pool, category, equipment, count, exclude = []) {
  const options = pool.filter(
    (d) => d.category === category && d.equipment.every((e) => equipment.includes(e)) && !exclude.includes(d.key)
  );
  const fallback = pool.filter((d) => d.category === category && d.equipment.every((e) => equipment.includes(e)));
  const source = options.length ? options : fallback;
  if (!source.length) return [];
  const picked = [];
  for (let i = 0; i < count && source.length; i++) {
    picked.push(source[(i + picked.length) % source.length]);
  }
  return picked;
}

function minutesToBlocks(mainMinutes, catWeights) {
  const entries = Object.entries(catWeights).sort((a, b) => b[1] - a[1]);
  const raw = entries.map(([cat, w]) => ({ cat, min: Math.round(mainMinutes * w) }));
  // drop categories under 6 min, redistribute to top categories
  const kept = raw.filter((r) => r.min >= 6);
  const dropped = raw.filter((r) => r.min < 6).reduce((s, r) => s + r.min, 0);
  if (kept.length && dropped > 0) {
    kept[0].min += dropped;
  }
  return kept.length ? kept : raw.slice(0, 1);
}

function buildSkillsWorkout({ player, equipment, goalW, phase, recentDrillKeys }) {
  const duration = player.schedule?.typicalDurationMin || 60;
  const warmupMin = duration >= 40 ? 8 : 5;
  const cooldownMin = 5;
  const mainMinutes = Math.max(15, duration - warmupMin - cooldownMin);
  const availableCategories = ['ball_handling', 'shooting', 'finishing', 'passing', 'defense', 'decision_making'].filter(
    (c) => SKILL_DRILLS.some((d) => d.category === c && d.equipment.every((e) => equipment.includes(e)))
  );
  const catW = categoryWeightsFor(goalW, GOAL_TO_SKILL_CATEGORY, availableCategories, POSITION_SKILL_BOOST[player.position]);
  const blocks = minutesToBlocks(mainMinutes, catW);

  const warmup = [{ name: 'Dynamic Ball-Handling Warm-Up', durationMin: warmupMin, desc: 'Stationary pounds, wide crossovers, and light movement to raise heart rate and prep the hands.' }];
  const main = [];
  const usedKeys = [...recentDrillKeys];
  for (const b of blocks) {
    const numDrills = b.min >= 18 ? 2 : 1;
    const perDrillMin = Math.round(b.min / numDrills);
    const drills = pickDrillsForCategory(SKILL_DRILLS, b.cat, equipment, numDrills, usedKeys);
    drills.forEach((d) => {
      usedKeys.push(d.key);
      main.push({
        name: d.name,
        category: d.category,
        durationMin: perDrillMin,
        description: d.desc,
        target: phase === 'foundation' ? 'Focus on quality and consistency' : phase === 'performance' ? 'Full game-speed, track makes/attempts' : 'Increase tempo while holding form',
      });
    });
  }
  const cooldown = [{ name: 'Cooldown Stretch', durationMin: cooldownMin, desc: 'Light static stretching for legs, hips, and shoulders.' }];
  const objective = `Balanced skills development weighted toward: ${Object.entries(catW).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c.replace('_', ' ')).join(', ')}`;
  return {
    title: 'Skills Workout',
    objective,
    est_duration_min: duration,
    warmup, main, cooldown,
    performance_targets: main.filter((m) => m.category === 'shooting').map((m) => `Track makes/attempts on ${m.name}`),
  };
}

function buildGymWorkout({ player, equipment, goalW, phase, upperFocus, recentExerciseKeys }) {
  const duration = player.schedule?.typicalDurationMin || 60;
  const warmupMin = 8;
  const cooldownMin = 5;
  const mainMinutes = Math.max(15, duration - warmupMin - cooldownMin);
  let availableCategories = ['lower_power', 'upper_push', 'upper_pull', 'posterior_chain', 'core'].filter(
    (c) => GYM_EXERCISES.some((e) => e.category === c && e.equipment.every((eq) => equipment.includes(eq)))
  );
  if (upperFocus) {
    availableCategories = availableCategories.filter((c) => c !== 'lower_power' && c !== 'posterior_chain');
    if (!availableCategories.length) availableCategories = ['upper_push', 'upper_pull', 'core'];
  }
  const catW = categoryWeightsFor(goalW, GOAL_TO_GYM_CATEGORY, availableCategories, POSITION_GYM_BOOST[player.position]);
  const numExercises = Math.max(3, Math.min(6, Math.round(mainMinutes / 9)));
  const sortedCats = Object.entries(catW).sort((a, b) => b[1] - a[1]);
  const main = [];
  const usedKeys = [...recentExerciseKeys];
  let i = 0;
  while (main.length < numExercises && sortedCats.length) {
    const [cat] = sortedCats[i % sortedCats.length];
    const [ex] = pickDrillsForCategoryGym(cat, equipment, usedKeys);
    if (ex) {
      usedKeys.push(ex.key);
      const intensityNote = phase === 'foundation' ? 'Build base — moderate load, focus on technique.'
        : phase === 'performance' ? 'Peak intensity — near-top working sets.'
        : phase === 'deload' ? 'Light load, technique refresh only.' : 'Progressive overload — add load/reps vs. last session if it felt controlled.';
      main.push({
        name: ex.name, category: ex.category, sets: phase === 'deload' ? Math.max(2, ex.sets - 1) : ex.sets,
        reps: ex.reps, tempo: ex.tempo, restSec: ex.type === 'power' ? 120 : 75, note: intensityNote,
      });
    }
    i++;
    if (i > 20) break;
  }
  const warmup = [{ name: 'General Warm-Up + Activation', durationMin: warmupMin, desc: 'Light cardio, hip/ankle mobility, and glute activation before loading.' }];
  const cooldown = [{ name: 'Cooldown Stretch', durationMin: cooldownMin, desc: 'Static stretching for the muscle groups trained today.' }];
  return {
    title: upperFocus ? 'Gym Workout (Upper-Body Focus)' : 'Gym Workout',
    objective: `Basketball-specific strength & power${upperFocus ? ' — legs kept fresh for tomorrow’s speed work' : ''}`,
    est_duration_min: duration,
    warmup, main, cooldown,
    performance_targets: main.map((m) => `${m.name}: log weight used for ${m.sets}x${m.reps}`),
  };

  function pickDrillsForCategoryGym(category, equip, exclude) {
    const options = GYM_EXERCISES.filter((e) => e.category === category && e.equipment.every((eq) => equip.includes(eq)) && !exclude.includes(e.key));
    const fallback = GYM_EXERCISES.filter((e) => e.category === category && e.equipment.every((eq) => equip.includes(eq)));
    const source = options.length ? options : fallback;
    return source.length ? [source[0]] : [];
  }
}

function buildFieldWorkout({ player, equipment, goalW, phase, recentDrillKeys }) {
  const duration = player.schedule?.typicalDurationMin || 60;
  const warmupMin = 10;
  const cooldownMin = 5;
  const mainMinutes = Math.max(15, duration - warmupMin - cooldownMin);
  const availableCategories = ['sprint_mechanics', 'acceleration', 'max_velocity', 'agility_cod', 'reaction', 'jumping_plyo', 'conditioning'].filter(
    (c) => FIELD_DRILLS.some((d) => d.category === c && d.equipment.every((eq) => equipment.includes(eq)))
  );
  const catW = categoryWeightsFor(goalW, GOAL_TO_FIELD_CATEGORY, availableCategories);
  const blocks = minutesToBlocks(mainMinutes, catW);
  const usedKeys = [...recentDrillKeys];
  const main = [];
  for (const b of blocks) {
    const drills = pickDrillsForCategory(FIELD_DRILLS, b.cat, equipment, 1, usedKeys);
    drills.forEach((d) => {
      usedKeys.push(d.key);
      const isMaxEffort = d.intensity === 'high';
      main.push({
        name: d.name, category: d.category, durationMin: b.min, description: d.desc,
        restNote: isMaxEffort ? 'Full recovery (60-90s+) between reps — quality over fatigue.' : 'Short recovery between reps.',
      });
    });
  }
  const warmup = [{ name: 'Movement Prep', durationMin: warmupMin, desc: 'Dynamic stretching, skips, and build-up strides to prepare for max-effort work.' }];
  const cooldown = [{ name: 'Cooldown Walk + Stretch', durationMin: cooldownMin, desc: 'Easy walk and static stretching to begin recovery.' }];
  return {
    title: 'Field / Athletic Workout',
    objective: `Speed, power & conditioning weighted toward: ${Object.entries(catW).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c.replace('_', ' ')).join(', ')}`,
    est_duration_min: duration,
    warmup, main, cooldown,
    performance_targets: main.filter((m) => ['acceleration', 'max_velocity'].includes(m.category)).map((m) => `Time ${m.name} if possible`),
  };
}

function buildRecoveryWorkout({ player }) {
  const items = RECOVERY_ACTIVITIES.slice(0, 3);
  return {
    title: 'Recovery Day',
    objective: 'Active recovery, mobility, and tissue quality work',
    est_duration_min: items.reduce((s, i) => s + i.durationMin, 0),
    warmup: [], main: items.map((i) => ({ name: i.name, durationMin: i.durationMin, description: i.desc })), cooldown: [],
    performance_targets: [],
  };
}

function buildTestingWorkout() {
  return {
    title: 'Retest Day — Skills & Athletic Assessment',
    objective: 'Repeat key assessment tests to measure progress and set the next training block',
    est_duration_min: 50,
    warmup: [{ name: 'General Warm-Up', durationMin: 10, desc: 'Light dynamic warm-up before max-effort testing.' }],
    main: [{ name: 'Retest Battery', durationMin: 35, description: 'Complete the retest tests selected by your coach in the Progress tab.' }],
    cooldown: [{ name: 'Cooldown', durationMin: 5, desc: 'Easy stretch after testing.' }],
    performance_targets: ['Compare results to initial and previous assessments'],
  };
}

function buildGameDay() {
  return {
    title: 'Game Day',
    objective: 'Compete — no additional training load',
    est_duration_min: 0,
    warmup: [], main: [{ name: 'Pre-Game Routine', durationMin: 0, description: 'Light ball-handling activation and shooting warm-up per your normal pre-game routine.' }], cooldown: [],
    performance_targets: [],
  };
}

function dayTypesForWeek(trainingDays, gameDaySet, phase) {
  const sorted = sortByWeekday(trainingDays);
  const n = Math.min(sorted.length, 6);
  const pattern = DAY_TYPE_PATTERNS[n] || DAY_TYPE_PATTERNS[6];
  const assignment = sorted.slice(0, 6).map((day, i) => ({ day, type: pattern[i] || 'recovery' }));
  // avoid heavy legs immediately before a game day
  assignment.forEach((a, i) => {
    if (gameDaySet.has(a.day)) {
      a.type = 'game';
    }
  });
  for (let i = 0; i < assignment.length - 1; i++) {
    const cur = assignment[i];
    const next = assignment[i + 1];
    const curIdx = DAY_KEYS.indexOf(cur.day);
    const nextIdx = DAY_KEYS.indexOf(next.day);
    const consecutive = (nextIdx - curIdx + 7) % 7 === 1;
    if (consecutive && cur.type === 'gym' && next.type === 'field') {
      cur.upperFocus = true;
    }
    if (consecutive && next.type === 'game' && (cur.type === 'field' || cur.type === 'gym')) {
      cur.type = 'skills';
      cur.lightIntensity = true;
    }
  }
  if (phase === 'deload') {
    assignment.forEach((a) => { if (a.type !== 'game') a.lightIntensity = true; });
  }
  return assignment;
}

export async function generateProgram(db, player) {
  const startDate = todayISO();
  const schedule = player.schedule || {};
  const trainingDays = schedule.trainingDays?.length ? schedule.trainingDays : ['mon', 'wed', 'fri'];
  const gameDaySet = new Set(schedule.gameDays || []);
  const equipment = player.equipment?.length ? player.equipment : ['basketball', 'hoop'];
  const goalW = goalWeights(player.goals);

  let cursor = startDate;
  const blocks = [];
  for (let idx = 0; idx < BLOCK_TEMPLATE.length; idx++) {
    const tpl = BLOCK_TEMPLATE[idx];
    const blockStart = cursor;
    const blockEnd = addDays(cursor, tpl.weeks * 7 - 1);
    const blockId = newId('block');
    await db.prepare(`INSERT INTO training_blocks (id, player_id, name, phase, block_index, start_date, end_date, weeks, focus_json, status)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      blockId, player.id, `${tpl.label} Block`, tpl.phase, idx + 1, blockStart, blockEnd, tpl.weeks,
      JSON.stringify(Object.entries(goalW).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)), 'active'
    );
    blocks.push({ id: blockId, ...tpl, startDate: blockStart, endDate: blockEnd });
    cursor = addDays(blockEnd, 1);
  }

  const recentByCat = { skills: [], gym: [], field: [] };
  for (const block of blocks) {
    for (let w = 0; w < block.weeks; w++) {
      const weekStart = addDays(block.startDate, w * 7);
      const isLastWeekOfProgram = block.phase === 'deload' && w === block.weeks - 1;
      const dayAssignments = dayTypesForWeek(trainingDays, gameDaySet, block.phase);
      for (let i = 0; i < dayAssignments.length; i++) {
        const a = dayAssignments[i];
        const actualDate = dateForWeekday(weekStart, a.day);
        let type = a.type;
        if (isLastWeekOfProgram && i === dayAssignments.length - 1 && type !== 'game') {
          type = 'testing';
        }
        const workout = buildWorkoutForType(type, {
          player, equipment, goalW, phase: block.phase, upperFocus: a.upperFocus,
          recentDrillKeys: type === 'field' ? recentByCat.field : recentByCat.skills,
          recentExerciseKeys: recentByCat.gym,
        });
        if (a.lightIntensity && workout.est_duration_min) {
          workout.est_duration_min = Math.round(workout.est_duration_min * 0.7);
          workout.objective += ' (reduced load)';
        }
        await insertWorkout(db, player.id, block.id, actualDate, type, workout);
        if (type === 'skills') recentByCat.skills = workout.main.slice(-2).map((m) => m.name);
        if (type === 'gym') recentByCat.gym = workout.main.slice(-2).map((m) => m.name);
        if (type === 'field') recentByCat.field = workout.main.slice(-2).map((m) => m.name);
      }
    }
  }
  return blocks;
}

function dateForWeekday(weekStartDate, targetDayKey) {
  const startKey = dayKeyOf(weekStartDate);
  const diff = (DAY_KEYS.indexOf(targetDayKey) - DAY_KEYS.indexOf(startKey) + 7) % 7;
  return addDays(weekStartDate, diff);
}

function buildWorkoutForType(type, ctx) {
  switch (type) {
    case 'skills': return buildSkillsWorkout(ctx);
    case 'gym': return buildGymWorkout(ctx);
    case 'field': return buildFieldWorkout(ctx);
    case 'recovery': return buildRecoveryWorkout(ctx);
    case 'testing': return buildTestingWorkout();
    case 'game': return buildGameDay();
    default: return buildRecoveryWorkout(ctx);
  }
}

export async function insertWorkout(db, playerId, blockId, date, dayType, workout) {
  const id = newId('wk');
  await db.prepare(`INSERT INTO workouts (id, player_id, block_id, scheduled_date, day_type, title, objective, est_duration_min, equipment_json, warmup_json, main_json, cooldown_json, performance_targets_json, difficulty, status, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, playerId, blockId, date, dayType, workout.title, workout.objective, workout.est_duration_min,
    JSON.stringify(workout.equipment || []), JSON.stringify(workout.warmup || []), JSON.stringify(workout.main || []),
    JSON.stringify(workout.cooldown || []), JSON.stringify(workout.performance_targets || []),
    workout.difficulty || 'moderate', 'scheduled', 'system'
  );
  return id;
}

export async function regenerateUpcoming(db, player, daysAhead = 14) {
  const today = todayISO();
  const endDate = addDays(today, daysAhead - 1);
  const rows = await db.prepare(`SELECT * FROM workouts WHERE player_id = ? AND scheduled_date BETWEEN ? AND ? AND status = 'scheduled'`).all(player.id, today, endDate);
  if (!rows.length) return { count: 0 };
  const equipment = player.equipment?.length ? player.equipment : ['basketball', 'hoop'];
  const goalW = goalWeights(player.goals);
  const blockCache = {};
  let count = 0;
  for (const row of rows) {
    if (row.day_type === 'game') continue;
    let phase = 'development';
    if (row.block_id) {
      if (!(row.block_id in blockCache)) blockCache[row.block_id] = await db.prepare('SELECT * FROM training_blocks WHERE id = ?').get(row.block_id);
      phase = blockCache[row.block_id]?.phase || phase;
    }
    const workout = buildWorkoutForType(row.day_type, { player, equipment, goalW, phase, upperFocus: false, recentDrillKeys: [], recentExerciseKeys: [] });
    await db.prepare(`UPDATE workouts SET title=?, objective=?, est_duration_min=?, warmup_json=?, main_json=?, cooldown_json=?, performance_targets_json=?, status='scheduled', created_by='ai', version=version+1, updated_at=datetime('now') WHERE id=?`)
      .run(workout.title, workout.objective, workout.est_duration_min, JSON.stringify(workout.warmup), JSON.stringify(workout.main), JSON.stringify(workout.cooldown), JSON.stringify(workout.performance_targets || []), row.id);
    count++;
  }
  return { count };
}

export { buildWorkoutForType, dayTypesForWeek };
