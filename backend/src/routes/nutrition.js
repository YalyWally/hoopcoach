import { Router } from 'express';
import db from '../db/index.js';
import { newId } from '../lib/ids.js';
import { getPlayer } from '../lib/playerContext.js';
import { computeNutritionTargets } from '../lib/nutrition.js';
import { estimateMealMacros } from '../lib/claude.js';

const router = Router();

async function latestTarget(playerId) {
  return db.prepare('SELECT * FROM nutrition_targets WHERE player_id = ? ORDER BY effective_date DESC, created_at DESC LIMIT 1').get(playerId);
}

router.get('/players/:id/nutrition/targets', async (req, res) => {
  res.json((await latestTarget(req.params.id)) || null);
});

router.post('/players/:id/nutrition/targets/recompute', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const t = computeNutritionTargets(player);
  await insertTarget(req.params.id, t);
  res.json(await latestTarget(req.params.id));
});

export async function insertTarget(playerId, t) {
  await db.prepare(`INSERT INTO nutrition_targets (id, player_id, effective_date, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, sat_fat_g, cholesterol_mg, calcium_mg, iron_mg, potassium_mg)
    VALUES (?,?,date('now'),?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    newId('ntgt'), playerId, t.calories, t.protein_g, t.carbs_g, t.fat_g, t.fiber_g, t.sugar_g, t.sodium_mg, t.sat_fat_g, t.cholesterol_mg, t.calcium_mg, t.iron_mg, t.potassium_mg
  );
}

async function todayTotals(playerId) {
  const rows = await db.prepare(`SELECT * FROM nutrition_logs WHERE player_id = ? AND date(logged_at) = date('now') ORDER BY logged_at ASC`).all(playerId);
  const totals = rows.reduce((acc, l) => {
    acc.calories += l.calories || 0; acc.protein_g += l.protein_g || 0; acc.carbs_g += l.carbs_g || 0;
    acc.fat_g += l.fat_g || 0; acc.fiber_g += l.fiber_g || 0; acc.sugar_g += l.sugar_g || 0; acc.sodium_mg += l.sodium_mg || 0;
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });
  return { rows, totals };
}

router.get('/players/:id/nutrition/today', async (req, res) => {
  const target = await latestTarget(req.params.id);
  const { rows, totals } = await todayTotals(req.params.id);
  const remaining = target ? {
    calories: target.calories - totals.calories,
    protein_g: target.protein_g - totals.protein_g,
    carbs_g: target.carbs_g - totals.carbs_g,
    fat_g: target.fat_g - totals.fat_g,
  } : null;
  res.json({ target, logs: rows, totals, remaining });
});

router.post('/players/:id/nutrition/log', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const b = req.body; // { description, mealType, manualMacros? }
  let macros;
  let source = 'manual';
  let isEstimate = 0;
  if (b.manualMacros) {
    macros = b.manualMacros;
    if (b.source) { source = b.source; isEstimate = b.isEstimate ? 1 : 0; }
  } else {
    const dietaryContext = [
      player.dietaryRestrictions?.length ? `Restrictions: ${player.dietaryRestrictions.join(', ')}` : '',
    ].filter(Boolean).join('. ');
    macros = await estimateMealMacros(b.description, dietaryContext);
    source = 'ai_estimate';
    isEstimate = 1;
  }
  const id = newId('nlog');
  await db.prepare(`INSERT INTO nutrition_logs (id, player_id, meal_type, description, source, is_estimate, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, raw_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, player.id, b.mealType || null, b.description, source, isEstimate,
    macros.calories || 0, macros.protein_g || 0, macros.carbs_g || 0, macros.fat_g || 0,
    macros.fiber_g || 0, macros.sugar_g || 0, macros.sodium_mg || 0, JSON.stringify(macros)
  );

  const target = await latestTarget(player.id);
  const { totals } = await todayTotals(player.id);
  const remaining = target ? { calories: target.calories - totals.calories, protein_g: target.protein_g - totals.protein_g } : null;
  let guidance = null;
  if (remaining && remaining.calories < 0) {
    guidance = `That puts you ${Math.abs(Math.round(remaining.calories))} kcal over today's target — consider a lighter dinner or adding some extra activity.`;
  } else if (remaining && target && macros.calories > target.calories * 0.5) {
    guidance = 'That was a big chunk of today\'s calories in one meal — I\'ll keep the rest of today a bit lighter.';
  }

  res.json({ log: { id, ...macros, description: b.description, mealType: b.mealType, source, isEstimate: !!isEstimate }, totals, remaining, guidance, macrosUnavailable: !!macros.unavailable, macroNote: macros.note });
});

router.patch('/nutrition/logs/:logId', async (req, res) => {
  const b = req.body;
  await db.prepare(`UPDATE nutrition_logs SET calories=?, protein_g=?, carbs_g=?, fat_g=?, fiber_g=?, sugar_g=?, sodium_mg=?, source='manual', is_estimate=0 WHERE id=?`)
    .run(b.calories || 0, b.protein_g || 0, b.carbs_g || 0, b.fat_g || 0, b.fiber_g || 0, b.sugar_g || 0, b.sodium_mg || 0, req.params.logId);
  res.json({ updated: true });
});

router.delete('/nutrition/logs/:logId', async (req, res) => {
  await db.prepare('DELETE FROM nutrition_logs WHERE id = ?').run(req.params.logId);
  res.json({ deleted: true });
});

router.get('/players/:id/nutrition/history', async (req, res) => {
  const days = Number(req.query.days) || 14;
  const rows = await db.prepare(`SELECT date(logged_at) as day, SUM(calories) calories, SUM(protein_g) protein_g, SUM(carbs_g) carbs_g, SUM(fat_g) fat_g
    FROM nutrition_logs WHERE player_id = ? AND date(logged_at) >= date('now', ?) GROUP BY day ORDER BY day ASC`)
    .all(req.params.id, `-${days} days`);
  res.json(rows);
});

// Food preferences questionnaire
router.post('/players/:id/food-prefs', async (req, res) => {
  const { foodPrefs, dietaryRestrictions } = req.body;
  const sets = []; const values = [];
  if (foodPrefs) { sets.push('food_prefs_json = ?'); values.push(JSON.stringify(foodPrefs)); }
  if (dietaryRestrictions) { sets.push('dietary_restrictions_json = ?'); values.push(JSON.stringify(dietaryRestrictions)); }
  if (sets.length) {
    values.push(req.params.id);
    await db.prepare(`UPDATE players SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json(await getPlayer(db, req.params.id));
});

export default router;
