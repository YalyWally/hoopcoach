import { Router } from 'express';
import db from '../db/index.js';
import { getPlayer } from '../lib/playerContext.js';
import { estimateMealFromImage } from '../lib/claude.js';

const router = Router();

router.post('/players/:id/nutrition/scan', async (req, res) => {
  const player = await getPlayer(db, req.params.id);
  if (!player) return res.status(404).json({ error: 'not found' });
  const { imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });
  const dietaryContext = player.dietaryRestrictions?.length ? `Restrictions: ${player.dietaryRestrictions.join(', ')}` : '';
  try {
    const result = await estimateMealFromImage(imageBase64, mediaType || 'image/jpeg', dietaryContext);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
