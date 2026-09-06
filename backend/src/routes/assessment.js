import { Router } from 'express';
import db from '../db/index.js';
import { newId } from '../lib/ids.js';
import { TESTS, computeRatings, ratingLabel } from '../lib/assessmentTests.js';
import { getPlayer } from '../lib/playerContext.js';
import { generateProgram } from '../lib/planGenerator.js';
import { generateMealPlanRange } from '../lib/mealPlanGenerator.js';
import { todayISO } from '../lib/dates.js';
import { sendPushToPlayer } from '../lib/push.js';

const router = Router();

router.get('/tests', (req, res) => {
  res.json(TESTS);
});

router.get('/players/:id/assessments', async (req, res) => {
  const rawRows = await db.prepare('SELECT * FROM assessments WHERE player_id = ? ORDER BY taken_at ASC').all(req.params.id);
  const rows = rawRows.map((a) => ({ ...a, results: JSON.parse(a.results_json), ratings: JSON.parse(a.ratings_json) }));
  res.json(rows);
});

router.post('/players/:id/assessments', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const { results, type } = req.body; // results: { testId: value }
  const { ratings, ovr } = computeRatings(results || {}, player);
  const id = newId('assess');
  const countRow = await db.prepare('SELECT COUNT(*) c FROM assessments WHERE player_id = ?').get(player.id);
  const assessType = type || (countRow.c === 0 ? 'initial' : 'retest');

  await db.prepare(`INSERT INTO assessments (id, player_id, type, results_json, ratings_json, ovr) VALUES (?,?,?,?,?,?)`)
    .run(id, player.id, assessType, JSON.stringify(results || {}), JSON.stringify(ratings), ovr);

  let blocksGenerated = false;
  const existingBlocksRow = await db.prepare('SELECT COUNT(*) c FROM training_blocks WHERE player_id = ?').get(player.id);
  if (assessType === 'initial' && existingBlocksRow.c === 0) {
    await generateProgram(db, player);
    await generateMealPlanRange(db, player, todayISO(), 14);
    blocksGenerated = true;
  }
  await db.prepare('UPDATE players SET onboarding_complete = 1 WHERE id = ?').run(player.id);
  await awardBadges(player.id, ratings);

  const previous = await db.prepare('SELECT * FROM assessments WHERE player_id = ? AND id != ? ORDER BY taken_at DESC LIMIT 1').get(player.id, id);
  const comparison = previous ? diffRatings(JSON.parse(previous.ratings_json), previous.ovr, ratings, ovr) : null;

  res.json({ id, type: assessType, ratings, ovr, blocksGenerated, comparison });
});

const BADGE_RULES = [
  { key: 'sharpshooter', label: 'Sharpshooter', emoji: '🏹', category: 'shooting', threshold: 85 },
  { key: 'speed_demon', label: 'Speed Demon', emoji: '⚡', category: 'speed', threshold: 85 },
  { key: 'high_flyer', label: 'High Flyer', emoji: '🚀', category: 'vertical', threshold: 85 },
  { key: 'handle_master', label: 'Handle Master', emoji: '🎮', category: 'ball_handling', threshold: 85 },
  { key: 'lockdown', label: 'Lockdown', emoji: '🔒', category: 'defense', threshold: 85 },
];

async function awardBadges(playerId, ratings) {
  for (const rule of BADGE_RULES) {
    if ((ratings[rule.category] || 0) >= rule.threshold) {
      const existing = await db.prepare('SELECT id FROM badges WHERE player_id = ? AND badge_key = ?').get(playerId, rule.key);
      if (!existing) {
        await db.prepare('INSERT INTO badges (id, player_id, badge_key, label, emoji) VALUES (?,?,?,?,?)').run(newId('badge'), playerId, rule.key, rule.label, rule.emoji);
        const playerRow = await db.prepare('SELECT notification_prefs_json FROM players WHERE id = ?').get(playerId);
        const prefs = JSON.parse(playerRow?.notification_prefs_json || '{}');
        if (prefs.milestones !== false) {
          sendPushToPlayer(playerId, { title: 'HoopCoach', body: `🎉 New badge unlocked: ${rule.emoji} ${rule.label}!`, tag: 'badge' }).catch(() => {});
        }
      }
    }
  }
}

router.get('/players/:id/badges', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM badges WHERE player_id = ? ORDER BY earned_at DESC').all(req.params.id));
});

function diffRatings(prevRatings, prevOvr, ratings, ovr) {
  const deltas = {};
  for (const k of Object.keys(ratings)) {
    deltas[k] = ratings[k] - (prevRatings[k] ?? ratings[k]);
  }
  return { ovrDelta: ovr - prevOvr, deltas };
}

router.get('/players/:id/ratings/latest', async (req, res) => {
  const row = await db.prepare('SELECT * FROM assessments WHERE player_id = ? ORDER BY taken_at DESC LIMIT 1').get(req.params.id);
  if (!row) return res.json(null);
  res.json({ ...row, results: JSON.parse(row.results_json), ratings: JSON.parse(row.ratings_json) });
});

router.get('/labels', (req, res) => {
  const cats = ['shooting', 'ball_handling', 'finishing', 'passing', 'defense', 'speed', 'strength', 'vertical', 'explosiveness', 'conditioning'];
  res.json(Object.fromEntries(cats.map((c) => [c, ratingLabel(c)])));
});

export default router;
