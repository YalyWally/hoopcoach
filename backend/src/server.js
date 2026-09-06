// Local dev / traditional-server entrypoint. Puts the shared Express app
// (src/app.js) behind an /api prefix, listens on a port, and runs the
// periodic notification sweep as an in-process timer — the things that only
// make sense for a long-running process, not a serverless function.
import 'dotenv/config';
import express from 'express';
import app from './app.js';
import { aiEnabled } from './lib/claude.js';
import { runNotificationSweep } from './lib/push.js';

const outer = express();
outer.use('/api', app);

const PORT = process.env.PORT || 4000;
outer.listen(PORT, () => {
  console.log(`HoopCoach backend listening on :${PORT} (AI coach ${aiEnabled ? 'ENABLED' : 'DISABLED — set ANTHROPIC_API_KEY to enable'})`);
});

// Periodic sweep for time-based notifications (workout/meal/retest reminders).
// Event-driven notifications (badges, streak milestones) fire inline where they happen.
// On Netlify this is instead handled by netlify/functions/notification-sweep.js,
// a scheduled function — there is no long-running process to hold a setInterval.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => { runNotificationSweep().catch((e) => console.error('notification sweep failed', e)); }, SWEEP_INTERVAL_MS);
runNotificationSweep().catch((e) => console.error('notification sweep failed', e));
