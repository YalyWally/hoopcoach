import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { newId } from './ids.js';
import { todayISO } from './dates.js';

// See the matching comment in db/index.js — this prefers the real CJS
// `__dirname` global that exists once Netlify's bundler compiles this to CJS,
// and only computes it from `import.meta.url` for local (unbundled) dev.
const moduleDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));
const VAPID_PATH = path.join(moduleDir, '../../vapid.json');

function loadOrCreateVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  // Serverless deployments (Netlify Functions, etc.) have no persistent disk between
  // invocations, so a file-based key would silently regenerate on every cold start and
  // invalidate every existing push subscription. In that environment we require real
  // env vars instead of ever falling back to a generated/written file.
  const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    console.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set — push notifications are disabled until they are configured. Run `npm run generate-vapid-keys` once and set the result as env vars.');
    return null;
  }
  if (fs.existsSync(VAPID_PATH)) {
    return JSON.parse(fs.readFileSync(VAPID_PATH, 'utf-8'));
  }
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_PATH, JSON.stringify(keys, null, 2));
  console.log('Generated new VAPID keys for web push (saved to backend/vapid.json).');
  return keys;
}

export const vapidKeys = loadOrCreateVapidKeys();
if (vapidKeys) {
  webpush.setVapidDetails('mailto:coach@hoopcoach.app', vapidKeys.publicKey, vapidKeys.privateKey);
}

export async function sendPushToPlayer(playerId, payload) {
  if (!vapidKeys) return [];
  const subs = await db.prepare('SELECT * FROM push_subscriptions WHERE player_id = ?').all(playerId);
  const results = [];
  for (const sub of subs) {
    const subscription = { endpoint: sub.endpoint, keys: JSON.parse(sub.keys_json) };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      results.push({ endpoint: sub.endpoint, ok: true });
    } catch (e) {
      results.push({ endpoint: sub.endpoint, ok: false, error: e.message });
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      }
    }
  }
  return results;
}

async function alreadyNotifiedToday(playerId, kind) {
  const row = await db.prepare('SELECT id FROM notification_log WHERE player_id = ? AND kind = ? AND sent_date = ?').get(playerId, kind, todayISO());
  return !!row;
}

async function markNotified(playerId, kind) {
  await db.prepare('INSERT INTO notification_log (id, player_id, kind, sent_date) VALUES (?,?,?,?)').run(newId('notif'), playerId, kind, todayISO());
}

function getPrefs(player) {
  try { return JSON.parse(player.notification_prefs_json || '{}'); } catch { return {}; }
}

// Called on an interval (local dev) or by a scheduled function (Netlify). Keeps
// notifications sparse and purposeful rather than chatty.
export async function runNotificationSweep() {
  if (!vapidKeys) return;
  const players = await db.prepare('SELECT * FROM players WHERE id IN (SELECT DISTINCT player_id FROM push_subscriptions)').all();
  const today = todayISO();
  const hour = new Date().getHours();

  for (const player of players) {
    const prefs = getPrefs(player);

    if (prefs.workoutReminders !== false && !(await alreadyNotifiedToday(player.id, 'workout_reminder'))) {
      const workout = await db.prepare("SELECT * FROM workouts WHERE player_id = ? AND scheduled_date = ? AND status = 'scheduled' AND day_type != 'game'").get(player.id, today);
      if (workout && hour >= 8) {
        await sendPushToPlayer(player.id, {
          title: 'HoopCoach', body: `Today's workout: ${workout.title} (${workout.est_duration_min || '?'} min). Tap to check in.`, tag: 'workout_reminder',
        });
        await markNotified(player.id, 'workout_reminder');
      }
    }

    if (prefs.assessmentReminders !== false && !(await alreadyNotifiedToday(player.id, 'retest_reminder'))) {
      const testDay = await db.prepare("SELECT * FROM workouts WHERE player_id = ? AND scheduled_date = ? AND day_type = 'testing'").get(player.id, today);
      if (testDay) {
        await sendPushToPlayer(player.id, { title: 'HoopCoach', body: "Today's your retest day — let's see how much you've improved!", tag: 'retest_reminder' });
        await markNotified(player.id, 'retest_reminder');
      }
    }

    if (prefs.mealReminders !== false && hour >= 15 && !(await alreadyNotifiedToday(player.id, 'meal_reminder'))) {
      const countRow = await db.prepare("SELECT COUNT(*) c FROM nutrition_logs WHERE player_id = ? AND date(logged_at) = date('now')").get(player.id);
      if ((countRow?.c || 0) === 0) {
        await sendPushToPlayer(player.id, { title: 'HoopCoach', body: "You haven't logged any meals today — keeping your nutrition on track matters as much as training.", tag: 'meal_reminder' });
        await markNotified(player.id, 'meal_reminder');
      }
    }
  }
}
