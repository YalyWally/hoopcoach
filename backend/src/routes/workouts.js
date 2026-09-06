import { Router } from 'express';
import db from '../db/index.js';
import { newId } from '../lib/ids.js';
import { parseWorkout } from '../lib/playerContext.js';
import { applyCheckin, applyPostWorkoutFeedback } from '../lib/adaptation.js';
import { sendPushToPlayer } from '../lib/push.js';

const router = Router();

router.get('/players/:id/workouts', async (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = await db.prepare('SELECT * FROM workouts WHERE player_id = ? AND scheduled_date BETWEEN ? AND ? ORDER BY scheduled_date ASC').all(req.params.id, from, to);
  } else {
    rows = await db.prepare('SELECT * FROM workouts WHERE player_id = ? ORDER BY scheduled_date ASC').all(req.params.id);
  }
  res.json(rows.map(parseWorkout));
});

router.get('/workouts/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(parseWorkout(row));
});

router.patch('/workouts/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const b = req.body;
  const fields = {
    title: b.title, objective: b.objective, scheduled_date: b.scheduledDate, day_type: b.dayType,
    est_duration_min: b.estDurationMin, difficulty: b.difficulty, status: b.status,
    warmup_json: b.warmup ? JSON.stringify(b.warmup) : undefined,
    main_json: b.main ? JSON.stringify(b.main) : undefined,
    cooldown_json: b.cooldown ? JSON.stringify(b.cooldown) : undefined,
    performance_targets_json: b.performanceTargets ? JSON.stringify(b.performanceTargets) : undefined,
  };
  const sets = []; const values = [];
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) { sets.push(`${k} = ?`); values.push(v); }
  if (sets.length) {
    sets.push("updated_at = datetime('now')");
    sets.push('version = version + 1');
    values.push(req.params.id);
    await db.prepare(`UPDATE workouts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
  const updated = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  res.json(parseWorkout(updated));
});

router.post('/workouts/:id/checkin', async (req, res) => {
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const c = req.body; // { status, location, severity, worsens_with_movement, affected_previous, notes }
  const id = newId('chk');
  await db.prepare(`INSERT INTO checkins (id, player_id, workout_id, date, status, location, severity, worsens_with_movement, affected_previous, notes)
    VALUES (?,?,?,date('now'),?,?,?,?,?,?)`).run(
    id, row.player_id, row.id, c.status, c.location || null, c.severity || null,
    c.worsensWithMovement ? 1 : 0, c.affectedPrevious ? 1 : 0, c.notes || null
  );
  const result = await applyCheckin(db, row, { status: c.status, location: c.location, severity: c.severity, worsens_with_movement: c.worsensWithMovement });
  res.json({
    workout: result.workout,
    changed: result.changed,
    medicalAdvisory: result.medicalAdvisory,
    medicalMessage: result.medicalAdvisory
      ? "Based on what you described, this may need a professional evaluation. This app can't diagnose injuries — please consider seeing an athletic trainer, physical therapist, or doctor before training on it further."
      : null,
  });
});

router.post('/workouts/:id/complete', async (req, res) => {
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const b = req.body; // { difficultyRating, energyLevel, sorenessLevel, painFlag, overallRating, notes, drillResults }
  const id = newId('wlog');
  await db.prepare(`INSERT INTO workout_logs (id, workout_id, player_id, difficulty_rating, energy_level, soreness_level, pain_flag, overall_rating, notes, drill_results_json)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, row.id, row.player_id, b.difficultyRating ?? null, b.energyLevel ?? null, b.sorenessLevel ?? null,
    b.painFlag ? 1 : 0, b.overallRating ?? null, b.notes || null, JSON.stringify(b.drillResults || [])
  );
  await db.prepare(`UPDATE workouts SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(row.id);

  // simple gamification: XP + streak
  const player = await db.prepare('SELECT * FROM players WHERE id = ?').get(row.player_id);
  const today = new Date().toISOString().slice(0, 10);
  let streak = player.streak_count || 0;
  if (player.last_active_date) {
    const last = new Date(player.last_active_date);
    const diffDays = Math.round((new Date(today) - last) / 86400000);
    streak = diffDays === 1 ? streak + 1 : diffDays === 0 ? streak : 1;
  } else {
    streak = 1;
  }
  const xpGain = 50 + (b.overallRating ? b.overallRating * 2 : 0);
  await db.prepare('UPDATE players SET xp = xp + ?, streak_count = ?, last_active_date = ?, level = 1 + CAST((xp + ?) / 300 AS INTEGER) WHERE id = ?')
    .run(xpGain, streak, today, xpGain, row.player_id);

  const adaptedNext = await applyPostWorkoutFeedback(db, parseWorkout(row), b);

  if (streak > 0 && streak % 5 === 0) {
    const playerRow = await db.prepare('SELECT notification_prefs_json FROM players WHERE id = ?').get(row.player_id);
    const prefs = JSON.parse(playerRow?.notification_prefs_json || '{}');
    if (prefs.milestones !== false) {
      sendPushToPlayer(row.player_id, { title: 'HoopCoach', body: `🔥 ${streak}-day streak! Keep it going.`, tag: 'streak' }).catch(() => {});
    }
  }

  res.json({ logged: true, xpGain, streak, adaptedNextWorkout: adaptedNext || null });
});

router.post('/players/:id/workouts/move', async (req, res) => {
  const { workoutId, newDate } = req.body;
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ? AND player_id = ?').get(workoutId, req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const oldDate = row.scheduled_date;
  await db.prepare("UPDATE workouts SET scheduled_date = ?, updated_at = datetime('now') WHERE id = ?").run(newDate, workoutId);
  await db.prepare(`INSERT INTO ai_change_history (id, player_id, change_type, summary, reason, before_json, after_json, source)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    newId('chg'), req.params.id, 'workout_moved', `Moved "${row.title}" from ${oldDate} to ${newDate}.`, req.body.reason || 'Manual move',
    JSON.stringify({ date: oldDate }), JSON.stringify({ date: newDate }), 'chat'
  );
  const updated = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
  res.json(parseWorkout(updated));
});

router.get('/players/:id/change-history', async (req, res) => {
  const rawRows = await db.prepare('SELECT * FROM ai_change_history WHERE player_id = ? ORDER BY changed_at DESC LIMIT 50').all(req.params.id);
  const rows = rawRows.map((r) => ({ ...r, before: r.before_json ? JSON.parse(r.before_json) : null, after: r.after_json ? JSON.parse(r.after_json) : null }));
  res.json(rows);
});

export default router;
