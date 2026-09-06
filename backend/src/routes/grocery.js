import { Router } from 'express';
import db from '../db/index.js';
import { getPlayer } from '../lib/playerContext.js';
import { generateMealPlanForDate } from '../lib/mealPlanGenerator.js';
import { buildGroceryList } from '../lib/groceryList.js';
import { addDays, todayISO, dayKeyOf } from '../lib/dates.js';

const router = Router();

function mondayOfWeek(date) {
  const key = dayKeyOf(date);
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const idx = order.indexOf(key);
  return addDays(date, -idx);
}

router.get('/players/:id/grocery-list', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const weekStart = req.query.weekStart || mondayOfWeek(todayISO());
  const weekEnd = addDays(weekStart, 6);

  const existing = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC').all(player.id, weekStart, weekEnd);
  const existingDates = new Set(existing.map((r) => r.date));
  const usedThisWeek = new Set();
  let cursor = weekStart;
  while (cursor <= weekEnd) {
    if (!existingDates.has(cursor)) {
      const workout = await db.prepare('SELECT day_type FROM workouts WHERE player_id = ? AND scheduled_date = ? LIMIT 1').get(player.id, cursor);
      await generateMealPlanForDate(db, player, cursor, { usedThisWeek, dayType: workout?.day_type });
    }
    cursor = addDays(cursor, 1);
  }

  const rows = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC').all(player.id, weekStart, weekEnd);
  const categories = buildGroceryList(rows);
  res.json({ weekStart, weekEnd, categories });
});

export default router;
