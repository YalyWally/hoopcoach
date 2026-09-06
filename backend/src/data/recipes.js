import { INGREDIENTS, scaledNutrition } from './ingredients.js';

const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten_free', 'dairy_free'];

function buildRecipe({ id, name, mealTypes, servings, prepTimeMin, ingredients, instructions }) {
  const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, sat_fat_g: 0, cholesterol_mg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0 };
  let containsNuts = false;
  const tagSets = DIETARY_TAGS.map(() => true);
  for (const item of ingredients) {
    const n = scaledNutrition(item.key, item.grams);
    if (!n) throw new Error(`Unknown ingredient ${item.key}`);
    for (const k of Object.keys(totals)) totals[k] += n[k] || 0;
    const ingTags = INGREDIENTS[item.key].tags;
    if (ingTags.includes('contains_nuts')) containsNuts = true;
    DIETARY_TAGS.forEach((t, i) => { if (!ingTags.includes(t)) tagSets[i] = false; });
  }
  const perServing = {};
  for (const k of Object.keys(totals)) perServing[k] = Math.round((totals[k] / servings) * 10) / 10;
  const tags = DIETARY_TAGS.filter((t, i) => tagSets[i]);
  if (containsNuts) tags.push('contains_nuts');
  return {
    id, name, mealTypes, servings, prepTimeMin, tags,
    ingredients: ingredients.map((i) => ({ key: i.key, label: INGREDIENTS[i.key].label, grams: i.grams })),
    instructions, nutrition: perServing,
  };
}

const recipes = [];

// ---------------- Breakfasts ----------------
const breakfastDefs = [
  { id: 'bf_oatmeal_banana_pb', name: 'Oatmeal with Banana and Peanut Butter', ingredients: [{ key: 'oats', grams: 60 }, { key: 'banana', grams: 118 }, { key: 'peanut_butter', grams: 16 }, { key: 'milk_2percent', grams: 150 }], instructions: ['Cook oats with milk over medium heat, stirring, about 5 minutes.', 'Slice the banana and stir in with the peanut butter.', 'Serve warm.'] },
  { id: 'bf_greek_yogurt_berries', name: 'Greek Yogurt Parfait with Berries and Granola', ingredients: [{ key: 'greek_yogurt', grams: 200 }, { key: 'mixed_berries', grams: 100 }, { key: 'granola', grams: 30 }, { key: 'honey', grams: 10 }], instructions: ['Layer yogurt, berries, and granola in a bowl or jar.', 'Drizzle with honey and serve.'] },
  { id: 'bf_scrambled_eggs_toast', name: 'Scrambled Eggs with Whole Wheat Toast and Avocado', ingredients: [{ key: 'eggs', grams: 150 }, { key: 'whole_wheat_bread', grams: 64 }, { key: 'avocado', grams: 75 }], instructions: ['Scramble the eggs in a nonstick pan over medium heat until just set.', 'Toast the bread and mash the avocado on top.', 'Serve eggs alongside the avocado toast.'] },
  { id: 'bf_egg_veggie_scramble', name: 'Veggie Egg Scramble', ingredients: [{ key: 'eggs', grams: 150 }, { key: 'spinach', grams: 40 }, { key: 'bell_pepper', grams: 50 }, { key: 'cheddar_cheese', grams: 20 }], instructions: ['Sauté bell pepper until soft, add spinach until wilted.', 'Add whisked eggs and scramble until set.', 'Top with shredded cheddar and serve.'] },
  { id: 'bf_protein_oats', name: 'Protein Oats with Almonds', ingredients: [{ key: 'oats', grams: 50 }, { key: 'protein_powder', grams: 30 }, { key: 'almond_milk', grams: 200 }, { key: 'almonds', grams: 15 }], instructions: ['Cook oats with almond milk until creamy.', 'Remove from heat and stir in protein powder until smooth.', 'Top with chopped almonds.'] },
  { id: 'bf_cottage_cheese_fruit', name: 'Cottage Cheese Bowl with Apple and Honey', ingredients: [{ key: 'cottage_cheese', grams: 200 }, { key: 'apple', grams: 182 }, { key: 'honey', grams: 10 }, { key: 'chia_seeds', grams: 10 }], instructions: ['Dice the apple.', 'Combine cottage cheese, apple, chia seeds, and honey in a bowl.'] },
  { id: 'bf_pb_banana_toast', name: 'Peanut Butter Banana Toast', ingredients: [{ key: 'whole_wheat_bread', grams: 64 }, { key: 'peanut_butter', grams: 32 }, { key: 'banana', grams: 118 }, { key: 'honey', grams: 8 }], instructions: ['Toast the bread.', 'Spread peanut butter and top with sliced banana.', 'Drizzle with honey.'] },
  { id: 'bf_breakfast_burrito', name: 'Breakfast Burrito', ingredients: [{ key: 'eggs', grams: 150 }, { key: 'tortilla', grams: 45 }, { key: 'black_beans', grams: 80 }, { key: 'cheddar_cheese', grams: 25 }, { key: 'bell_pepper', grams: 40 }], instructions: ['Scramble the eggs with bell pepper.', 'Warm the tortilla and fill with eggs, black beans, and cheese.', 'Roll up and serve.'] },
  { id: 'bf_smoothie_berry', name: 'Berry Protein Smoothie', ingredients: [{ key: 'greek_yogurt', grams: 150 }, { key: 'mixed_berries', grams: 150 }, { key: 'banana', grams: 59 }, { key: 'almond_milk', grams: 150 }, { key: 'protein_powder', grams: 15 }], instructions: ['Add all ingredients to a blender.', 'Blend until smooth and serve immediately.'] },
  { id: 'bf_avocado_egg_toast_2', name: 'Double Egg Avocado Toast', ingredients: [{ key: 'eggs', grams: 100 }, { key: 'whole_wheat_bread', grams: 64 }, { key: 'avocado', grams: 100 }, { key: 'tomato', grams: 50 }], instructions: ['Fry or poach the eggs.', 'Toast bread and top with mashed avocado, sliced tomato, and eggs.'] },
  { id: 'bf_chia_pudding', name: 'Overnight Chia Pudding with Berries', ingredients: [{ key: 'chia_seeds', grams: 35 }, { key: 'almond_milk', grams: 220 }, { key: 'mixed_berries', grams: 80 }, { key: 'honey', grams: 10 }], instructions: ['Stir chia seeds into almond milk and honey.', 'Refrigerate overnight until thickened.', 'Top with berries before serving.'] },
  { id: 'bf_turkey_egg_wrap', name: 'Turkey and Egg Breakfast Wrap', ingredients: [{ key: 'eggs', grams: 100 }, { key: 'ground_turkey', grams: 60 }, { key: 'tortilla', grams: 45 }, { key: 'cheddar_cheese', grams: 20 }], instructions: ['Cook the ground turkey until browned; scramble in the eggs.', 'Fill the tortilla with the mixture and cheese, then roll up.'] },
  { id: 'bf_yogurt_granola_pb', name: 'Yogurt Bowl with Granola and Peanut Butter', ingredients: [{ key: 'greek_yogurt', grams: 200 }, { key: 'granola', grams: 35 }, { key: 'peanut_butter', grams: 16 }, { key: 'banana', grams: 59 }], instructions: ['Spoon yogurt into a bowl.', 'Top with granola, sliced banana, and a drizzle of peanut butter.'] },
  { id: 'bf_egg_white_spinach', name: 'Egg and Spinach Muffin Cups', ingredients: [{ key: 'eggs', grams: 150 }, { key: 'spinach', grams: 50 }, { key: 'cheddar_cheese', grams: 20 }, { key: 'bell_pepper', grams: 30 }], instructions: ['Whisk eggs with chopped spinach, bell pepper, and cheese.', 'Pour into a greased muffin tin and bake at 350°F for 18-20 minutes.'] },
  { id: 'bf_pancakes_berries', name: 'Whole Wheat Pancakes with Berries', ingredients: [{ key: 'oats', grams: 60 }, { key: 'eggs', grams: 50 }, { key: 'milk_2percent', grams: 100 }, { key: 'mixed_berries', grams: 100 }, { key: 'honey', grams: 15 }], instructions: ['Blend oats, eggs, and milk into a batter.', 'Cook spoonfuls on a griddle until bubbles form, then flip.', 'Top with berries and honey.'] },
];
breakfastDefs.forEach((d) => recipes.push(buildRecipe({ ...d, mealTypes: ['breakfast'], servings: 1, prepTimeMin: d.id.includes('smoothie') ? 5 : 10 })));

// ---------------- Snacks ----------------
const snackDefs = [
  { id: 'sn_yogurt_berries', name: 'Greek Yogurt with Berries', ingredients: [{ key: 'greek_yogurt', grams: 170 }, { key: 'mixed_berries', grams: 80 }], prepTimeMin: 3 },
  { id: 'sn_apple_pb', name: 'Apple with Peanut Butter', ingredients: [{ key: 'apple', grams: 182 }, { key: 'peanut_butter', grams: 24 }], prepTimeMin: 3 },
  { id: 'sn_protein_shake', name: 'Protein Shake', ingredients: [{ key: 'protein_powder', grams: 30 }, { key: 'almond_milk', grams: 300 }, { key: 'banana', grams: 59 }], prepTimeMin: 3 },
  { id: 'sn_hummus_veggies', name: 'Hummus with Veggies', ingredients: [{ key: 'hummus', grams: 100 }, { key: 'bell_pepper', grams: 80 }, { key: 'cucumber', grams: 80 }], prepTimeMin: 5 },
  { id: 'sn_trail_mix', name: 'Almond & Berry Trail Mix', ingredients: [{ key: 'almonds', grams: 30 }, { key: 'mixed_berries', grams: 40 }, { key: 'granola', grams: 20 }], prepTimeMin: 2 },
  { id: 'sn_cottage_cheese_berries', name: 'Cottage Cheese with Berries', ingredients: [{ key: 'cottage_cheese', grams: 170 }, { key: 'mixed_berries', grams: 80 }], prepTimeMin: 3 },
  { id: 'sn_rice_cake_pb', name: 'Whole Wheat Toast with Almond Butter', ingredients: [{ key: 'whole_wheat_bread', grams: 32 }, { key: 'peanut_butter', grams: 20 }, { key: 'honey', grams: 6 }], prepTimeMin: 4 },
  { id: 'sn_boiled_eggs', name: 'Hard-Boiled Eggs', ingredients: [{ key: 'eggs', grams: 100 }], prepTimeMin: 12 },
  { id: 'sn_smoothie_green', name: 'Green Recovery Smoothie', ingredients: [{ key: 'spinach', grams: 40 }, { key: 'banana', grams: 118 }, { key: 'greek_yogurt', grams: 150 }, { key: 'almond_milk', grams: 150 }], prepTimeMin: 5 },
  { id: 'sn_tofu_bites', name: 'Crispy Tofu Bites', ingredients: [{ key: 'tofu', grams: 150 }, { key: 'olive_oil', grams: 8 }], prepTimeMin: 15 },
  { id: 'sn_banana_almonds', name: 'Banana with Almonds', ingredients: [{ key: 'banana', grams: 118 }, { key: 'almonds', grams: 20 }], prepTimeMin: 2 },
  { id: 'sn_avocado_toast_small', name: 'Mini Avocado Toast', ingredients: [{ key: 'whole_wheat_bread', grams: 32 }, { key: 'avocado', grams: 75 }, { key: 'tomato', grams: 40 }], prepTimeMin: 5 },
  { id: 'sn_edamame', name: 'Black Bean and Corn Snack Bowl', ingredients: [{ key: 'black_beans', grams: 120 }, { key: 'tomato', grams: 50 }, { key: 'olive_oil', grams: 5 }], prepTimeMin: 5 },
  { id: 'sn_protein_bar_diy', name: 'DIY Protein Bites', ingredients: [{ key: 'oats', grams: 40 }, { key: 'peanut_butter', grams: 30 }, { key: 'honey', grams: 15 }, { key: 'protein_powder', grams: 20 }], prepTimeMin: 10 },
  { id: 'sn_string_cheese_apple', name: 'Cheddar with Apple Slices', ingredients: [{ key: 'cheddar_cheese', grams: 40 }, { key: 'apple', grams: 182 }], prepTimeMin: 3 },
  { id: 'sn_veggie_hummus_wrap', name: 'Veggie Hummus Wrap', ingredients: [{ key: 'tortilla', grams: 45 }, { key: 'hummus', grams: 40 }, { key: 'spinach', grams: 30 }, { key: 'bell_pepper', grams: 40 }], prepTimeMin: 6 },
];
snackDefs.forEach((d) => recipes.push(buildRecipe({ ...d, mealTypes: ['snack'], servings: 1 })));

// ---------------- Lunch / Dinner mains ----------------
// Curated (protein, carb, veg) combinations across several prep styles for variety.
const mains = [
  { style: 'grilled', protein: 'chicken_breast', carb: 'brown_rice', veg: 'broccoli' },
  { style: 'grilled', protein: 'chicken_breast', carb: 'sweet_potato', veg: 'asparagus' },
  { style: 'grilled', protein: 'salmon', carb: 'quinoa', veg: 'spinach' },
  { style: 'grilled', protein: 'salmon', carb: 'sweet_potato', veg: 'broccoli' },
  { style: 'grilled', protein: 'shrimp', carb: 'white_rice', veg: 'bell_pepper' },
  { style: 'grilled', protein: 'tofu', carb: 'brown_rice', veg: 'zucchini' },
  { style: 'grilled', protein: 'lean_beef', carb: 'sweet_potato', veg: 'asparagus' },
  { style: 'stir_fry', protein: 'chicken_breast', carb: 'white_rice', veg: 'bell_pepper' },
  { style: 'stir_fry', protein: 'shrimp', carb: 'brown_rice', veg: 'broccoli' },
  { style: 'stir_fry', protein: 'tofu', carb: 'white_rice', veg: 'bell_pepper' },
  { style: 'stir_fry', protein: 'lean_beef', carb: 'brown_rice', veg: 'zucchini' },
  { style: 'stir_fry', protein: 'ground_turkey', carb: 'quinoa', veg: 'broccoli' },
  { style: 'bowl', protein: 'chicken_breast', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'bowl', protein: 'black_beans', carb: 'brown_rice', veg: 'bell_pepper' },
  { style: 'bowl', protein: 'lentils', carb: 'quinoa', veg: 'spinach' },
  { style: 'bowl', protein: 'tofu', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'bowl', protein: 'shrimp', carb: 'white_rice', veg: 'zucchini' },
  { style: 'taco', protein: 'chicken_breast', carb: 'tortilla', veg: 'bell_pepper' },
  { style: 'taco', protein: 'lean_beef', carb: 'tortilla', veg: 'tomato' },
  { style: 'taco', protein: 'black_beans', carb: 'tortilla', veg: 'bell_pepper' },
  { style: 'taco', protein: 'ground_turkey', carb: 'tortilla', veg: 'tomato' },
  { style: 'pasta', protein: 'chicken_breast', carb: 'whole_wheat_pasta', veg: 'spinach' },
  { style: 'pasta', protein: 'lean_beef', carb: 'whole_wheat_pasta', veg: 'tomato' },
  { style: 'pasta', protein: 'shrimp', carb: 'whole_wheat_pasta', veg: 'zucchini' },
  { style: 'pasta', protein: 'tofu', carb: 'whole_wheat_pasta', veg: 'broccoli' },
  { style: 'salad', protein: 'chicken_breast', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'salad', protein: 'salmon', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'salad', protein: 'shrimp', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'salad', protein: 'black_beans', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'sheet_pan', protein: 'chicken_breast', carb: 'sweet_potato', veg: 'broccoli' },
  { style: 'sheet_pan', protein: 'salmon', carb: 'sweet_potato', veg: 'asparagus' },
  { style: 'sheet_pan', protein: 'shrimp', carb: 'sweet_potato', veg: 'bell_pepper' },
  { style: 'sheet_pan', protein: 'lean_beef', carb: 'sweet_potato', veg: 'zucchini' },
  { style: 'sheet_pan', protein: 'tofu', carb: 'sweet_potato', veg: 'broccoli' },
  { style: 'sheet_pan', protein: 'ground_turkey', carb: 'sweet_potato', veg: 'asparagus' },
  { style: 'grilled', protein: 'ground_turkey', carb: 'brown_rice', veg: 'zucchini' },
  { style: 'grilled', protein: 'shrimp', carb: 'quinoa', veg: 'asparagus' },
  { style: 'grilled', protein: 'lean_beef', carb: 'brown_rice', veg: 'broccoli' },
  { style: 'grilled', protein: 'tofu', carb: 'sweet_potato', veg: 'spinach' },
  { style: 'stir_fry', protein: 'chicken_breast', carb: 'quinoa', veg: 'zucchini' },
  { style: 'stir_fry', protein: 'salmon', carb: 'white_rice', veg: 'bell_pepper' },
  { style: 'stir_fry', protein: 'black_beans', carb: 'brown_rice', veg: 'bell_pepper' },
  { style: 'bowl', protein: 'ground_turkey', carb: 'brown_rice', veg: 'spinach' },
  { style: 'bowl', protein: 'salmon', carb: 'white_rice', veg: 'mixed_greens' },
  { style: 'bowl', protein: 'chicken_breast', carb: 'sweet_potato', veg: 'spinach' },
  { style: 'taco', protein: 'shrimp', carb: 'tortilla', veg: 'bell_pepper' },
  { style: 'taco', protein: 'tofu', carb: 'tortilla', veg: 'tomato' },
  { style: 'pasta', protein: 'ground_turkey', carb: 'whole_wheat_pasta', veg: 'spinach' },
  { style: 'pasta', protein: 'black_beans', carb: 'whole_wheat_pasta', veg: 'tomato' },
  { style: 'salad', protein: 'ground_turkey', carb: 'brown_rice', veg: 'mixed_greens' },
  { style: 'salad', protein: 'lentils', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'salad', protein: 'tofu', carb: 'quinoa', veg: 'mixed_greens' },
  { style: 'sheet_pan', protein: 'chicken_breast', carb: 'quinoa', veg: 'asparagus' },
];

const STYLE_META = {
  grilled: {
    label: (p, v, c) => `Grilled ${p} with ${c} and ${v}`,
    grams: { protein: 170, carb: 180, veg: 120, extra: [{ key: 'olive_oil', grams: 8 }] },
    instructions: (p, v, c) => [`Season the ${p.toLowerCase()} and grill or pan-sear until fully cooked.`, `Steam or roast the ${v.toLowerCase()} until tender.`, `Serve over the ${c.toLowerCase()} with a drizzle of olive oil.`],
  },
  stir_fry: {
    label: (p, v, c) => `${p} Stir-Fry with ${v} over ${c}`,
    grams: { protein: 160, carb: 180, veg: 130, extra: [{ key: 'olive_oil', grams: 10 }] },
    instructions: (p, v, c) => [`Heat oil in a wok or large pan over high heat.`, `Stir-fry the ${p.toLowerCase()} until cooked through, then add the ${v.toLowerCase()} for 3-4 minutes.`, `Serve over the ${c.toLowerCase()}.`],
  },
  bowl: {
    label: (p, v, c) => `${p} and ${v} Bowl with ${c}`,
    grams: { protein: 150, carb: 160, veg: 100, extra: [{ key: 'hummus', grams: 30 }] },
    instructions: (p, v, c) => [`Prepare the ${c.toLowerCase()} and the ${p.toLowerCase()}.`, `Assemble in a bowl with the ${v.toLowerCase()} and a scoop of hummus.`],
  },
  taco: {
    label: (p, v, c) => `${p} Tacos`,
    grams: { protein: 150, carb: 90, veg: 60, extra: [{ key: 'marinara', grams: 20 }] },
    instructions: (p, v, c) => [`Cook the ${p.toLowerCase()}, seasoning well.`, `Warm the tortillas.`, `Fill with the ${p.toLowerCase()}, diced ${v.toLowerCase()}, and a spoonful of sauce.`],
  },
  pasta: {
    label: (p, v, c) => `${p} Pasta with ${v}`,
    grams: { protein: 150, carb: 200, veg: 100, extra: [{ key: 'marinara', grams: 100 }] },
    instructions: (p, v, c) => [`Cook the ${c.toLowerCase()} according to package instructions.`, `Cook the ${p.toLowerCase()} and combine with the ${v.toLowerCase()} and marinara sauce.`, `Toss with the pasta and serve.`],
  },
  sheet_pan: {
    label: (p, v, c) => `Sheet Pan ${p} with ${c} and ${v}`,
    grams: { protein: 170, carb: 180, veg: 130, extra: [{ key: 'olive_oil', grams: 10 }] },
    instructions: (p, v, c) => [`Preheat oven to 425°F (220°C).`, `Toss the ${p.toLowerCase()}, diced ${c.toLowerCase()}, and ${v.toLowerCase()} with olive oil and seasoning on a sheet pan.`, `Roast 20-25 minutes, flipping halfway, until the protein is cooked through.`],
  },
  salad: {
    label: (p, v, c) => `${p} Salad with ${v}`,
    grams: { protein: 150, carb: 120, veg: 150, extra: [{ key: 'olive_oil', grams: 10 }, { key: 'tomato', grams: 60 }] },
    instructions: (p, v, c) => [`Cook the ${p.toLowerCase()} and let cool slightly.`, `Toss the ${v.toLowerCase()} with the ${c.toLowerCase()} and olive oil.`, `Top with the ${p.toLowerCase()}.`],
  },
};

mains.forEach((m, idx) => {
  const meta = STYLE_META[m.style];
  const pLabel = INGREDIENTS[m.protein].label;
  const vLabel = INGREDIENTS[m.veg].label;
  const cLabel = INGREDIENTS[m.carb].label;
  const ingredients = [
    { key: m.protein, grams: meta.grams.protein },
    { key: m.carb, grams: meta.grams.carb },
    { key: m.veg, grams: meta.grams.veg },
    ...meta.grams.extra,
  ];
  recipes.push(buildRecipe({
    id: `main_${m.style}_${m.protein}_${idx}`,
    name: meta.label(pLabel, vLabel, cLabel),
    mealTypes: ['lunch', 'dinner'],
    servings: 1,
    prepTimeMin: m.style === 'taco' ? 20 : m.style === 'pasta' ? 25 : 20,
    ingredients,
    instructions: meta.instructions(pLabel, vLabel, cLabel),
  }));
});

export const RECIPES = recipes;

export function getRecipe(id) {
  return RECIPES.find((r) => r.id === id);
}

export function recipesForMeal(mealType) {
  return RECIPES.filter((r) => r.mealTypes.includes(mealType));
}
