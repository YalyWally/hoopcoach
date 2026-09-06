import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePlayer } from '../state/PlayerContext.jsx';
import { api } from '../api.js';
import Ring from '../components/Ring.jsx';
import { DIETARY_OPTIONS } from '../data/options.js';

const PREF_LEVELS = [
  { key: 'love', label: '❤️ Love it' }, { key: 'like', label: '👍 Like it' }, { key: 'neutral', label: '😐 Neutral' },
  { key: 'dislike', label: '👎 Dislike' }, { key: 'cant_eat', label: '🚫 Can\'t eat' },
];

export default function Nutrition() {
  const { player, refresh } = usePlayer();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [logging, setLogging] = useState(false);
  const [lastGuidance, setLastGuidance] = useState(null);
  const [restrictions, setRestrictions] = useState([]);
  const [needsManual, setNeedsManual] = useState(null); // { logId, calories, protein_g, carbs_g, fat_g }
  const [ingredients, setIngredients] = useState([]);
  const [foodPrefs, setFoodPrefsState] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { identifiedFoods, calories, ... }
  const [scanImagePreview, setScanImagePreview] = useState(null);
  const [scanMealType, setScanMealType] = useState('lunch');

  const load = () => {
    if (!player) return;
    api.getNutritionToday(player.id).then(setToday);
    api.getNutritionHistory(player.id, 14).then(setHistory);
  };
  useEffect(load, [player?.id]);
  useEffect(() => { if (player) { setRestrictions(player.dietaryRestrictions || []); setFoodPrefsState(player.foodPrefs || {}); } }, [player?.id]);
  useEffect(() => { api.getIngredients().then(setIngredients); }, []);

  async function logIt() {
    if (!description.trim()) return;
    setLogging(true); setLastGuidance(null); setNeedsManual(null);
    try {
      const res = await api.logMeal(player.id, { description, mealType });
      setDescription('');
      if (res.macrosUnavailable) {
        setNeedsManual({ logId: res.log.id, description, calories: '', protein_g: '', carbs_g: '', fat_g: '' });
        setLastGuidance(res.macroNote);
      } else {
        setLastGuidance(res.guidance);
      }
      load();
    } finally { setLogging(false); }
  }

  async function saveManualMacros() {
    if (!needsManual) return;
    await api.updateMealLog(needsManual.logId, {
      calories: Number(needsManual.calories) || 0, protein_g: Number(needsManual.protein_g) || 0,
      carbs_g: Number(needsManual.carbs_g) || 0, fat_g: Number(needsManual.fat_g) || 0,
    });
    setNeedsManual(null);
    load();
  }

  async function toggleRestriction(r) {
    const next = restrictions.includes(r) ? restrictions.filter((x) => x !== r) : [...restrictions, r];
    setRestrictions(next);
    await api.setFoodPrefs(player.id, { dietaryRestrictions: next });
    await refresh();
  }

  async function setIngredientPref(key, level) {
    const next = { ...foodPrefs, [key]: level };
    setFoodPrefsState(next);
    await api.setFoodPrefs(player.id, { foodPrefs: next });
    await refresh();
  }

  function onScanFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setScanImagePreview(dataUrl);
      const [prefix, base64] = dataUrl.split(',');
      const mediaType = prefix.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
      setScanning(true);
      try {
        const result = await api.scanMeal(player.id, base64, mediaType);
        setScanResult(result);
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function confirmScan() {
    if (!scanResult) return;
    const description = scanResult.identifiedFoods?.length ? scanResult.identifiedFoods.map((f) => `${f.name}${f.estimated_portion ? ` (${f.estimated_portion})` : ''}`).join(', ') : 'Scanned meal';
    await api.logMeal(player.id, {
      description, mealType: scanMealType,
      manualMacros: { calories: scanResult.calories || 0, protein_g: scanResult.protein_g || 0, carbs_g: scanResult.carbs_g || 0, fat_g: scanResult.fat_g || 0, fiber_g: scanResult.fiber_g || 0, sugar_g: scanResult.sugar_g || 0, sodium_mg: scanResult.sodium_mg || 0 },
      source: 'photo_estimate', isEstimate: true,
    });
    setScanResult(null); setScanImagePreview(null);
    load();
  }

  function updateScanField(field, value) {
    setScanResult((r) => ({ ...r, [field]: value }));
  }

  if (!player || !today) return <p className="muted">Loading…</p>;
  const { target, totals, remaining, logs } = today;

  return (
    <div>
      <h2>Nutrition</h2>

      <div className="card" style={{ textAlign: 'center' }}>
        <Ring value={totals.calories} max={target.calories} size={140} stroke={14}
          label={`${Math.round(totals.calories)}`} sub={`/ ${target.calories} kcal`} />
        <p className="muted small" style={{ marginTop: 10 }}>
          {remaining.calories >= 0 ? `${Math.round(remaining.calories)} kcal remaining today` : `${Math.abs(Math.round(remaining.calories))} kcal over today's target`}
        </p>
      </div>

      <div className="card">
        <h3>Macros</h3>
        <MacroBar label="Protein" val={totals.protein_g} target={target.protein_g} color="#3ea6ff" />
        <MacroBar label="Carbohydrates" val={totals.carbs_g} target={target.carbs_g} color="#fbbf24" />
        <MacroBar label="Fat" val={totals.fat_g} target={target.fat_g} color="#a78bfa" />
      </div>

      <div className="card">
        <h3>Other Nutrients (targets)</h3>
        <div className="row wrap" style={{ gap: 16 }}>
          <MicroStat label="Fiber" val={totals.fiber_g} target={target.fiber_g} unit="g" />
          <MicroStat label="Sugar" val={totals.sugar_g} target={target.sugar_g} unit="g" />
          <MicroStat label="Sodium" val={totals.sodium_mg} target={target.sodium_mg} unit="mg" />
          <MicroStat label="Sat. Fat" val={null} target={target.sat_fat_g} unit="g" />
          <MicroStat label="Cholesterol" val={null} target={target.cholesterol_mg} unit="mg" />
          <MicroStat label="Calcium" val={null} target={target.calcium_mg} unit="mg" />
          <MicroStat label="Iron" val={null} target={target.iron_mg} unit="mg" />
          <MicroStat label="Potassium" val={null} target={target.potassium_mg} unit="mg" />
        </div>
      </div>

      <div className="card" style={{ border: '1px solid var(--orange)' }}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>📸 Scan Meal</h3>
          <div className="row wrap">
            {['breakfast', 'lunch', 'dinner', 'snack'].map((m) => (
              <button key={m} className={`chip-toggle ${scanMealType === m ? 'selected' : ''}`} onClick={() => setScanMealType(m)}>{m}</button>
            ))}
          </div>
        </div>
        <p className="muted small">Take a photo of your meal and your AI coach will identify what's on the plate and estimate the nutrition facts.</p>
        <label className="btn block" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
          {scanning ? <span className="spinner" /> : 'Take or Upload a Photo'}
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onScanFileChosen} disabled={scanning} />
        </label>
        {scanImagePreview && !scanning && scanResult && (
          <div className="row" style={{ marginTop: 12, alignItems: 'flex-start', gap: 12 }}>
            <img src={scanImagePreview} alt="scanned meal" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <p className="small faint" style={{ margin: '0 0 6px' }}>
                {scanResult.unavailable ? scanResult.note : `Estimated — ${scanResult.confidence || 'medium'} confidence. Correct anything before logging.`}
              </p>
              {!!scanResult.identifiedFoods?.length && (
                <p className="small muted" style={{ margin: '0 0 8px' }}>Identified: {scanResult.identifiedFoods.map((f) => f.name).join(', ')}</p>
              )}
              <div className="row wrap">
                <input style={{ flex: 1, minWidth: 80 }} type="number" placeholder="kcal" value={scanResult.calories ?? ''} onChange={(e) => updateScanField('calories', Number(e.target.value))} />
                <input style={{ flex: 1, minWidth: 80 }} type="number" placeholder="protein g" value={scanResult.protein_g ?? ''} onChange={(e) => updateScanField('protein_g', Number(e.target.value))} />
                <input style={{ flex: 1, minWidth: 80 }} type="number" placeholder="carbs g" value={scanResult.carbs_g ?? ''} onChange={(e) => updateScanField('carbs_g', Number(e.target.value))} />
                <input style={{ flex: 1, minWidth: 80 }} type="number" placeholder="fat g" value={scanResult.fat_g ?? ''} onChange={(e) => updateScanField('fat_g', Number(e.target.value))} />
              </div>
              <button className="btn secondary block" style={{ marginTop: 8 }} onClick={confirmScan}>Confirm & Log</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Log a Meal</h3>
        <p className="muted small">Describe what you ate in plain language — your AI coach estimates the nutrition facts automatically.</p>
        <div className="col">
          <textarea rows={2} placeholder="e.g. Grilled chicken sandwich with fries and a Gatorade" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="row wrap">
            {['breakfast', 'lunch', 'dinner', 'snack'].map((m) => (
              <button key={m} className={`chip-toggle ${mealType === m ? 'selected' : ''}`} onClick={() => setMealType(m)}>{m}</button>
            ))}
          </div>
          <button className="btn block" disabled={logging} onClick={logIt}>{logging ? <span className="spinner" /> : 'Log It'}</button>
          {lastGuidance && <p className="small" style={{ color: 'var(--yellow)' }}>{lastGuidance}</p>}
          {needsManual && (
            <div className="col" style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 10 }}>
              <span className="label">Enter macros manually for "{needsManual.description}"</span>
              <div className="row wrap">
                <input style={{ flex: 1, minWidth: 90 }} type="number" placeholder="kcal" value={needsManual.calories} onChange={(e) => setNeedsManual((n) => ({ ...n, calories: e.target.value }))} />
                <input style={{ flex: 1, minWidth: 90 }} type="number" placeholder="protein g" value={needsManual.protein_g} onChange={(e) => setNeedsManual((n) => ({ ...n, protein_g: e.target.value }))} />
                <input style={{ flex: 1, minWidth: 90 }} type="number" placeholder="carbs g" value={needsManual.carbs_g} onChange={(e) => setNeedsManual((n) => ({ ...n, carbs_g: e.target.value }))} />
                <input style={{ flex: 1, minWidth: 90 }} type="number" placeholder="fat g" value={needsManual.fat_g} onChange={(e) => setNeedsManual((n) => ({ ...n, fat_g: e.target.value }))} />
              </div>
              <button className="btn secondary block" onClick={saveManualMacros}>Save Macros</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Today's Log</h3>
        <div className="stack-list">
          {logs.length ? logs.map((l) => (
            <div key={l.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div>{l.description} {l.is_estimate ? <span className="faint">(est.)</span> : null}</div>
                <div className="muted">{l.meal_type || 'meal'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>{Math.round(l.calories)} kcal</div>
                <div className="muted">{Math.round(l.protein_g)}p/{Math.round(l.carbs_g)}c/{Math.round(l.fat_g)}f</div>
              </div>
            </div>
          )) : <p className="muted">Nothing logged yet today.</p>}
        </div>
      </div>

      <div className="card">
        <h3>14-Day Calorie History</h3>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232e3a" />
              <XAxis dataKey="day" tickFormatter={(d) => d?.slice(5)} stroke="#5c6b7a" fontSize={10} />
              <YAxis stroke="#5c6b7a" fontSize={10} />
              <Tooltip contentStyle={{ background: '#161e27', border: '1px solid #232e3a' }} />
              <Bar dataKey="calories" fill="#ff7a1a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Dietary Restrictions</h3>
        <div className="row wrap">
          {DIETARY_OPTIONS.map((r) => (
            <button key={r} className={`chip-toggle ${restrictions.includes(r) ? 'selected' : ''}`} onClick={() => toggleRestriction(r)}>{r}</button>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Your AI coach avoids suggesting these when estimating meals and building recommendations.</p>
      </div>

      <div className="card">
        <h3>Food Preferences</h3>
        <p className="small muted">Tell your coach what you actually like — the meal plan uses this to pick recipes and avoid foods you dislike or can't eat.</p>
        <div className="stack-list">
          {Object.entries(ingredients.reduce((acc, i) => { (acc[i.category] = acc[i.category] || []).push(i); return acc; }, {})).map(([cat, items]) => (
            <div key={cat}>
              <span className="label">{cat}</span>
              <div className="stack-list">
                {items.map((ing) => (
                  <div key={ing.key} className="row between wrap" style={{ gap: 6 }}>
                    <span className="small">{ing.label}</span>
                    <div className="row wrap" style={{ gap: 4 }}>
                      {PREF_LEVELS.map((lvl) => (
                        <button key={lvl.key} className={`chip-toggle ${foodPrefs[ing.key] === lvl.key ? 'selected' : ''}`} style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => setIngredientPref(ing.key, foodPrefs[ing.key] === lvl.key ? undefined : lvl.key)}>
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MacroBar({ label, val, target, color }) {
  const pct = target ? Math.min(100, Math.round((val / target) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="row between small muted"><span>{label}</span><span>{Math.round(val)} / {target} g</span></div>
      <div className="progress-bar"><div style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

function MicroStat({ label, val, target, unit }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div className="small muted">{label}</div>
      <div>{val != null ? `${Math.round(val)}` : '—'} <span className="faint">/ {target}{unit}</span></div>
    </div>
  );
}
