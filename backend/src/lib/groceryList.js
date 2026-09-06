import { ingredientCategory, friendlyQuantity, INGREDIENTS } from '../data/ingredients.js';
import { parseMealPlanDay } from './mealPlanGenerator.js';

const CATEGORY_ORDER = ['protein', 'produce', 'grains', 'dairy', 'pantry', 'other'];
const CATEGORY_LABEL = { protein: 'Protein', produce: 'Fruits & Vegetables', grains: 'Grains & Carbs', dairy: 'Dairy & Alternatives', pantry: 'Pantry', other: 'Other' };

export function buildGroceryList(mealPlanRows) {
  const totals = {}; // key -> grams
  for (const row of mealPlanRows) {
    const day = parseMealPlanDay(row);
    for (const slot of ['breakfast', 'lunch', 'snack', 'dinner']) {
      const meal = day[slot];
      if (!meal) continue;
      for (const ing of meal.ingredients) {
        totals[ing.key] = (totals[ing.key] || 0) + ing.grams;
      }
    }
  }
  const byCategory = {};
  for (const [key, grams] of Object.entries(totals)) {
    const cat = ingredientCategory(key);
    byCategory[cat] = byCategory[cat] || [];
    byCategory[cat].push({ key, label: INGREDIENTS[key]?.label || key, quantity: friendlyQuantity(key, grams), grams: Math.round(grams) });
  }
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => a.label.localeCompare(b.label));
  }
  return CATEGORY_ORDER.filter((c) => byCategory[c]?.length).map((c) => ({ category: c, label: CATEGORY_LABEL[c], items: byCategory[c] }));
}
