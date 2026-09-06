import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer } from '../state/PlayerContext.jsx';
import { GOAL_OPTIONS, EQUIPMENT_OPTIONS, DAY_OPTIONS, EXPERIENCE_OPTIONS, DIETARY_OPTIONS } from '../data/options.js';

const STEPS = ['Basics', 'Goals', 'Schedule', 'Equipment', 'Nutrition'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { setPlayerId } = usePlayer();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', age: '', heightIn: '', weightLb: '', sex: '', position: '', experienceLevel: 'jv', currentLevel: '', activityLevel: 'moderate',
    selectedGoals: [], // [{key, rank}]
    trainingDays: ['mon', 'wed', 'fri'], typicalDurationMin: 60, gameDays: [], practiceDays: [], commitments: '',
    equipment: ['basketball', 'hoop'],
    dietaryRestrictions: [],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function toggleGoal(key) {
    setForm((f) => {
      const exists = f.selectedGoals.find((g) => g.key === key);
      let next;
      if (exists) {
        next = f.selectedGoals.filter((g) => g.key !== key).map((g, i) => ({ ...g, rank: i + 1 }));
      } else {
        next = [...f.selectedGoals, { key, rank: f.selectedGoals.length + 1 }];
      }
      return { ...f, selectedGoals: next };
    });
  }

  function moveGoal(key, dir) {
    setForm((f) => {
      const idx = f.selectedGoals.findIndex((g) => g.key === key);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= f.selectedGoals.length) return f;
      const arr = [...f.selectedGoals];
      [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
      return { ...f, selectedGoals: arr.map((g, i) => ({ ...g, rank: i + 1 })) };
    });
  }

  function toggleInArray(key, val) {
    setForm((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val] }));
  }

  async function finish() {
    setSaving(true); setError(null);
    try {
      const player = await api.createPlayer({
        name: form.name || 'Player',
        age: form.age ? Number(form.age) : null,
        heightIn: form.heightIn ? Number(form.heightIn) : null,
        weightLb: form.weightLb ? Number(form.weightLb) : null,
        sex: form.sex || null,
        position: form.position || null,
        experienceLevel: form.experienceLevel,
        currentLevel: form.currentLevel || null,
        activityLevel: form.activityLevel,
        goals: form.selectedGoals,
        schedule: {
          trainingDays: form.trainingDays, typicalDurationMin: Number(form.typicalDurationMin) || 60,
          gameDays: form.gameDays, practiceDays: form.practiceDays, commitments: form.commitments,
        },
        equipment: form.equipment,
        foodPrefs: {},
        dietaryRestrictions: form.dietaryRestrictions,
      });
      setPlayerId(player.id);
      navigate('/assessment');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.selectedGoals.length > 0;
    if (step === 2) return form.trainingDays.length > 0;
    return true;
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Welcome to HoopCoach</h2>
      </div>
      <p className="muted">Let's build your personalized profile — {STEPS[step]} ({step + 1}/{STEPS.length})</p>
      <div className="progress-bar" style={{ marginBottom: 20 }}>
        <div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === 0 && (
        <div className="card col">
          <div>
            <span className="label">Name</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
          </div>
          <div className="row wrap">
            <div style={{ flex: 1, minWidth: 100 }}>
              <span className="label">Age</span>
              <input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <span className="label">Height (in)</span>
              <input type="number" value={form.heightIn} onChange={(e) => set('heightIn', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <span className="label">Weight (lb)</span>
              <input type="number" value={form.weightLb} onChange={(e) => set('weightLb', e.target.value)} />
            </div>
          </div>
          <div className="row wrap">
            <div style={{ flex: 1, minWidth: 120 }}>
              <span className="label">Sex</span>
              <select value={form.sex} onChange={(e) => set('sex', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <span className="label">Position</span>
              <select value={form.position} onChange={(e) => set('position', e.target.value)}>
                <option value="">Select...</option>
                {['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="row wrap">
            <div style={{ flex: 1, minWidth: 140 }}>
              <span className="label">Experience Level</span>
              <select value={form.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
                {EXPERIENCE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <span className="label">Current Level / Team</span>
              <input value={form.currentLevel} onChange={(e) => set('currentLevel', e.target.value)} placeholder="e.g. HS Varsity" />
            </div>
          </div>
          <div>
            <span className="label">Current Activity Level</span>
            <select value={form.activityLevel} onChange={(e) => set('activityLevel', e.target.value)}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Lightly Active</option>
              <option value="moderate">Moderately Active</option>
              <option value="active">Active</option>
              <option value="very_active">Very Active</option>
            </select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <p className="muted small">Tap goals to select them, then use the arrows to set your priority order. The AI weighs training time toward your top goals.</p>
          <div className="row wrap" style={{ marginBottom: 16 }}>
            {GOAL_OPTIONS.map((g) => {
              const selected = form.selectedGoals.some((sg) => sg.key === g.key);
              return (
                <button key={g.key} className={`chip-toggle ${selected ? 'selected' : ''}`} onClick={() => toggleGoal(g.key)} type="button">
                  {g.label}
                </button>
              );
            })}
          </div>
          {form.selectedGoals.length > 0 && (
            <div className="stack-list">
              <span className="label">Your Priority Order</span>
              {form.selectedGoals.map((g, i) => (
                <div key={g.key} className="row between" style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 10 }}>
                  <span>#{g.rank} {GOAL_OPTIONS.find((o) => o.key === g.key)?.label}</span>
                  <div className="row">
                    <button className="btn ghost" style={{ padding: '4px 10px' }} disabled={i === 0} onClick={() => moveGoal(g.key, -1)} type="button">↑</button>
                    <button className="btn ghost" style={{ padding: '4px 10px' }} disabled={i === form.selectedGoals.length - 1} onClick={() => moveGoal(g.key, 1)} type="button">↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card col">
          <div>
            <span className="label">Available Training Days</span>
            <div className="row wrap">
              {DAY_OPTIONS.map((d) => (
                <button key={d.key} type="button" className={`chip-toggle ${form.trainingDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleInArray('trainingDays', d.key)}>{d.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Typical Session Length (minutes)</span>
            <input type="number" value={form.typicalDurationMin} onChange={(e) => set('typicalDurationMin', e.target.value)} />
          </div>
          <div>
            <span className="label">Game Days</span>
            <div className="row wrap">
              {DAY_OPTIONS.map((d) => (
                <button key={d.key} type="button" className={`chip-toggle ${form.gameDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleInArray('gameDays', d.key)}>{d.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Practice Days (team practice, separate from your training)</span>
            <div className="row wrap">
              {DAY_OPTIONS.map((d) => (
                <button key={d.key} type="button" className={`chip-toggle ${form.practiceDays.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleInArray('practiceDays', d.key)}>{d.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Other recurring commitments (school, work, etc.)</span>
            <textarea rows={2} value={form.commitments} onChange={(e) => set('commitments', e.target.value)} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <p className="muted small">Only select equipment you actually have access to — the AI will never build a workout requiring something you don't have.</p>
          <div className="row wrap">
            {EQUIPMENT_OPTIONS.map((e) => (
              <button key={e.key} type="button" className={`chip-toggle ${form.equipment.includes(e.key) ? 'selected' : ''}`} onClick={() => toggleInArray('equipment', e.key)}>{e.label}</button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <span className="label">Dietary Restrictions / Allergies</span>
          <div className="row wrap">
            {DIETARY_OPTIONS.map((d) => (
              <button key={d} type="button" className={`chip-toggle ${form.dietaryRestrictions.includes(d) ? 'selected' : ''}`} onClick={() => toggleInArray('dietaryRestrictions', d)}>{d}</button>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 14 }}>You'll be able to fine-tune food likes/dislikes later from the Nutrition tab. We'll calculate your personalized calorie and macro targets now based on your profile.</p>
        </div>
      )}

      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}

      <div className="row between" style={{ marginTop: 20 }}>
        <button className="btn secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button>
        {step < STEPS.length - 1 ? (
          <button className="btn" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>Next</button>
        ) : (
          <button className="btn" disabled={saving} onClick={finish}>{saving ? <span className="spinner" /> : 'Create My Profile'}</button>
        )}
      </div>
    </div>
  );
}
