import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../state/PlayerContext.jsx';
import { api } from '../api.js';

const TYPE_ICON = { skills: '🏀', gym: '🏋️', field: '⚡', recovery: '😴', testing: '🧪', game: '🏆' };
const TYPE_COLOR = { skills: '#ff7a1a', gym: '#3ea6ff', field: '#fbbf24', recovery: '#34d399', testing: '#a78bfa', game: '#f87171' };
const MEAL_ICON = { breakfast: '🍳', lunch: '🥗', snack: '🍎', dinner: '🍽️' };

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function Plan() {
  const { player, ctx } = usePlayer();
  const [workouts, setWorkouts] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('calendar');

  useEffect(() => {
    if (!player || !ctx) return;
    const from = ctx.today;
    const to = addDays(ctx.today, 27);
    api.getWorkouts(player.id, from, to).then(setWorkouts);
    api.getChangeHistory(player.id).then(setHistory);
  }, [player?.id, ctx?.today]);

  if (!player || !ctx) return null;

  const weeks = [];
  let cursor = ctx.today;
  for (let w = 0; w < 4; w++) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    weeks.push(days);
    cursor = addDays(cursor, 7);
  }
  const byDate = workouts.reduce((acc, w) => { (acc[w.scheduled_date] = acc[w.scheduled_date] || []).push(w); return acc; }, {});

  return (
    <div>
      <h2>Plan</h2>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        {['calendar', 'blocks', 'mealplan', 'grocery', 'sync', 'history'].map((t) => (
          <button key={t} className={`chip-toggle ${tab === t ? 'selected' : ''}`} onClick={() => setTab(t)}>
            {{ calendar: 'Calendar', blocks: 'Training Plan', mealplan: 'Meal Plan', grocery: 'Grocery List', sync: 'Calendar Sync', history: 'History' }[t]}
          </button>
        ))}
      </div>

      {tab === 'calendar' && (
        <div>
          <div className="row wrap small muted" style={{ marginBottom: 10, gap: 12 }}>
            {Object.entries(TYPE_ICON).map(([k, icon]) => (
              <span key={k}><span style={{ color: TYPE_COLOR[k] }}>●</span> {icon} {k}</span>
            ))}
          </div>
          {weeks.map((days, wi) => (
            <div key={wi} className="calendar-grid" style={{ marginBottom: 8 }}>
              {days.map((d) => {
                const items = byDate[d] || [];
                const dayNum = new Date(d + 'T00:00:00').getDate();
                return (
                  <div key={d} className="calendar-day">
                    <div className="row between"><strong>{dayNum}</strong>{d === ctx.today && <span className="small" style={{ color: 'var(--orange)' }}>•</span>}</div>
                    {items.map((it) => (
                      <Link key={it.id} to={`/train/${it.id}`} style={{ display: 'block', textDecoration: 'none', color: TYPE_COLOR[it.day_type], marginTop: 4 }}>
                        {TYPE_ICON[it.day_type]} {it.day_type}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'blocks' && <BlocksView />}
      {tab === 'mealplan' && <MealPlanView playerId={player.id} today={ctx.today} />}
      {tab === 'grocery' && <GroceryView playerId={player.id} />}
      {tab === 'sync' && <CalendarSyncView playerId={player.id} />}

      {tab === 'history' && (
        <div className="stack-list">
          {history.length ? history.map((h) => (
            <div key={h.id} className="card">
              <div className="row between"><strong className="small">{h.change_type.replace(/_/g, ' ')}</strong><span className="small muted">{h.changed_at?.slice(0, 16)}</span></div>
              <p style={{ margin: '6px 0 0' }}>{h.summary}</p>
              {h.reason && <p className="small muted" style={{ margin: '4px 0 0' }}>Reason: {h.reason}</p>}
              <span className="pill" style={{ marginTop: 6 }}>{h.source}</span>
            </div>
          )) : <p className="muted">No AI changes yet — as your coach adapts your plan, every meaningful change will show up here.</p>}
        </div>
      )}
    </div>
  );
}

function BlocksView() {
  return (
    <div className="card">
      <h3>12-Week Program Structure</h3>
      <div className="stack-list">
        <PhaseRow label="Weeks 1–4" name="Foundation" desc="Build technique, base strength, and movement quality." />
        <PhaseRow label="Weeks 5–8" name="Development" desc="Increase intensity and complexity across skills, gym, and field work." />
        <PhaseRow label="Weeks 9–11" name="Performance" desc="Peak training intensity, game-speed emphasis." />
        <PhaseRow label="Week 12" name="Deload + Retest" desc="Reduced load, then a full retest to measure progress and build your next block." />
      </div>
    </div>
  );
}

function PhaseRow({ label, name, desc }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="row between"><strong>{name}</strong><span className="small muted">{label}</span></div>
      <p className="small muted" style={{ margin: '4px 0 0' }}>{desc}</p>
    </div>
  );
}

function MealPlanView({ playerId, today }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    setLoading(true);
    api.getMealPlan(playerId, today, addDays(today, 6)).then(setDays).finally(() => setLoading(false));
  };
  useEffect(load, [playerId, today]);

  async function regenerate() {
    setLoading(true);
    await api.generateMealPlan(playerId, 7);
    load();
  }

  async function swap(date, mealType) {
    setSwapping(`${date}_${mealType}`);
    try {
      await api.swapMeal(playerId, { date, mealType, reason: 'Player requested a different meal from the Plan tab.' });
      load();
    } finally { setSwapping(null); }
  }

  if (loading && !days.length) return <p className="muted">Building your meal plan…</p>;

  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}>
        <p className="muted small" style={{ margin: 0 }}>7-day plan, personalized to your targets, dietary restrictions, and food preferences.</p>
        <button className="btn ghost small" onClick={regenerate}>↻ Regenerate Week</button>
      </div>
      <div className="stack-list">
        {days.map((day) => (
          <div key={day.date} className="card">
            <div className="row between">
              <strong>{new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
              {day.training_context && <span className={`pill ${day.training_context}`}>{TYPE_ICON[day.training_context]} {day.training_context}</span>}
            </div>
            <div className="stack-list" style={{ marginTop: 10 }}>
              {['breakfast', 'lunch', 'snack', 'dinner'].map((meal) => {
                const item = day[meal];
                const key = `${day.date}_${meal}`;
                return (
                  <div key={meal} style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <div className="row between">
                      <div>
                        <span className="small muted">{MEAL_ICON[meal]} {meal}</span>
                        <div style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === key ? null : key)}>
                          {item?.name || '—'} {item && <span className="small faint">({Math.round(item.nutrition.calories)} kcal)</span>}
                        </div>
                      </div>
                      <button className="btn ghost small" disabled={swapping === key} onClick={() => swap(day.date, meal)}>
                        {swapping === key ? <span className="spinner" /> : 'Swap'}
                      </button>
                    </div>
                    {expanded === key && item && (
                      <div className="small muted" style={{ marginTop: 6, background: 'var(--bg-elevated)', padding: 10, borderRadius: 8 }}>
                        <div>Serves {item.servings} · {item.prepTimeMin} min prep</div>
                        <div style={{ marginTop: 6 }}><strong>Ingredients:</strong> {item.ingredients.map((i) => `${i.label} (${Math.round(i.grams)}g)`).join(', ')}</div>
                        <div style={{ marginTop: 6 }}><strong>Instructions:</strong>
                          <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>{item.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
                        </div>
                        <div style={{ marginTop: 6 }}>{Math.round(item.nutrition.protein_g)}p / {Math.round(item.nutrition.carbs_g)}c / {Math.round(item.nutrition.fat_g)}f</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroceryView({ playerId }) {
  const [list, setList] = useState(null);
  useEffect(() => { api.getGroceryList(playerId).then(setList); }, [playerId]);
  if (!list) return <p className="muted">Loading…</p>;
  return (
    <div>
      <p className="muted small">Auto-generated from this week's meal plan ({list.weekStart} → {list.weekEnd}). Swap a meal and this list updates automatically.</p>
      {list.categories.length ? list.categories.map((cat) => (
        <div key={cat.category} className="card">
          <h3 style={{ marginTop: 0 }}>{cat.label}</h3>
          <div className="stack-list">
            {cat.items.map((item) => (
              <div key={item.key} className="row between small" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{item.label}</span>
                <span className="muted">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )) : <p className="muted">No meal plan generated yet — visit the Meal Plan tab first.</p>}
    </div>
  );
}

function CalendarSyncView({ playerId }) {
  const [icsText, setIcsText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [externalEvents, setExternalEvents] = useState([]);
  const feedUrl = `${window.location.origin}/api/players/${playerId}/calendar.ics`;

  useEffect(() => { api.getExternalEvents(playerId).then(setExternalEvents); }, [playerId]);

  async function doImport() {
    setImporting(true); setImportResult(null);
    try {
      const res = await api.importCalendar(playerId, icsText);
      setImportResult(res);
      setIcsText('');
      api.getExternalEvents(playerId).then(setExternalEvents);
    } catch (e) {
      setImportResult({ error: e.message });
    } finally { setImporting(false); }
  }

  async function removeEvent(id) {
    await api.deleteExternalEvent(id);
    setExternalEvents((evs) => evs.filter((e) => e.id !== id));
  }

  return (
    <div>
      <div className="card">
        <h3>Subscribe to Your Training Calendar</h3>
        <p className="muted small">Add this URL in Google Calendar ("Other calendars → From URL") or Apple Calendar ("File → New Calendar Subscription") to see your workouts alongside everything else.</p>
        <div className="row">
          <input readOnly value={feedUrl} style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
          <button className="btn secondary" onClick={() => navigator.clipboard?.writeText(feedUrl)}>Copy</button>
        </div>
      </div>

      <div className="card">
        <h3>Import Games / Practice / School Schedule</h3>
        <p className="muted small">Paste the contents of an .ics file exported from your team or school calendar. Your coach will avoid scheduling hard sessions on top of these.</p>
        <textarea rows={5} placeholder="BEGIN:VCALENDAR..." value={icsText} onChange={(e) => setIcsText(e.target.value)} />
        <button className="btn block" style={{ marginTop: 10 }} disabled={importing || !icsText.trim()} onClick={doImport}>
          {importing ? <span className="spinner" /> : 'Import Calendar'}
        </button>
        {importResult && (
          <p className="small" style={{ color: importResult.error ? 'var(--red)' : 'var(--green)', marginTop: 8 }}>
            {importResult.error || `Imported ${importResult.imported} upcoming event(s).`}
          </p>
        )}
      </div>

      {externalEvents.length > 0 && (
        <div className="card">
          <h3>Imported Events</h3>
          <div className="stack-list">
            {externalEvents.map((e) => (
              <div key={e.id} className="row between small" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{e.start_date} — {e.title}</span>
                <button className="btn ghost small" onClick={() => removeEvent(e.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
