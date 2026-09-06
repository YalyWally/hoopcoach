// Scheduled function (see netlify.toml: [functions."notification-sweep"] schedule = "*/5 * * * *").
// Replaces the setInterval() used in local dev (backend/src/server.js) — Netlify
// functions have no long-running process to hold a timer, so this runs the same
// sweep on Netlify's own cron instead.
import { runNotificationSweep } from '../../src/lib/push.js';

export const handler = async () => {
  try {
    await runNotificationSweep();
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('notification sweep failed', e);
    return { statusCode: 500, body: e.message };
  }
};
