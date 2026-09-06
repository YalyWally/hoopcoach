import { Router } from 'express';
import db from '../db/index.js';
import { getPlayer } from '../lib/playerContext.js';
import { generateMealPlanForDate, generateMealPlanRange, regenerateMealSlot, parseMealPlanDay } from '../lib/mealPlanGenerator.js';
import { addDays, todayISO } from '../lib/dates.js';
import { newId } from '../lib/ids.js';

const router = Router();

router.get('/players/:id/meal-plan', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const from = req.query.from || todayISO();
  const to = req.query.to || addDays(from, 6);

  const existing = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC').all(player.id, from, to);
  const existingDates = new Set(existing.map((r) => r.date));

  let cursor = from;
  const missing = [];
  while (cursor <= to) {
    if (!existingDates.has(cursor)) missing.push(cursor);
    cursor = addDays(cursor, 1);
  }
  if (missing.length) {
    const usedThisWeek = new Set(existing.flatMap((r) => [r.breakfast_json, r.lunch_json, r.snack_json, r.dinner_json]).map((j) => { try { return JSON.parse(j)?.recipeId; } catch { return null; } }).filter(Boolean));
    for (const date of missing) {
      const workout = await db.prepare('SELECT day_type FROM workouts WHERE player_id = ? AND scheduled_date = ? LIMIT 1').get(player.id, date);
      await generateMealPlanForDate(db, player, date, { usedThisWeek, dayType: workout?.day_type });
    }
  }

  const rows = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC').all(player.id, from, to);
  res.json(rows.map(parseMealPlanDay));
});

router.post('/players/:id/meal-plan/generate', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const days = Number(req.body.days) || 7;
  const startDate = req.body.startDate || todayISO();
  const results = await generateMealPlanRange(db, player, startDate, days);
  res.json({ generated: results.length });
});

router.post('/players/:id/meal-plan/swap', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const { date, mealType, reason } = req.body;
  const existing = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date = ?').get(player.id, date);
  const prev = existing ? JSON.parse(existing[`${mealType}_json`] || 'null') : null;
  const snapshot = await regenerateMealSlot(db, player, date, mealType, prev?.recipeId);

  await db.prepare(`INSERT INTO ai_change_history (id, player_id, change_type, summary, reason, before_json, after_json, source)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    newId('chg'), player.id, 'meal_swapped', `Swapped ${mealType} on ${date}: "${prev?.name || 'unplanned'}" → "${snapshot.name}".`,
    reason || 'Manual swap', JSON.stringify(prev), JSON.stringify(snapshot), 'chat'
  );

  res.json(snapshot);
});

export default router;
