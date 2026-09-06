import { Router } from 'express';
import db from '../db/index.js';
import { newId } from '../lib/ids.js';
import { getFullContext, getPlayer } from '../lib/playerContext.js';
import { computeNutritionTargets } from '../lib/nutrition.js';

const router = Router();

router.post('/', async (req, res) => {
  const b = req.body;
  const id = newId('player');
  await db.prepare(`INSERT INTO players (id, name, email, age, height_in, weight_lb, sex, position, experience_level, current_level, activity_level, goals_json, schedule_json, equipment_json, food_prefs_json, dietary_restrictions_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, b.name || 'Player', b.email || null, b.age || null, b.heightIn || null, b.weightLb || null, b.sex || null,
    b.position || null, b.experienceLevel || 'jv', b.currentLevel || null, b.activityLevel || 'moderate',
    JSON.stringify(b.goals || []), JSON.stringify(b.schedule || {}), JSON.stringify(b.equipment || []),
    JSON.stringify(b.foodPrefs || {}), JSON.stringify(b.dietaryRestrictions || [])
  );

  // seed initial nutrition targets from onboarding basics right away
  const player = await getPlayer(db, id);
  const targets = computeNutritionTargets(player);
  await db.prepare(`INSERT INTO nutrition_targets (id, player_id, effective_date, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, sat_fat_g, cholesterol_mg, calcium_mg, iron_mg, potassium_mg)
    VALUES (?,?,date('now'),?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    newId('ntgt'), id, targets.calories, targets.protein_g, targets.carbs_g, targets.fat_g, targets.fiber_g,
    targets.sugar_g, targets.sodium_mg, targets.sat_fat_g, targets.cholesterol_mg, targets.calcium_mg, targets.iron_mg, targets.potassium_mg
  );

  res.json(await getPlayer(db, id));
});

router.get('/:id', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  res.json(player);
});

router.patch('/:id', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const b = req.body;
  const fields = {
    name: b.name, email: b.email, age: b.age, height_in: b.heightIn, weight_lb: b.weightLb, sex: b.sex,
    position: b.position, experience_level: b.experienceLevel, current_level: b.currentLevel, activity_level: b.activityLevel,
    goals_json: b.goals ? JSON.stringify(b.goals) : undefined,
    schedule_json: b.schedule ? JSON.stringify(b.schedule) : undefined,
    equipment_json: b.equipment ? JSON.stringify(b.equipment) : undefined,
    food_prefs_json: b.foodPrefs ? JSON.stringify(b.foodPrefs) : undefined,
    dietary_restrictions_json: b.dietaryRestrictions ? JSON.stringify(b.dietaryRestrictions) : undefined,
    deadline_goal_json: b.deadlineGoal !== undefined ? JSON.stringify(b.deadlineGoal) : undefined,
    onboarding_complete: b.onboardingComplete !== undefined ? (b.onboardingComplete ? 1 : 0) : undefined,
  };
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); values.push(v); }
  }
  if (sets.length) {
    values.push(req.params.id);
    await db.prepare(`UPDATE players SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json(await getPlayer(db, req.params.id));
});

router.get('/:id/context', async (req, res) => {
  const ctx = await getFullContext(db, req.params.id);
  if (!ctx) return res.status(404).json({ error: 'not found' });
  res.json(ctx);
});

export default router;
