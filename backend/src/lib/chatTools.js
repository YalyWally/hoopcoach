import db from '../db/index.js';
import { newId } from './ids.js';
import { parseWorkout, getPlayer } from './playerContext.js';
import { applyCheckin } from './adaptation.js';
import { estimateMealMacros } from './claude.js';
import { insertTarget } from '../routes/nutrition.js';
import { computeNutritionTargets } from './nutrition.js';
import { regenerateMealSlot, generateMealPlanRange } from './mealPlanGenerator.js';
import { todayISO } from './dates.js';

async function logChange(playerId, { changeType, summary, reason, before, after, source }) {
  await db.prepare(`INSERT INTO ai_change_history (id, player_id, change_type, summary, reason, before_json, after_json, source)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    newId('chg'), playerId, changeType, summary, reason || null,
    before !== undefined ? JSON.stringify(before) : null, after !== undefined ? JSON.stringify(after) : null, source || 'chat'
  );
}

export const TOOL_DEFINITIONS = [
  {
    name: 'modify_workout',
    description: "Edit an existing scheduled workout — change its title, objective, duration, difficulty, or the actual warm-up/main/cooldown content (drills or exercises). Use this whenever the player wants a specific workout changed (too easy/hard, wrong content, wrong duration, swap an exercise, etc). Always pass the FULL replacement array for any of warmup/main/cooldown you are changing, not just the diff.",
    input_schema: {
      type: 'object',
      properties: {
        workout_id: { type: 'string' },
        title: { type: 'string' },
        objective: { type: 'string' },
        est_duration_min: { type: 'number' },
        difficulty: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
        warmup: { type: 'array', items: { type: 'object' } },
        main: { type: 'array', items: { type: 'object' } },
        cooldown: { type: 'array', items: { type: 'object' } },
        status: { type: 'string', enum: ['scheduled', 'modified', 'skipped'] },
        reason: { type: 'string', description: 'Why this change is being made (shown to the player in their change history).' },
      },
      required: ['workout_id', 'reason'],
    },
  },
  {
    name: 'move_workout',
    description: "Move a scheduled workout to a different calendar date. Use for requests like 'move Tuesday's workout to Wednesday' or 'I have a game Saturday, shift my workout'.",
    input_schema: {
      type: 'object',
      properties: {
        workout_id: { type: 'string' },
        new_date: { type: 'string', description: 'YYYY-MM-DD' },
        reason: { type: 'string' },
      },
      required: ['workout_id', 'new_date', 'reason'],
    },
  },
  {
    name: 'update_goal_priorities',
    description: "Change the player's training goal priorities (e.g. 'focus more on shooting'). Provide the full ordered goal list.",
    input_schema: {
      type: 'object',
      properties: {
        goals: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, rank: { type: 'number' } }, required: ['key', 'rank'] } },
        reason: { type: 'string' },
      },
      required: ['goals', 'reason'],
    },
  },
  {
    name: 'update_equipment',
    description: "Update the player's available equipment (e.g. 'I don't have dumbbells'). Provide the FULL updated equipment list.",
    input_schema: {
      type: 'object',
      properties: {
        equipment: { type: 'array', items: { type: 'string' } },
        reason: { type: 'string' },
      },
      required: ['equipment', 'reason'],
    },
  },
  {
    name: 'log_checkin',
    description: "Record that the player is sore or injured (pre-workout check-in triggered from chat, e.g. 'I'm too sore for today' or 'I tweaked my ankle'). This will automatically modify the referenced workout if appropriate.",
    input_schema: {
      type: 'object',
      properties: {
        workout_id: { type: 'string' },
        status: { type: 'string', enum: ['sore', 'injured'] },
        location: { type: 'string' },
        severity: { type: 'number', description: '1-10' },
        worsens_with_movement: { type: 'boolean' },
      },
      required: ['workout_id', 'status'],
    },
  },
  {
    name: 'set_nutrition_target',
    description: 'Override specific daily nutrition targets (calories/macros). Only include fields being changed.',
    input_schema: {
      type: 'object',
      properties: {
        calories: { type: 'number' },
        protein_g: { type: 'number' },
        carbs_g: { type: 'number' },
        fat_g: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'log_meal',
    description: "Log something the player ate (e.g. 'I ate a different lunch today' or 'I had a burrito for dinner'). Estimates macros automatically unless manual macros are given.",
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
        manual_calories: { type: 'number' },
        manual_protein_g: { type: 'number' },
        manual_carbs_g: { type: 'number' },
        manual_fat_g: { type: 'number' },
      },
      required: ['description'],
    },
  },
  {
    name: 'rebalance_upcoming_training',
    description: "Regenerate the player's upcoming (not-yet-completed) workouts for the next N days using their current goal priorities, equipment, and schedule. Use this for larger requests like 'focus more on my vertical from now on' or 'rebuild my week' rather than editing workouts one at a time.",
    input_schema: {
      type: 'object',
      properties: {
        days_ahead: { type: 'number', description: 'How many days ahead to regenerate, default 14' },
        reason: { type: 'string' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'swap_meal',
    description: "Replace a specific planned meal with a different recipe (e.g. \"I don't like Tuesday's dinner\", \"I hate fish, don't give me that again\", \"I don't have chicken today\"). Automatically avoids the ingredient/recipe the player is moving away from and keeps macros close to target. The weekly grocery list reflects this automatically.",
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'snack', 'dinner'] },
        reason: { type: 'string' },
      },
      required: ['date', 'meal_type', 'reason'],
    },
  },
  {
    name: 'update_food_preference',
    description: "Record how much the player likes/dislikes a food, or that they can't eat it (e.g. \"I hate fish\", \"I love chicken\", \"I'm allergic to shellfish\"). This influences all future meal plan generation and swaps.",
    input_schema: {
      type: 'object',
      properties: {
        ingredient_key: { type: 'string', description: 'e.g. salmon, shrimp, peanut_butter, spinach — use the closest matching ingredient key from common whole foods' },
        level: { type: 'string', enum: ['love', 'like', 'neutral', 'dislike', 'cant_eat'] },
        reason: { type: 'string' },
      },
      required: ['ingredient_key', 'level', 'reason'],
    },
  },
  {
    name: 'regenerate_meal_plan',
    description: "Regenerate the upcoming meal plan from scratch (e.g. after several preference changes, or the player asks to 'redo my meal plan'). Use swap_meal instead for a single meal.",
    input_schema: {
      type: 'object',
      properties: {
        days_ahead: { type: 'number', description: 'default 7' },
        reason: { type: 'string' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'set_deadline_goal',
    description: "Record a specific objective + deadline the player gives (e.g. 'I have tryouts in 8 weeks').",
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        deadline_date: { type: 'string', description: 'YYYY-MM-DD, estimate from relative dates like "in 8 weeks"' },
      },
      required: ['description', 'deadline_date'],
    },
  },
];

export async function executeTool(playerId, name, input) {
  switch (name) {
    case 'modify_workout': return toolModifyWorkout(playerId, input);
    case 'move_workout': return toolMoveWorkout(playerId, input);
    case 'update_goal_priorities': return toolUpdateGoals(playerId, input);
    case 'update_equipment': return toolUpdateEquipment(playerId, input);
    case 'log_checkin': return toolLogCheckin(playerId, input);
    case 'set_nutrition_target': return toolSetNutritionTarget(playerId, input);
    case 'log_meal': return toolLogMeal(playerId, input);
    case 'rebalance_upcoming_training': return toolRebalance(playerId, input);
    case 'swap_meal': return toolSwapMeal(playerId, input);
    case 'update_food_preference': return toolUpdateFoodPreference(playerId, input);
    case 'regenerate_meal_plan': return toolRegenerateMealPlan(playerId, input);
    case 'set_deadline_goal': return toolSetDeadline(playerId, input);
    default: return { error: `Unknown tool ${name}` };
  }
}

async function toolModifyWorkout(playerId, input) {
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ? AND player_id = ?').get(input.workout_id, playerId);
  if (!row) return { error: 'Workout not found for this player.' };
  const before = parseWorkout(row);
  const sets = []; const values = [];
  const map = {
    title: 'title', objective: 'objective', est_duration_min: 'est_duration_min', difficulty: 'difficulty', status: 'status',
  };
  for (const [k, col] of Object.entries(map)) {
    if (input[k] !== undefined) { sets.push(`${col} = ?`); values.push(input[k]); }
  }
  if (input.warmup !== undefined) { sets.push('warmup_json = ?'); values.push(JSON.stringify(input.warmup)); }
  if (input.main !== undefined) { sets.push('main_json = ?'); values.push(JSON.stringify(input.main)); }
  if (input.cooldown !== undefined) { sets.push('cooldown_json = ?'); values.push(JSON.stringify(input.cooldown)); }
  if (!sets.length) return { error: 'No fields provided to change.' };
  sets.push("updated_at = datetime('now')"); sets.push('version = version + 1'); sets.push("created_by = 'ai'");
  values.push(input.workout_id);
  await db.prepare(`UPDATE workouts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  const afterRow = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(input.workout_id);
  const after = parseWorkout(afterRow);
  await logChange(playerId, {
    changeType: 'workout_modified', summary: `AI updated "${after.title}" on ${after.scheduled_date}.`,
    reason: input.reason, before, after, source: 'chat',
  });
  return { success: true, workout: after };
}

async function toolMoveWorkout(playerId, input) {
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ? AND player_id = ?').get(input.workout_id, playerId);
  if (!row) return { error: 'Workout not found for this player.' };
  const oldDate = row.scheduled_date;
  await db.prepare("UPDATE workouts SET scheduled_date = ?, updated_at = datetime('now') WHERE id = ?").run(input.new_date, input.workout_id);
  await logChange(playerId, {
    changeType: 'workout_moved', summary: `Moved "${row.title}" from ${oldDate} to ${input.new_date}.`,
    reason: input.reason, before: { date: oldDate }, after: { date: input.new_date }, source: 'chat',
  });
  const updatedRow = await db.prepare('SELECT * FROM workouts WHERE id = ?').get(input.workout_id);
  return { success: true, workout: parseWorkout(updatedRow) };
}

async function toolUpdateGoals(playerId, input) {
  const player = await getPlayer(db, playerId);
  const before = player.goals;
  await db.prepare('UPDATE players SET goals_json = ? WHERE id = ?').run(JSON.stringify(input.goals), playerId);
  await logChange(playerId, { changeType: 'goals_updated', summary: 'Updated training goal priorities.', reason: input.reason, before, after: input.goals, source: 'chat' });
  return { success: true, goals: input.goals };
}

async function toolUpdateEquipment(playerId, input) {
  const player = await getPlayer(db, playerId);
  const before = player.equipment;
  await db.prepare('UPDATE players SET equipment_json = ? WHERE id = ?').run(JSON.stringify(input.equipment), playerId);
  await logChange(playerId, { changeType: 'equipment_updated', summary: 'Updated available equipment.', reason: input.reason, before, after: input.equipment, source: 'chat' });
  return { success: true, equipment: input.equipment };
}

async function toolLogCheckin(playerId, input) {
  const row = await db.prepare('SELECT * FROM workouts WHERE id = ? AND player_id = ?').get(input.workout_id, playerId);
  if (!row) return { error: 'Workout not found for this player.' };
  const id = newId('chk');
  await db.prepare(`INSERT INTO checkins (id, player_id, workout_id, date, status, location, severity, worsens_with_movement, notes)
    VALUES (?,?,?,date('now'),?,?,?,?,?)`).run(id, playerId, row.id, input.status, input.location || null, input.severity || null, input.worsens_with_movement ? 1 : 0, null);
  const result = await applyCheckin(db, row, input);
  return {
    success: true, changed: result.changed, workout: result.workout, medicalAdvisory: result.medicalAdvisory,
    medicalMessage: result.medicalAdvisory ? "This may need a professional evaluation — please consider seeing an athletic trainer, physical therapist, or doctor. I can't diagnose injuries." : null,
  };
}

async function toolSetNutritionTarget(playerId, input) {
  const current = await db.prepare('SELECT * FROM nutrition_targets WHERE player_id = ? ORDER BY effective_date DESC, created_at DESC LIMIT 1').get(playerId);
  const merged = {
    calories: input.calories ?? current?.calories, protein_g: input.protein_g ?? current?.protein_g,
    carbs_g: input.carbs_g ?? current?.carbs_g, fat_g: input.fat_g ?? current?.fat_g,
    fiber_g: current?.fiber_g, sugar_g: current?.sugar_g, sodium_mg: current?.sodium_mg,
    sat_fat_g: current?.sat_fat_g, cholesterol_mg: current?.cholesterol_mg, calcium_mg: current?.calcium_mg,
    iron_mg: current?.iron_mg, potassium_mg: current?.potassium_mg,
  };
  await insertTarget(playerId, merged);
  await logChange(playerId, { changeType: 'nutrition_target_updated', summary: 'Updated daily nutrition targets.', reason: input.reason, before: current, after: merged, source: 'chat' });
  return { success: true, target: merged };
}

async function toolLogMeal(playerId, input) {
  const player = await getPlayer(db, playerId);
  let macros;
  if (input.manual_calories !== undefined) {
    macros = { calories: input.manual_calories, protein_g: input.manual_protein_g || 0, carbs_g: input.manual_carbs_g || 0, fat_g: input.manual_fat_g || 0 };
  } else {
    macros = await estimateMealMacros(input.description, player.dietaryRestrictions?.join(', '));
  }
  const id = newId('nlog');
  await db.prepare(`INSERT INTO nutrition_logs (id, player_id, meal_type, description, source, is_estimate, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, raw_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, playerId, input.meal_type || null, input.description, input.manual_calories !== undefined ? 'manual' : 'ai_estimate',
    input.manual_calories !== undefined ? 0 : 1, macros.calories || 0, macros.protein_g || 0, macros.carbs_g || 0, macros.fat_g || 0,
    macros.fiber_g || 0, macros.sugar_g || 0, macros.sodium_mg || 0, JSON.stringify(macros)
  );
  return { success: true, logged: { description: input.description, ...macros } };
}

async function toolRebalance(playerId, input) {
  // dynamic import to avoid circular dependency at module load time
  const { regenerateUpcoming } = await import('./planGenerator.js');
  const player = await getPlayer(db, playerId);
  const result = await regenerateUpcoming(db, player, input.days_ahead || 14);
  await logChange(playerId, {
    changeType: 'plan_rebalanced', summary: `Regenerated the next ${input.days_ahead || 14} days of training based on updated priorities.`,
    reason: input.reason, before: null, after: { workoutsRegenerated: result.count }, source: 'chat',
  });
  return { success: true, workoutsRegenerated: result.count };
}

async function toolSwapMeal(playerId, input) {
  const player = await getPlayer(db, playerId);
  const existing = await db.prepare('SELECT * FROM meal_plan_days WHERE player_id = ? AND date = ?').get(playerId, input.date);
  const before = existing ? JSON.parse(existing[`${input.meal_type}_json`] || 'null') : null;
  const snapshot = await regenerateMealSlot(db, player, input.date, input.meal_type, before?.recipeId);
  await logChange(playerId, {
    changeType: 'meal_swapped', summary: `Swapped ${input.meal_type} on ${input.date}: "${before?.name || 'unplanned'}" → "${snapshot.name}".`,
    reason: input.reason, before, after: snapshot, source: 'chat',
  });
  return { success: true, meal: snapshot };
}

async function toolUpdateFoodPreference(playerId, input) {
  const player = await getPlayer(db, playerId);
  const prefs = { ...(player.foodPrefs || {}) };
  const before = { ...prefs };
  prefs[input.ingredient_key] = input.level;
  await db.prepare('UPDATE players SET food_prefs_json = ? WHERE id = ?').run(JSON.stringify(prefs), playerId);
  await logChange(playerId, {
    changeType: 'food_preference_updated', summary: `Set ${input.ingredient_key} preference to "${input.level}".`,
    reason: input.reason, before, after: prefs, source: 'chat',
  });
  return { success: true, foodPrefs: prefs };
}

async function toolRegenerateMealPlan(playerId, input) {
  const player = await getPlayer(db, playerId);
  const days = input.days_ahead || 7;
  await generateMealPlanRange(db, player, todayISO(), days);
  await logChange(playerId, {
    changeType: 'meal_plan_regenerated', summary: `Regenerated the meal plan for the next ${days} days.`,
    reason: input.reason, before: null, after: { days }, source: 'chat',
  });
  return { success: true, days };
}

async function toolSetDeadline(playerId, input) {
  await db.prepare('UPDATE players SET deadline_goal_json = ? WHERE id = ?').run(JSON.stringify({ description: input.description, deadlineDate: input.deadline_date, setAt: new Date().toISOString() }), playerId);
  await logChange(playerId, { changeType: 'deadline_set', summary: `Set goal deadline: ${input.description} by ${input.deadline_date}.`, reason: input.description, before: null, after: input, source: 'chat' });
  return { success: true };
}
