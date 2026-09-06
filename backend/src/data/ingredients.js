// Base ingredient nutrition table, values per 100g (cooked/edible weight unless noted).
// Approximate, USDA-ballpark figures — good enough for realistic meal planning,
// not a clinical nutrition database.
// tags: dietary flags used to filter recipes; category: grocery-list bucket;
// unit: { grams, label } gives a friendlier grocery-list quantity for count-based foods.

export const INGREDIENTS = {
  chicken_breast: { label: 'Chicken Breast', category: 'protein', tags: ['gluten_free', 'dairy_free'], per100: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74, sat_fat_g: 1, cholesterol_mg: 85, calcium_mg: 15, iron_mg: 1, potassium_mg: 256 } },
  salmon: { label: 'Salmon', category: 'protein', tags: ['gluten_free', 'dairy_free'], per100: { calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, fiber_g: 0, sugar_g: 0, sodium_mg: 59, sat_fat_g: 3.1, cholesterol_mg: 63, calcium_mg: 9, iron_mg: 0.8, potassium_mg: 384 } },
  lean_beef: { label: 'Lean Ground Beef (93/7)', category: 'protein', tags: ['gluten_free', 'dairy_free'], per100: { calories: 217, protein_g: 26, carbs_g: 0, fat_g: 12, fiber_g: 0, sugar_g: 0, sodium_mg: 75, sat_fat_g: 4.8, cholesterol_mg: 90, calcium_mg: 16, iron_mg: 2.6, potassium_mg: 318 } },
  ground_turkey: { label: 'Ground Turkey (93/7)', category: 'protein', tags: ['gluten_free', 'dairy_free'], per100: { calories: 189, protein_g: 27, carbs_g: 0, fat_g: 8, fiber_g: 0, sugar_g: 0, sodium_mg: 88, sat_fat_g: 2.2, cholesterol_mg: 100, calcium_mg: 21, iron_mg: 1.9, potassium_mg: 305 } },
  shrimp: { label: 'Shrimp', category: 'protein', tags: ['gluten_free', 'dairy_free'], per100: { calories: 99, protein_g: 24, carbs_g: 0.2, fat_g: 0.3, fiber_g: 0, sugar_g: 0, sodium_mg: 111, sat_fat_g: 0.1, cholesterol_mg: 189, calcium_mg: 70, iron_mg: 0.5, potassium_mg: 259 } },
  tofu: { label: 'Firm Tofu', category: 'protein', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 76, protein_g: 8, carbs_g: 1.9, fat_g: 4.8, fiber_g: 0.3, sugar_g: 0.5, sodium_mg: 7, sat_fat_g: 0.7, cholesterol_mg: 0, calcium_mg: 350, iron_mg: 5.4, potassium_mg: 121 } },
  eggs: { label: 'Eggs', category: 'protein', tags: ['vegetarian', 'gluten_free'], unit: { grams: 50, label: 'egg' }, per100: { calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, fiber_g: 0, sugar_g: 1.1, sodium_mg: 124, sat_fat_g: 3.3, cholesterol_mg: 373, calcium_mg: 56, iron_mg: 1.8, potassium_mg: 138 } },
  greek_yogurt: { label: 'Plain Greek Yogurt (nonfat)', category: 'dairy', tags: ['vegetarian', 'gluten_free'], per100: { calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4, fiber_g: 0, sugar_g: 3.2, sodium_mg: 36, sat_fat_g: 0.1, cholesterol_mg: 5, calcium_mg: 110, iron_mg: 0.1, potassium_mg: 141 } },
  cottage_cheese: { label: 'Low-Fat Cottage Cheese', category: 'dairy', tags: ['vegetarian', 'gluten_free'], per100: { calories: 72, protein_g: 12, carbs_g: 3, fat_g: 1, fiber_g: 0, sugar_g: 3, sodium_mg: 330, sat_fat_g: 0.6, cholesterol_mg: 7, calcium_mg: 83, iron_mg: 0.1, potassium_mg: 104 } },
  protein_powder: { label: 'Whey Protein Powder', category: 'pantry', tags: ['vegetarian', 'gluten_free'], unit: { grams: 30, label: 'scoop' }, per100: { calories: 380, protein_g: 80, carbs_g: 8, fat_g: 4, fiber_g: 2, sugar_g: 4, sodium_mg: 200, sat_fat_g: 2, cholesterol_mg: 60, calcium_mg: 400, iron_mg: 1, potassium_mg: 300 } },
  brown_rice: { label: 'Brown Rice (cooked)', category: 'grains', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 123, protein_g: 2.7, carbs_g: 26, fat_g: 1, fiber_g: 1.8, sugar_g: 0.4, sodium_mg: 4, sat_fat_g: 0.2, cholesterol_mg: 0, calcium_mg: 10, iron_mg: 0.6, potassium_mg: 86 } },
  white_rice: { label: 'White Rice (cooked)', category: 'grains', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, sugar_g: 0.1, sodium_mg: 1, sat_fat_g: 0.1, cholesterol_mg: 0, calcium_mg: 10, iron_mg: 0.2, potassium_mg: 35 } },
  quinoa: { label: 'Quinoa (cooked)', category: 'grains', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 120, protein_g: 4.4, carbs_g: 21, fat_g: 1.9, fiber_g: 2.8, sugar_g: 0.9, sodium_mg: 7, sat_fat_g: 0.2, cholesterol_mg: 0, calcium_mg: 17, iron_mg: 1.5, potassium_mg: 172 } },
  sweet_potato: { label: 'Sweet Potato (baked)', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 90, protein_g: 2, carbs_g: 21, fat_g: 0.1, fiber_g: 3.3, sugar_g: 6.5, sodium_mg: 36, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 38, iron_mg: 0.7, potassium_mg: 475 } },
  whole_wheat_pasta: { label: 'Whole Wheat Pasta (cooked)', category: 'grains', tags: ['vegetarian', 'vegan', 'dairy_free'], per100: { calories: 124, protein_g: 5.3, carbs_g: 27, fat_g: 1.1, fiber_g: 3.9, sugar_g: 0.8, sodium_mg: 4, sat_fat_g: 0.2, cholesterol_mg: 0, calcium_mg: 13, iron_mg: 1.1, potassium_mg: 62 } },
  oats: { label: 'Rolled Oats (dry)', category: 'grains', tags: ['vegetarian', 'vegan', 'dairy_free'], per100: { calories: 389, protein_g: 16.9, carbs_g: 66, fat_g: 6.9, fiber_g: 10.6, sugar_g: 1, sodium_mg: 2, sat_fat_g: 1.2, cholesterol_mg: 0, calcium_mg: 54, iron_mg: 4.7, potassium_mg: 429 } },
  whole_wheat_bread: { label: 'Whole Wheat Bread', category: 'grains', tags: ['vegetarian', 'vegan', 'dairy_free'], unit: { grams: 32, label: 'slice' }, per100: { calories: 247, protein_g: 13, carbs_g: 41, fat_g: 3.4, fiber_g: 7, sugar_g: 6, sodium_mg: 400, sat_fat_g: 0.7, cholesterol_mg: 0, calcium_mg: 107, iron_mg: 2.5, potassium_mg: 248 } },
  tortilla: { label: 'Whole Wheat Tortilla', category: 'grains', tags: ['vegetarian', 'vegan', 'dairy_free'], unit: { grams: 45, label: 'tortilla' }, per100: { calories: 250, protein_g: 7, carbs_g: 43, fat_g: 6, fiber_g: 5, sugar_g: 2, sodium_mg: 480, sat_fat_g: 1.5, cholesterol_mg: 0, calcium_mg: 90, iron_mg: 2, potassium_mg: 140 } },
  black_beans: { label: 'Black Beans (cooked)', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 132, protein_g: 8.9, carbs_g: 24, fat_g: 0.5, fiber_g: 8.7, sugar_g: 0.3, sodium_mg: 2, sat_fat_g: 0.1, cholesterol_mg: 0, calcium_mg: 27, iron_mg: 2.1, potassium_mg: 355 } },
  lentils: { label: 'Lentils (cooked)', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 116, protein_g: 9, carbs_g: 20, fat_g: 0.4, fiber_g: 7.9, sugar_g: 1.8, sodium_mg: 2, sat_fat_g: 0.1, cholesterol_mg: 0, calcium_mg: 19, iron_mg: 3.3, potassium_mg: 369 } },
  broccoli: { label: 'Broccoli', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 35, protein_g: 2.4, carbs_g: 7, fat_g: 0.4, fiber_g: 3.3, sugar_g: 1.7, sodium_mg: 33, sat_fat_g: 0.1, cholesterol_mg: 0, calcium_mg: 47, iron_mg: 0.7, potassium_mg: 316 } },
  spinach: { label: 'Spinach', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, fiber_g: 2.2, sugar_g: 0.4, sodium_mg: 79, sat_fat_g: 0.1, cholesterol_mg: 0, calcium_mg: 99, iron_mg: 2.7, potassium_mg: 558 } },
  bell_pepper: { label: 'Bell Pepper', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 31, protein_g: 1, carbs_g: 6, fat_g: 0.3, fiber_g: 2.1, sugar_g: 4.2, sodium_mg: 4, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 7, iron_mg: 0.4, potassium_mg: 211 } },
  zucchini: { label: 'Zucchini', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 17, protein_g: 1.2, carbs_g: 3.1, fat_g: 0.3, fiber_g: 1, sugar_g: 2.5, sodium_mg: 8, sat_fat_g: 0.1, cholesterol_mg: 0, calcium_mg: 16, iron_mg: 0.4, potassium_mg: 261 } },
  asparagus: { label: 'Asparagus', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 20, protein_g: 2.2, carbs_g: 3.9, fat_g: 0.1, fiber_g: 2.1, sugar_g: 1.9, sodium_mg: 2, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 24, iron_mg: 2.1, potassium_mg: 202 } },
  mixed_greens: { label: 'Mixed Salad Greens', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 15, protein_g: 1.4, carbs_g: 2.9, fat_g: 0.2, fiber_g: 1.3, sugar_g: 0.8, sodium_mg: 28, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 36, iron_mg: 0.9, potassium_mg: 194 } },
  tomato: { label: 'Tomato', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, fiber_g: 1.2, sugar_g: 2.6, sodium_mg: 5, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 10, iron_mg: 0.3, potassium_mg: 237 } },
  cucumber: { label: 'Cucumber', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1, fiber_g: 0.5, sugar_g: 1.7, sodium_mg: 2, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 16, iron_mg: 0.3, potassium_mg: 147 } },
  banana: { label: 'Banana', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], unit: { grams: 118, label: 'banana' }, per100: { calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, fiber_g: 2.6, sugar_g: 12, sodium_mg: 1, sat_fat_g: 0.1, cholesterol_mg: 0, calcium_mg: 5, iron_mg: 0.3, potassium_mg: 358 } },
  apple: { label: 'Apple', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], unit: { grams: 182, label: 'apple' }, per100: { calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, fiber_g: 2.4, sugar_g: 10, sodium_mg: 1, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 6, iron_mg: 0.1, potassium_mg: 107 } },
  mixed_berries: { label: 'Mixed Berries', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 57, protein_g: 0.7, carbs_g: 14, fat_g: 0.3, fiber_g: 2.4, sugar_g: 10, sodium_mg: 1, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 15, iron_mg: 0.5, potassium_mg: 118 } },
  avocado: { label: 'Avocado', category: 'produce', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], unit: { grams: 150, label: 'avocado' }, per100: { calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15, fiber_g: 7, sugar_g: 0.7, sodium_mg: 7, sat_fat_g: 2.1, cholesterol_mg: 0, calcium_mg: 12, iron_mg: 0.6, potassium_mg: 485 } },
  almonds: { label: 'Almonds', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'contains_nuts'], per100: { calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50, fiber_g: 12.5, sugar_g: 4.4, sodium_mg: 1, sat_fat_g: 3.8, cholesterol_mg: 0, calcium_mg: 269, iron_mg: 3.7, potassium_mg: 733 } },
  peanut_butter: { label: 'Peanut Butter', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'contains_nuts'], per100: { calories: 588, protein_g: 25, carbs_g: 20, fat_g: 50, fiber_g: 6, sugar_g: 9, sodium_mg: 17, sat_fat_g: 10, cholesterol_mg: 0, calcium_mg: 43, iron_mg: 1.9, potassium_mg: 649 } },
  chia_seeds: { label: 'Chia Seeds', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 486, protein_g: 17, carbs_g: 42, fat_g: 31, fiber_g: 34, sugar_g: 0, sodium_mg: 16, sat_fat_g: 3.3, cholesterol_mg: 0, calcium_mg: 631, iron_mg: 7.7, potassium_mg: 407 } },
  granola: { label: 'Granola', category: 'pantry', tags: ['vegetarian', 'dairy_free'], per100: { calories: 471, protein_g: 10, carbs_g: 64, fat_g: 20, fiber_g: 7, sugar_g: 24, sodium_mg: 213, sat_fat_g: 3, cholesterol_mg: 0, calcium_mg: 80, iron_mg: 2.5, potassium_mg: 300 } },
  honey: { label: 'Honey', category: 'pantry', tags: ['vegetarian', 'gluten_free', 'dairy_free'], per100: { calories: 304, protein_g: 0.3, carbs_g: 82, fat_g: 0, fiber_g: 0.2, sugar_g: 82, sodium_mg: 4, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 6, iron_mg: 0.4, potassium_mg: 52 } },
  olive_oil: { label: 'Olive Oil', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100, fiber_g: 0, sugar_g: 0, sodium_mg: 2, sat_fat_g: 13.8, cholesterol_mg: 0, calcium_mg: 1, iron_mg: 0.6, potassium_mg: 1 } },
  marinara: { label: 'Marinara Sauce', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 29, protein_g: 1.2, carbs_g: 6, fat_g: 0.3, fiber_g: 1.5, sugar_g: 4, sodium_mg: 340, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 15, iron_mg: 0.6, potassium_mg: 250 } },
  hummus: { label: 'Hummus', category: 'pantry', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'], per100: { calories: 166, protein_g: 8, carbs_g: 14, fat_g: 10, fiber_g: 6, sugar_g: 0.3, sodium_mg: 379, sat_fat_g: 1.4, cholesterol_mg: 0, calcium_mg: 39, iron_mg: 1.6, potassium_mg: 173 } },
  cheddar_cheese: { label: 'Cheddar Cheese', category: 'dairy', tags: ['vegetarian', 'gluten_free'], per100: { calories: 403, protein_g: 25, carbs_g: 1.3, fat_g: 33, fiber_g: 0, sugar_g: 0.5, sodium_mg: 621, sat_fat_g: 21, cholesterol_mg: 105, calcium_mg: 721, iron_mg: 0.7, potassium_mg: 98 } },
  milk_2percent: { label: '2% Milk', category: 'dairy', tags: ['vegetarian', 'gluten_free'], per100: { calories: 50, protein_g: 3.3, carbs_g: 4.8, fat_g: 2, fiber_g: 0, sugar_g: 5.1, sodium_mg: 44, sat_fat_g: 1.2, cholesterol_mg: 8, calcium_mg: 120, iron_mg: 0, potassium_mg: 150 } },
  almond_milk: { label: 'Unsweetened Almond Milk', category: 'dairy', tags: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'contains_nuts'], per100: { calories: 15, protein_g: 0.6, carbs_g: 0.6, fat_g: 1.2, fiber_g: 0.3, sugar_g: 0, sodium_mg: 63, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 188, iron_mg: 0.3, potassium_mg: 66 } },
};

export function scaledNutrition(ingredientKey, grams) {
  const ing = INGREDIENTS[ingredientKey];
  if (!ing) return null;
  const factor = grams / 100;
  const out = {};
  for (const [k, v] of Object.entries(ing.per100)) out[k] = v * factor;
  return out;
}

export function ingredientCategory(key) {
  return INGREDIENTS[key]?.category || 'other';
}

export function friendlyQuantity(key, grams) {
  const ing = INGREDIENTS[key];
  if (!ing) return `${Math.round(grams)} g`;
  if (ing.unit) {
    const count = grams / ing.unit.grams;
    const rounded = Math.round(count * 4) / 4; // quarter precision
    return `${rounded} ${ing.unit.label}${rounded === 1 ? '' : 's'}`;
  }
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${Math.round(grams)} g`;
}
