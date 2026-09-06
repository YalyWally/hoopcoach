import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../state/PlayerContext.jsx';
import { api } from '../api.js';

const TOOL_LABELS = {
  modify_workout: 'Updated a workout', move_workout: 'Moved a workout', update_goal_priorities: 'Updated goal priorities',
  update_equipment: 'Updated equipment', log_checkin: 'Logged soreness/injury', set_nutrition_target: 'Updated nutrition target',
  log_meal: 'Logged a meal', rebalance_upcoming_training: 'Rebalanced upcoming training', set_deadline_goal: 'Set a goal deadline',
  swap_meal: 'Swapped a meal', update_food_preference: 'Updated a food preference', regenerate_meal_plan: 'Regenerated the meal plan',
};

export default function Coach() {
  const { player, refresh } = usePlayer();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!player) return;
    api.getChatHistory(player.id).then(setMessages);
    fetch('/api/health').then((r) => r.json()).then((h) => setAiEnabled(h.aiEnabled));
  }, [player?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(text) {
    const msg = text ?? input;
    if (!msg.trim()) return;
    setInput('');
    setMessages((m) => [...m, { id: 'temp-' + Date.now(), role: 'user', content: msg, toolCalls: [] }]);
    setSending(true);
    try {
      const res = await api.sendChat(player.id, msg);
      setMessages((m) => [...m, { id: 'temp-a-' + Date.now(), role: 'assistant', content: res.reply, toolCalls: res.toolCalls }]);
      if (res.toolCalls?.length) await refresh();
    } catch (e) {
      setMessages((m) => [...m, { id: 'err-' + Date.now(), role: 'assistant', content: `Something went wrong: ${e.message}`, toolCalls: [] }]);
    } finally {
      setSending(false);
    }
  }

  async function fixMyPlan() {
    setFixing(true);
    setMessages((m) => [...m, { id: 'temp-fix-' + Date.now(), role: 'user', content: '🛠 Fix My Plan', toolCalls: [] }]);
    try {
      const res = await api.fixMyPlan(player.id);
      const issueText = res.issues.length ? `Found ${res.issues.length} issue(s):\n${res.issues.map((i) => `• ${i.description}`).join('\n')}\n\n${res.reply}` : res.reply;
      setMessages((m) => [...m, { id: 'temp-fixr-' + Date.now(), role: 'assistant', content: issueText, toolCalls: res.applied || [] }]);
      if (res.applied?.length) await refresh();
    } finally {
      setFixing(false);
    }
  }

  if (!player) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      <div className="row between">
        <h2 style={{ margin: 0 }}>Coach</h2>
        <button className="btn secondary" disabled={fixing} onClick={fixMyPlan}>{fixing ? <span className="spinner" /> : '🛠 Fix My Plan'}</button>
      </div>
      {!aiEnabled && (
        <div className="card" style={{ borderColor: 'var(--yellow)' }}>
          <p className="small" style={{ margin: 0 }}>⚠️ The AI coach needs an <code>ANTHROPIC_API_KEY</code> configured on the server to hold real conversations and make live edits. See the README to enable it.</p>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {!messages.length && (
          <div className="col" style={{ gap: 8 }}>
            <p className="muted small">Try asking things like:</p>
            {['This workout is too easy, make it harder', "I don't have dumbbells today", 'I have a game Saturday, adjust my week', 'Focus more on my shooting', 'I ate a burger and fries for lunch'].map((s) => (
              <button key={s} className="chip-toggle" style={{ textAlign: 'left' }} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>
            <div className="chat-bubble">{m.content}</div>
            {m.toolCalls?.length > 0 && (
              <div>
                {m.toolCalls.map((tc, i) => <span key={i} className="chat-tool-tag">✓ {TOOL_LABELS[tc.tool] || tc.tool}</span>)}
              </div>
            )}
          </div>
        ))}
        {sending && <div className="chat-msg assistant"><div className="chat-bubble"><span className="spinner" /></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <input style={{ flex: 1 }} placeholder="Ask your coach anything…" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <button className="btn" disabled={sending} onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}
