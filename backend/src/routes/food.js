import { Router } from 'express';
import { INGREDIENTS } from '../data/ingredients.js';
import { RECIPES } from '../data/recipes.js';

const router = Router();

router.get('/food/ingredients', (req, res) => {
  const list = Object.entries(INGREDIENTS).map(([key, ing]) => ({ key, label: ing.label, category: ing.category, tags: ing.tags }));
  res.json(list);
});

router.get('/food/recipes', (req, res) => {
  const { mealType } = req.query;
  const list = mealType ? RECIPES.filter((r) => r.mealTypes.includes(mealType)) : RECIPES;
  res.json(list);
});

export default router;
