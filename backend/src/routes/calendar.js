import { Router } from 'express';
import db from '../db/index.js';
import { getPlayer } from '../lib/playerContext.js';
import { generateWorkoutICS, parseICS } from '../lib/ical.js';
import { newId } from '../lib/ids.js';
import { todayISO, addDays } from '../lib/dates.js';

const router = Router();

// Subscribable feed — add this URL in Google/Apple Calendar as "From URL".
router.get('/players/:id/calendar.ics', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).send('not found');
  const from = addDays(todayISO(), -7);
  const to = addDays(todayISO(), 90);
  const workouts = await db.prepare('SELECT * FROM workouts WHERE player_id = ? AND scheduled_date BETWEEN ? AND ? ORDER BY scheduled_date ASC').all(player.id, from, to);
  const ics = generateWorkoutICS(player, workouts);
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', 'inline; filename="hoopcoach-training.ics"');
  res.send(ics);
});

// Import external events (games, practice, school schedule) from a pasted/uploaded .ics file.
router.post('/players/:id/calendar/import', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const { icsText } = req.body;
  if (!icsText) return res.status(400).json({ error: 'icsText is required' });
  let events;
  try {
    events = parseICS(icsText);
  } catch (e) {
    return res.status(400).json({ error: `Could not parse calendar file: ${e.message}` });
  }
  const upcoming = events.filter((e) => e.startDate >= addDays(todayISO(), -1));
  for (const e of upcoming) {
    await db.prepare(`INSERT INTO external_events (id, player_id, uid, title, start_date, end_date, all_day, source) VALUES (?,?,?,?,?,?,?,?)`)
      .run(newId('extev'), player.id, e.uid, e.title, e.startDate, e.endDate, e.allDay ? 1 : 0, 'ics_import');
  }
  res.json({ imported: upcoming.length, total: events.length });
});

router.get('/players/:id/calendar/external-events', async (req, res) => {
  const from = req.query.from || addDays(todayISO(), -1);
  const to = req.query.to || addDays(todayISO(), 30);
  const rows = await db.prepare('SELECT * FROM external_events WHERE player_id = ? AND start_date BETWEEN ? AND ? ORDER BY start_date ASC').all(req.params.id, from, to);
  res.json(rows);
});

router.delete('/calendar/external-events/:eventId', async (req, res) => {
  await db.prepare('DELETE FROM external_events WHERE id = ?').run(req.params.eventId);
  res.json({ deleted: true });
});

export default router;
