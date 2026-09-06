import { Router } from 'express';
import db from '../db/index.js';
import { newId } from '../lib/ids.js';
import { getFullContext } from '../lib/playerContext.js';
import { client, aiEnabled, MODEL } from '../lib/claude.js';
import { TOOL_DEFINITIONS, executeTool } from '../lib/chatTools.js';
import { scanPlan } from '../lib/fixMyPlan.js';
import { ratingLabel } from '../lib/assessmentTests.js';

const router = Router();

function buildSystemPrompt(ctx) {
  const { player, latestAssessment, previousAssessment, upcomingWorkouts, recentLogs, recentCheckins, nutritionTarget, todayTotals, changeHistory, upcomingExternalEvents, todayMealPlan } = ctx;
  const ratingsLines = latestAssessment
    ? Object.entries(latestAssessment.ratings).map(([k, v]) => {
      const prev = previousAssessment?.ratings?.[k];
      const delta = prev !== undefined ? ` (was ${prev})` : '';
      return `  ${ratingLabel(k)}: ${v}${delta}`;
    }).join('\n')
    : '  No assessment completed yet.';

  const workoutLines = upcomingWorkouts.slice(0, 10).map((w) =>
    `  [${w.id}] ${w.scheduled_date} — ${w.day_type.toUpperCase()} — "${w.title}" (${w.est_duration_min ?? '?'} min, status: ${w.status})`
  ).join('\n') || '  None scheduled yet.';

  const logLines = recentLogs.slice(0, 5).map((l) =>
    `  ${l.scheduled_date} ${l.day_type}: difficulty ${l.difficulty_rating ?? '?'}/10, energy ${l.energy_level ?? '?'}/10, soreness ${l.soreness_level ?? '?'}/10${l.pain_flag ? ', PAIN REPORTED' : ''}`
  ).join('\n') || '  None yet.';

  const checkinLines = recentCheckins.slice(0, 3).map((c) => `  ${c.date}: ${c.status}${c.location ? ` (${c.location})` : ''}${c.severity ? `, severity ${c.severity}/10` : ''}`).join('\n') || '  None recently.';

  const changeLines = changeHistory.slice(0, 5).map((c) => `  ${c.changed_at}: ${c.summary}`).join('\n') || '  None yet.';

  const externalLines = (upcomingExternalEvents || []).slice(0, 8).map((e) => `  ${e.start_date}: ${e.title} (from imported calendar)`).join('\n') || '  None imported.';

  return `You are the AI performance coach inside HoopCoach, a personalized basketball training, fitness, and nutrition app. You are managing a real player's program — not just answering questions.

PLAYER PROFILE
  Name: ${player.name}, Age: ${player.age ?? '?'}, Position: ${player.position ?? '?'}, Experience: ${player.experience_level ?? '?'}
  Goals (priority order): ${player.goals.sort((a, b) => a.rank - b.rank).map((g) => `${g.key} (#${g.rank})`).join(', ') || 'none set'}
  Schedule: training days ${JSON.stringify(player.schedule?.trainingDays || [])}, typical session ${player.schedule?.typicalDurationMin || '?'} min, game days ${JSON.stringify(player.schedule?.gameDays || [])}, practice days ${JSON.stringify(player.schedule?.practiceDays || [])}
  Equipment available: ${player.equipment.join(', ') || 'none listed'}
  Deadline goal: ${player.deadlineGoal ? `${player.deadlineGoal.description} by ${player.deadlineGoal.deadlineDate}` : 'none set'}

CURRENT RATINGS (Overall: ${latestAssessment?.ovr ?? '?'} OVR)
${ratingsLines}

UPCOMING WORKOUTS (reference by the [id] shown when calling tools)
${workoutLines}

RECENT WORKOUT FEEDBACK
${logLines}

RECENT SORENESS/INJURY CHECK-INS
${checkinLines}

NUTRITION
  Daily target: ${nutritionTarget ? `${nutritionTarget.calories} kcal, ${nutritionTarget.protein_g}p/${nutritionTarget.carbs_g}c/${nutritionTarget.fat_g}f` : 'not set'}
  Logged today so far: ${Math.round(todayTotals.calories)} kcal, ${Math.round(todayTotals.protein_g)}p/${Math.round(todayTotals.carbs_g)}c/${Math.round(todayTotals.fat_g)}f
  Today's meal plan: ${todayMealPlan ? ['breakfast', 'lunch', 'snack', 'dinner'].map((m) => `${m}: ${todayMealPlan[m]?.name || '—'}`).join(', ') : 'not generated yet'}
  Food preferences on file: ${player.foodPrefs && Object.keys(player.foodPrefs).length ? Object.entries(player.foodPrefs).map(([k, v]) => `${k}:${v}`).join(', ') : 'none set'}
  Dietary restrictions: ${player.dietaryRestrictions?.join(', ') || 'none'}

RECENT AI/PLAN CHANGES
${changeLines}

UPCOMING EXTERNAL CALENDAR EVENTS (imported by the player, e.g. school/games not otherwise tracked)
${externalLines}

YOUR JOB
- Answer basketball, training, nutrition, and scheduling questions using this real context.
- When the player asks for something to actually change (a workout, the calendar, priorities, equipment, nutrition targets, logging food, recording soreness/injury, rebalancing the plan, or setting a deadline goal), ALWAYS use the appropriate tool to actually make the change — never just describe what you would do. You can call multiple tools in sequence if needed.
- If the player points out a mistake (e.g. a scheduling conflict, wrong equipment, wrong difficulty), acknowledge it, identify what was wrong, and use tools to actually fix it — including checking whether it affects other upcoming workouts.
- CORE SAFETY PRINCIPLE: never blindly follow a request that conflicts with safety, recovery, or sound training structure (e.g. removing all rest days, doing daily maximal lifts, training hard through significant pain, or ignoring an injury flag). Instead: identify the conflict, briefly explain it, and propose/apply the closest safe alternative.
- Never diagnose injuries or medical conditions. If something sounds like it may need professional evaluation, say so plainly.
- Keep replies conversational and concise — a sentence or two of explanation is usually enough after making a change. You are a coach, not a form.`;
}

async function runChatTurn(playerId, userText) {
  const ctx = await getFullContext(db, playerId);
  if (!ctx) throw new Error('player not found');

  await db.prepare(`INSERT INTO chat_messages (id, player_id, role, content) VALUES (?,?,?,?)`).run(newId('msg'), playerId, 'user', userText);

  if (!aiEnabled) {
    const reply = "I'd love to help with that, but the AI coach isn't fully connected yet — this app needs an ANTHROPIC_API_KEY configured on the server to power real conversations and plan edits. Once that's set, I'll be able to understand requests like this and actually update your plan.";
    await db.prepare(`INSERT INTO chat_messages (id, player_id, role, content) VALUES (?,?,?,?)`).run(newId('msg'), playerId, 'assistant', reply);
    return { reply, toolCalls: [], medicalAdvisory: false };
  }

  const historyRows = await db.prepare('SELECT role, content FROM chat_messages WHERE player_id = ? ORDER BY created_at DESC LIMIT 16').all(playerId);
  const history = historyRows.reverse();
  const messages = history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: userText });

  const system = buildSystemPrompt(ctx);
  const executedSummaries = [];
  let medicalAdvisory = false;
  let finalText = '';

  for (let iter = 0; iter < 5; iter++) {
    const response = await client.messages.create({
      model: MODEL, max_tokens: 1500, system, tools: TOOL_DEFINITIONS, messages,
    });

    const toolUses = response.content.filter((c) => c.type === 'tool_use');
    const textBlocks = response.content.filter((c) => c.type === 'text').map((c) => c.text);
    finalText = textBlocks.join('\n').trim() || finalText;

    if (!toolUses.length) break;

    messages.push({ role: 'assistant', content: response.content });
    const toolResults = [];
    for (const tu of toolUses) {
      let result;
      try {
        result = await executeTool(playerId, tu.name, tu.input);
      } catch (e) {
        result = { error: e.message };
      }
      if (result?.medicalAdvisory) medicalAdvisory = true;
      executedSummaries.push({ tool: tu.name, input: tu.input, result });
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result).slice(0, 4000) });
    }
    messages.push({ role: 'user', content: toolResults });

    if (iter === 4) {
      // force a final summarizing call without tools if we hit the loop cap
      const wrapUp = await client.messages.create({ model: MODEL, max_tokens: 600, system, messages });
      finalText = wrapUp.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    }
  }

  await db.prepare(`INSERT INTO chat_messages (id, player_id, role, content, tool_calls_json) VALUES (?,?,?,?,?)`)
    .run(newId('msg'), playerId, 'assistant', finalText || "Done.", JSON.stringify(executedSummaries));

  return { reply: finalText || 'Done.', toolCalls: executedSummaries, medicalAdvisory };
}

router.get('/players/:id/chat/history', async (req, res) => {
  const rawRows = await db.prepare('SELECT * FROM chat_messages WHERE player_id = ? ORDER BY created_at ASC').all(req.params.id);
  const rows = rawRows.map((m) => ({ ...m, toolCalls: JSON.parse(m.tool_calls_json || '[]') }));
  res.json(rows);
});

router.post('/players/:id/chat', async (req, res) => {
  try {
    const result = await runChatTurn(req.params.id, req.body.message);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/players/:id/fix-my-plan', async (req, res) => {
  const issues = await scanPlan(db, req.params.id);
  if (!issues.length) {
    return res.json({ issues: [], applied: [], reply: 'I scanned your next two weeks and everything looks well-sequenced — no conflicts, no missing recovery, good variety. Keep it up!' });
  }
  if (!aiEnabled) {
    return res.json({
      issues, applied: [],
      reply: `I found ${issues.length} issue(s) in your upcoming plan. Auto-fixing needs the AI coach connected (ANTHROPIC_API_KEY) — for now, here's what I found so you or a coach can adjust manually.`,
    });
  }
  const summary = issues.map((i, idx) => `${idx + 1}. [${i.type}] ${i.description} Suggested fix: ${i.suggestedFix} (workout ids: ${i.workoutIds.join(', ')})`).join('\n');
  const prompt = `Run "Fix My Plan". I scanned the upcoming schedule and found these issues:\n${summary}\n\nPlease fix as many of these as you reasonably can using your tools (favoring player safety and recovery), then briefly explain what you changed.`;
  try {
    const result = await runChatTurn(req.params.id, prompt);
    res.json({ issues, applied: result.toolCalls, reply: result.reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/players/:id/plan-issues', async (req, res) => {
  res.json(await scanPlan(db, req.params.id));
});

export default router;
