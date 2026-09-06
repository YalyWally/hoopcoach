// Personalized nutrition target calculation.
// Uses Mifflin-St Jeor for BMR, an activity multiplier informed by weekly
// training volume, and a goal-based calorie adjustment, then splits macros
// and rounds out key micronutrient targets to reasonable athlete guidelines.

function bmr({ weightLb, heightIn, age, sex }) {
  const kg = (weightLb || 150) * 0.453592;
  const cm = (heightIn || 68) * 2.54;
  const a = age || 16;
  const base = 10 * kg + 6.25 * cm - 5 * a;
  if (sex === 'female') return base - 161;
  if (sex === 'male') return base + 5;
  return base - 78; // rough midpoint if unspecified
}

function activityMultiplier(player) {
  const trainingDaysCount = player.schedule?.trainingDays?.length ?? 3;
  const base = { sedentary: 1.2, light: 1.35, moderate: 1.5, active: 1.65, very_active: 1.8 }[player.activity_level] ?? 1.5;
  const bump = Math.min(0.3, trainingDaysCount * 0.04);
  return base + bump;
}

function goalAdjustmentFactor(goals) {
  const keys = (goals || []).map((g) => g.key);
  if (keys.includes('lose_body_fat')) return 0.85;
  if (keys.includes('gain_muscle')) return 1.12;
  return 1.0;
}

export function computeNutritionTargets(player) {
  const b = bmr(player);
  const tdee = b * activityMultiplier(player);
  const goals = player.goals || [];
  const calories = Math.round((tdee * goalAdjustmentFactor(goals)) / 10) * 10;

  const weightKg = (player.weight_lb || 150) * 0.453592;
  const proteinPerKg = goals.some((g) => ['gain_muscle', 'strength', 'lose_body_fat'].includes(g.key)) ? 2.0 : 1.7;
  const protein_g = Math.round(weightKg * proteinPerKg);
  const fat_g = Math.round((calories * 0.28) / 9);
  const proteinCals = protein_g * 4;
  const fatCals = fat_g * 9;
  const carbs_g = Math.max(80, Math.round((calories - proteinCals - fatCals) / 4));

  const age = player.age || 16;
  const sex = player.sex;
  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g: age < 18 ? 30 : 34,
    sugar_g: Math.round((calories * 0.08) / 4),
    sodium_mg: 2300,
    sat_fat_g: Math.round((calories * 0.08) / 9),
    cholesterol_mg: 300,
    calcium_mg: age < 19 ? 1300 : 1000,
    iron_mg: sex === 'female' ? (age < 19 ? 15 : 18) : (age < 19 ? 11 : 8),
    potassium_mg: sex === 'female' ? 2600 : 3400,
  };
}
