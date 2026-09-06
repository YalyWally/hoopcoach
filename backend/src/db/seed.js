// Optional demo data seeder: creates a fully-populated demo player so the
// app feels alive immediately. Run with `npm run seed` from backend/.
import db from './index.js';
import { newId } from '../lib/ids.js';
import { getPlayer } from '../lib/playerContext.js';
import { computeNutritionTargets } from '../lib/nutrition.js';
import { computeRatings } from '../lib/assessmentTests.js';
import { generateProgram } from '../lib/planGenerator.js';
import { generateMealPlanRange } from '../lib/mealPlanGenerator.js';
import { addDays, todayISO } from '../lib/dates.js';

async function insertTarget(playerId, t) {
  await db.prepare(`INSERT INTO nutrition_targets (id, player_id, effective_date, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, sat_fat_g, cholesterol_mg, calcium_mg, iron_mg, potassium_mg)
    VALUES (?,?,date('now'),?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    newId('ntgt'), playerId, t.calories, t.protein_g, t.carbs_g, t.fat_g, t.fiber_g, t.sugar_g, t.sodium_mg, t.sat_fat_g, t.cholesterol_mg, t.calcium_mg, t.iron_mg, t.potassium_mg
  );
}

const id = newId('player');
await db.prepare(`INSERT INTO players (id, name, email, age, height_in, weight_lb, sex, position, experience_level, current_level, activity_level, goals_json, schedule_json, equipment_json, food_prefs_json, dietary_restrictions_json, onboarding_complete)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(
  id, 'Jordan Rivera', 'demo@hoopcoach.app', 16, 74, 168, 'male', 'Shooting Guard', 'varsity', 'High School Varsity', 'active',
  JSON.stringify([{ key: 'shooting', rank: 1 }, { key: 'ball_handling', rank: 2 }, { key: 'vertical', rank: 3 }, { key: 'conditioning', rank: 4 }]),
  JSON.stringify({ trainingDays: ['mon', 'tue', 'wed', 'thu', 'fri'], typicalDurationMin: 65, gameDays: ['sat'], practiceDays: ['mon', 'wed'], commitments: 'School until 3pm on weekdays' }),
  JSON.stringify(['basketball', 'hoop', 'dumbbells', 'bands', 'cones', 'agility_ladder', 'plyo_boxes']),
  JSON.stringify({}), JSON.stringify(['Nut Allergy'])
);

const player = await getPlayer(db, id);
await insertTarget(id, computeNutritionTargets(player));

const initialResults = {
  ft_makes: 13, midrange_makes: 9, three_makes: 6, catch_shoot_makes: 8,
  cone_dribble_time: 23, two_ball_drops: 5,
  layup_makes_right: 8, layup_makes_left: 4,
  passing_accuracy: 6,
  defensive_slide_time: 13.2, reaction_drill_time: 9.6,
  sprint_10yd: 1.95, sprint_20yd: 3.25,
  vertical_jump: 21, broad_jump: 76,
  conditioning_score: 9,
  pushups_60s: 27, plank_hold: 65,
};
const { ratings, ovr } = computeRatings(initialResults, player);
const assessId = newId('assess');
const takenAt = addDays(todayISO(), -21);
await db.prepare(`INSERT INTO assessments (id, player_id, type, taken_at, results_json, ratings_json, ovr) VALUES (?,?,?,?,?,?,?)`)
  .run(assessId, id, 'initial', takenAt + ' 09:00:00', JSON.stringify(initialResults), JSON.stringify(ratings), ovr);

const retestResults = {
  ft_makes: 15, midrange_makes: 11, three_makes: 8, catch_shoot_makes: 9,
  cone_dribble_time: 21.5, two_ball_drops: 4,
  layup_makes_right: 9, layup_makes_left: 6,
  passing_accuracy: 7,
  defensive_slide_time: 12.7, reaction_drill_time: 9.1,
  sprint_10yd: 1.9, sprint_20yd: 3.15,
  vertical_jump: 23, broad_jump: 79,
  conditioning_score: 11,
  pushups_60s: 30, plank_hold: 78,
};
const { ratings: retestRatings, ovr: retestOvr } = computeRatings(retestResults, player);
await db.prepare(`INSERT INTO assessments (id, player_id, type, taken_at, results_json, ratings_json, ovr) VALUES (?,?,?,?,?,?,?)`)
  .run(newId('assess'), id, 'retest', addDays(todayISO(), -7) + ' 09:00:00', JSON.stringify(retestResults), JSON.stringify(retestRatings), retestOvr);

await generateProgram(db, player);
await generateMealPlanRange(db, player, todayISO(), 14);

// mark a few of the earliest workouts as completed with feedback, and log a couple check-ins
const early = await db.prepare(`SELECT * FROM workouts WHERE player_id = ? ORDER BY scheduled_date ASC LIMIT 6`).all(id);
for (const [i, w] of early.slice(0, 4).entries()) {
  await db.prepare(`UPDATE workouts SET status='completed' WHERE id = ?`).run(w.id);
  await db.prepare(`INSERT INTO workout_logs (id, workout_id, player_id, completed_at, difficulty_rating, energy_level, soreness_level, pain_flag, overall_rating, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    newId('wlog'), w.id, id, w.scheduled_date + ' 18:00:00', 5 + (i % 3), 7 - (i % 2), 3 + (i % 3), 0, 7, null
  );
}

await db.prepare('UPDATE players SET xp = ?, level = ?, streak_count = ?, last_active_date = ? WHERE id = ?')
  .run(240, 2, 4, todayISO(), id);

// a few nutrition logs over the past 5 days
for (let d = 5; d >= 1; d--) {
  const day = addDays(todayISO(), -d);
  const meals = [
    { meal_type: 'breakfast', description: 'Oatmeal with banana and peanut butter', calories: 480, protein_g: 18, carbs_g: 70, fat_g: 14 },
    { meal_type: 'lunch', description: 'Grilled chicken, rice, and broccoli', calories: 650, protein_g: 50, carbs_g: 70, fat_g: 15 },
    { meal_type: 'dinner', description: 'Salmon, sweet potato, and salad', calories: 700, protein_g: 45, carbs_g: 55, fat_g: 28 },
  ];
  for (const m of meals) {
    await db.prepare(`INSERT INTO nutrition_logs (id, player_id, logged_at, meal_type, description, source, is_estimate, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, raw_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      newId('nlog'), id, day + ' 12:00:00', m.meal_type, m.description, 'manual', 0, m.calories, m.protein_g, m.carbs_g, m.fat_g, 6, 8, 400, '{}'
    );
  }
}

await db.prepare(`INSERT INTO ai_change_history (id, player_id, change_type, summary, reason, before_json, after_json, source)
  VALUES (?,?,?,?,?,?,?,?)`).run(
  newId('chg'), id, 'workout_modified_soreness', 'Reduced volume on "Gym Workout" (last week) due to reported soreness.',
  'Player reported soreness in the legs at severity 7/10.', null, null, 'auto_adapt'
);

console.log(`Seeded demo player: ${player.name} (id: ${id})`);
console.log('Open the app and paste this ID into localStorage under key "hc_player_id", or just use Onboarding to create your own player.');
