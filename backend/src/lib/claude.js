import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
export const aiEnabled = !!apiKey;
export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';

export const client = aiEnabled ? new Anthropic({ apiKey }) : null;

export async function estimateMealMacros(description, dietaryContext) {
  if (!aiEnabled) {
    return {
      estimate: true,
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      fiber_g: null,
      sugar_g: null,
      sodium_mg: null,
      note: 'AI macro estimation is unavailable (no ANTHROPIC_API_KEY configured). Enter macros manually.',
      unavailable: true,
    };
  }
  const tool = {
    name: 'record_macro_estimate',
    description: 'Record an estimated nutrition breakdown for a described meal.',
    input_schema: {
      type: 'object',
      properties: {
        identified_foods: { type: 'array', items: { type: 'string' }, description: 'Foods/ingredients identified in the description' },
        calories: { type: 'number' },
        protein_g: { type: 'number' },
        carbs_g: { type: 'number' },
        fat_g: { type: 'number' },
        fiber_g: { type: 'number' },
        sugar_g: { type: 'number' },
        sodium_mg: { type: 'number' },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['calories', 'protein_g', 'carbs_g', 'fat_g'],
    },
  };
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: 'You are a sports nutrition assistant. Estimate nutrition facts for a described meal as accurately as possible using typical portion sizes when not specified. Always call the record_macro_estimate tool with your best estimate — never refuse.',
    tools: [tool],
    tool_choice: { type: 'tool', name: 'record_macro_estimate' },
    messages: [{ role: 'user', content: `Meal description: "${description}"${dietaryContext ? `\nPlayer dietary context: ${dietaryContext}` : ''}\n\nEstimate the nutrition facts.` }],
  });
  const toolUse = msg.content.find((c) => c.type === 'tool_use');
  if (!toolUse) return { estimate: true, calories: null, unavailable: true, note: 'Could not generate an estimate.' };
  return { estimate: true, unavailable: false, ...toolUse.input };
}

export async function estimateMealFromImage(base64Data, mediaType, dietaryContext) {
  if (!aiEnabled) {
    return {
      estimate: true, unavailable: true, identifiedFoods: [], calories: null, protein_g: null, carbs_g: null, fat_g: null,
      note: 'AI photo meal scanning is unavailable (no ANTHROPIC_API_KEY configured). Log this meal manually instead.',
    };
  }
  const tool = {
    name: 'record_photo_meal_estimate',
    description: 'Record the foods identified in a meal photo along with an estimated nutrition breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        identified_foods: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              estimated_portion: { type: 'string', description: 'e.g. "1 cup", "6 oz", "1 medium"' },
            },
            required: ['name'],
          },
        },
        calories: { type: 'number' },
        protein_g: { type: 'number' },
        carbs_g: { type: 'number' },
        fat_g: { type: 'number' },
        fiber_g: { type: 'number' },
        sugar_g: { type: 'number' },
        sodium_mg: { type: 'number' },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['identified_foods', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
    },
  };
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: 'You are a sports nutrition assistant analyzing a photo of a meal. Identify the foods and estimate portion sizes as accurately as possible from visual cues (plate size, common serving sizes), then estimate total nutrition facts. Always call the record_photo_meal_estimate tool with your best estimate — never refuse, and never say you cannot analyze images.',
    tools: [tool],
    tool_choice: { type: 'tool', name: 'record_photo_meal_estimate' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        { type: 'text', text: `Identify the foods in this meal photo and estimate its full nutrition facts.${dietaryContext ? ` Player dietary context: ${dietaryContext}` : ''}` },
      ],
    }],
  });
  const toolUse = msg.content.find((c) => c.type === 'tool_use');
  if (!toolUse) return { estimate: true, unavailable: true, identifiedFoods: [], note: 'Could not analyze this photo.' };
  const { identified_foods, ...macros } = toolUse.input;
  return { estimate: true, unavailable: false, identifiedFoods: identified_foods || [], ...macros };
}
