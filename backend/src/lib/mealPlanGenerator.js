import { RECIPES, recipesForMeal } from '../data/recipes.js';
import { newId } from './ids.js';
import { addDays, dayKeyOf } from './dates.js';

const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];
const MEAL_CALORIE_SHARE = { breakfast: 0.25, lunch: 0.3, snack: 0.15, dinner: 0.3 };

const RESTRICTION_MAP = {
  'Gluten-Free': { requireTag: 'gluten_free' },
  'Dairy-Free': { requireTag: 'dairy_free' },
  'Vegetarian': { requireTag: 'vegetarian' },
  'Vegan': { requireTag: 'vegan' },
  'Nut Allergy': { excludeTag: 'contains_nuts' },
  'Shellfish Allergy': { excludeIngredient: 'shrimp' },
};

function passesRestrictions(recipe, restrictions) {
  for (const r of restrictions || []) {
    const rule = RESTRICTION_MAP[r];
    if (!rule) continue;
    if (rule.requireTag && !recipe.tags.includes(rule.requireTag)) return false;
    if (rule.excludeTag && recipe.tags.includes(rule.excludeTag)) return false;
    if (rule.excludeIngredient && recipe.ingredients.some((i) => i.key === rule.excludeIngredient)) return false;
  }
  return true;
}

function hasCantEatIngredient(recipe, foodPrefs) {
  return recipe.ingredients.some((i) => foodPrefs?.[i.key] === 'cant_eat');
}

function preferenceScore(recipe, foodPrefs) {
  if (!foodPrefs) return 0;
  let score = 0;
  for (const i of recipe.ingredients) {
    const pref = foodPrefs[i.key];
    if (pref === 'love') score += 2;
    else if (pref === 'like') score += 1;
    else if (pref === 'dislike') score -= 1.5;
  }
  return score;
}

function pickRecipe({ mealType, target, restrictions, foodPrefs, usedThisWeek }) {
  let candidates = recipesForMeal(mealType)
    .filter((r) => passesRestrictions(r, restrictions))
    .filter((r) => !hasCantEatIngredient(r, foodPrefs));
  if (!candidates.length) candidates = recipesForMeal(mealType); // fail-open rather than leaving a meal empty

  const scored = candidates.map((r) => {
    const calDiff = Math.abs(r.nutrition.calories - target);
    const calScore = -calDiff / 60; // ~1 point lost per 60 kcal off target
    const prefScore = preferenceScore(r, foodPrefs);
    const repeatPenalty = usedThisWeek.has(r.id) ? -8 : 0;
    return { recipe: r, score: calScore + prefScore + repeatPenalty };
  }).sort((a, b) => b.score - a.score);

  const topPool = scored.slice(0, Math.min(4, scored.length));
  const choice = topPool[Math.floor(Math.random() * topPool.length)] || scored[0];
  return choice.recipe;
}

function slotSnapshot(recipe) {
  return {
    recipeId: recipe.id,
    name: recipe.name,
    servings: recipe.servings,
    prepTimeMin: recipe.prepTimeMin,
    nutrition: recipe.nutrition,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

export async function generateMealPlanForDate(db, player, date, { usedThisWeek = new Set(), dayType = null } = {}) {
  const target = await db.prepare('SELECT * FROM nutrition_targets WHERE player_id = ? ORDER BY effective_date DESC, created_at DESC LIMIT 1').get(player.id);
  const dailyCalories = target?.calories || 2400;
  const highDemand = dayType === 'gym' || dayType === 'field';
  const calorieMultiplier = highDemand ? 1.05 : dayType === 'recovery' ? 0.97 : 1.0;

  const slots = {};
  for (const meal of MEAL_SLOTS) {
    const perMealTarget = dailyCalories * MEAL_CALORIE_SHARE[meal] * calorieMultiplier;
    const recipe = pickRecipe({
      mealType: meal, target: perMealTarget, restrictions: player.dietaryRestrictions, foodPrefs: player.foodPrefs, usedThisWeek,
    });
    usedThisWeek.add(recipe.id);
    slots[meal] = slotSnapshot(recipe);
  }

  await db.prepare(`INSERT INTO meal_plan_days (id, player_id, date, breakfast_json, lunch_json, snack_json, dinner_json, training_context)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(player_id, date) DO UPDATE SET breakfast_json=excluded.breakfast_json, lunch_json=excluded.lunch_json, snack_json=excluded.snack_json, dinner_json=excluded.dinner_json, training_context=excluded.training_context`)
    .run(newId('mpd'), player.id, date, JSON.stringify(slots.breakfast), JSON.stringify(slots.lunch), JSON.stringify(slots.snack), JSON.stringify(slots.dinner), dayType || null);

  return slots;
}

export async function generateMealPlanRange(db, player, startDate, days = 7) {
  const usedThisWeek = new Set();
  const results = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const workout = await db.prepare(`SELECT day_type FROM workouts WHERE player_id = ? AND scheduled_date = ? LIMIT 1`).get(player.id, date);
    if (i > 0 && i % 7 === 0) usedThisWeek.clear();
    const slots = await generateMealPlanForDate(db, player, date, { usedThisWeek, dayType: workout?.day_type });
    results.push({ date, ...slots });
  }
  return results;
}

export async function regenerateMealSlot(db, player, date, mealType, avoidRecipeId) {
  const target = await db.prepare('SELECT * FROM nutrition_targets WHERE player_id = ? ORDER BY effective_date DESC, created_at DESC LIMIT 1').get(player.id);
  const dailyCalories = target?.calories || 2400;
  const existing = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date = ?').get(player.id, date);
  const workout = await db.prepare(`SELECT day_type FROM workouts WHERE player_id = ? AND scheduled_date = ? LIMIT 1`).get(player.id, date);
  const highDemand = workout?.day_type === 'gym' || workout?.day_type === 'field';
  const perMealTarget = dailyCalories * MEAL_CALORIE_SHARE[mealType] * (highDemand ? 1.05 : 1.0);

  const usedThisWeek = new Set(avoidRecipeId ? [avoidRecipeId] : []);
  const recipe = pickRecipe({ mealType, target: perMealTarget, restrictions: player.dietaryRestrictions, foodPrefs: player.foodPrefs, usedThisWeek });
  const snapshot = slotSnapshot(recipe);

  const col = `${mealType}_json`;
  if (existing) {
    await db.prepare(`UPDATE meal_plan_days SET ${col} = ? WHERE id = ?`).run(JSON.stringify(snapshot), existing.id);
  } else {
    const base = { breakfast_json: 'null', lunch_json: 'null', snack_json: 'null', dinner_json: 'null' };
    base[col] = JSON.stringify(snapshot);
    await db.prepare(`INSERT INTO meal_plan_days (id, player_id, date, breakfast_json, lunch_json, snack_json, dinner_json, training_context) VALUES (?,?,?,?,?,?,?,?)`)
      .run(newId('mpd'), player.id, date, base.breakfast_json, base.lunch_json, base.snack_json, base.dinner_json, workout?.day_type || null);
  }
  return snapshot;
}

export function parseMealPlanDay(row) {
  if (!row) return null;
  return {
    ...row,
    breakfast: JSON.parse(row.breakfast_json || 'null'),
    lunch: JSON.parse(row.lunch_json || 'null'),
    snack: JSON.parse(row.snack_json || 'null'),
    dinner: JSON.parse(row.dinner_json || 'null'),
  };
}

export { MEAL_SLOTS };
