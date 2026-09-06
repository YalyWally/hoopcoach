import { Router } from 'express';
import db from '../db/index.js';
import { newId } from '../lib/ids.js';
import { vapidKeys, sendPushToPlayer } from '../lib/push.js';
import { getPlayer } from '../lib/playerContext.js';

const router = Router();

router.get('/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys?.publicKey || null });
});

router.post('/players/:id/push/subscribe', async (req, res) => {
  const sub = req.body; // { endpoint, keys: { p256dh, auth } }
  if (!sub?.endpoint) return res.status(400).json({ error: 'invalid subscription' });
  const existing = await db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(sub.endpoint);
  if (existing) {
    await db.prepare('UPDATE push_subscriptions SET player_id = ?, keys_json = ? WHERE id = ?').run(req.params.id, JSON.stringify(sub.keys), existing.id);
  } else {
    await db.prepare('INSERT INTO push_subscriptions (id, player_id, endpoint, keys_json) VALUES (?,?,?,?)').run(newId('push'), req.params.id, sub.endpoint, JSON.stringify(sub.keys));
  }
  res.json({ subscribed: true });
});

router.post('/players/:id/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  res.json({ unsubscribed: true });
});

router.get('/players/:id/notification-prefs', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  res.json(JSON.parse(player.notification_prefs_json || '{}'));
});

router.patch('/players/:id/notification-prefs', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const current = JSON.parse(player.notification_prefs_json || '{}');
  const merged = { ...current, ...req.body };
  await db.prepare('UPDATE players SET notification_prefs_json = ? WHERE id = ?').run(JSON.stringify(merged), req.params.id);
  res.json(merged);
});

router.post('/players/:id/push/test', async (req, res) => {
  const results = await sendPushToPlayer(req.params.id, { title: 'HoopCoach', body: 'Notifications are working — your coach will keep you posted.', tag: 'test' });
  res.json({ results });
});

export default router;
