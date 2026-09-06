import { todayISO, addDays } from './dates.js';

export function parsePlayer(row) {
  if (!row) return null;
  return {
    ...row,
    goals: JSON.parse(row.goals_json || '[]'),
    schedule: JSON.parse(row.schedule_json || '{}'),
    equipment: JSON.parse(row.equipment_json || '[]'),
    foodPrefs: JSON.parse(row.food_prefs_json || '{}'),
    dietaryRestrictions: JSON.parse(row.dietary_restrictions_json || '[]'),
    deadlineGoal: JSON.parse(row.deadline_goal_json || 'null'),
  };
}

export async function getPlayer(db, id) {
  const row = await db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  return parsePlayer(row);
}

function parseWorkout(row) {
  if (!row) return null;
  return {
    ...row,
    equipment: JSON.parse(row.equipment_json || '[]'),
    warmup: JSON.parse(row.warmup_json || '[]'),
    main: JSON.parse(row.main_json || '[]'),
    cooldown: JSON.parse(row.cooldown_json || '[]'),
    performance_targets: JSON.parse(row.performance_targets_json || '[]'),
  };
}

export { parseWorkout };

export async function getFullContext(db, playerId) {
  const player = await getPlayer(db, playerId);
  if (!player) return null;
  const today = todayISO();
  const assessmentRows = await db.prepare('SELECT * FROM assessments WHERE player_id = ? ORDER BY taken_at DESC LIMIT 5').all(playerId);
  const assessments = assessmentRows.map((a) => ({ ...a, results: JSON.parse(a.results_json), ratings: JSON.parse(a.ratings_json) }));
  const latestAssessment = assessments[0] || null;
  const previousAssessment = assessments[1] || null;

  const upcomingWorkoutRows = await db.prepare('SELECT * FROM workouts WHERE player_id = ? AND scheduled_date >= ? ORDER BY scheduled_date ASC LIMIT 14')
    .all(playerId, addDays(today, -1));
  const upcomingWorkouts = upcomingWorkoutRows.map(parseWorkout);

  const todayWorkout = upcomingWorkouts.find((w) => w.scheduled_date === today) || null;

  const recentLogs = await db.prepare(`SELECT wl.*, w.title, w.day_type, w.scheduled_date FROM workout_logs wl
    JOIN workouts w ON w.id = wl.workout_id WHERE wl.player_id = ? ORDER BY wl.completed_at DESC LIMIT 8`).all(playerId);

  const recentCheckins = await db.prepare('SELECT * FROM checkins WHERE player_id = ? ORDER BY created_at DESC LIMIT 5').all(playerId);

  const nutritionTarget = await db.prepare('SELECT * FROM nutrition_targets WHERE player_id = ? ORDER BY effective_date DESC LIMIT 1').get(playerId);

  const todayLogsRows = await db.prepare(`SELECT * FROM nutrition_logs WHERE player_id = ? AND date(logged_at) = date('now') ORDER BY logged_at ASC`).all(playerId);
  const todayTotals = todayLogsRows.reduce((acc, l) => {
    acc.calories += l.calories || 0; acc.protein_g += l.protein_g || 0; acc.carbs_g += l.carbs_g || 0;
    acc.fat_g += l.fat_g || 0; acc.fiber_g += l.fiber_g || 0; acc.sugar_g += l.sugar_g || 0; acc.sodium_mg += l.sodium_mg || 0;
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });

  const changeHistory = await db.prepare('SELECT * FROM ai_change_history WHERE player_id = ? ORDER BY changed_at DESC LIMIT 10').all(playerId);

  const upcomingExternalEvents = await db.prepare('SELECT * FROM external_events WHERE player_id = ? AND start_date >= ? ORDER BY start_date ASC LIMIT 15').all(playerId, addDays(today, -1));

  const todayMealPlanRow = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date = ?').get(playerId, today);
  const todayMealPlan = todayMealPlanRow ? {
    breakfast: JSON.parse(todayMealPlanRow.breakfast_json || 'null'),
    lunch: JSON.parse(todayMealPlanRow.lunch_json || 'null'),
    snack: JSON.parse(todayMealPlanRow.snack_json || 'null'),
    dinner: JSON.parse(todayMealPlanRow.dinner_json || 'null'),
  } : null;

  const trainingLoad = await db.prepare(`SELECT wl.difficulty_rating, wl.soreness_level, wl.energy_level, w.day_type, w.scheduled_date
    FROM workout_logs wl JOIN workouts w ON w.id = wl.workout_id WHERE wl.player_id = ? ORDER BY wl.completed_at DESC LIMIT 14`).all(playerId);

  return {
    player, latestAssessment, previousAssessment, upcomingWorkouts, todayWorkout,
    recentLogs, recentCheckins, nutritionTarget, todayTotals, todayLogs: todayLogsRows,
    changeHistory, trainingLoad, today, upcomingExternalEvents, todayMealPlan,
  };
}
