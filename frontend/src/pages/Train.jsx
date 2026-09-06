import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlayer } from '../state/PlayerContext.jsx';
import { api } from '../api.js';
import WorkoutCard from '../components/WorkoutCard.jsx';

const TYPE_ICON = { skills: '🏀', gym: '🏋️', field: '⚡', recovery: '😴', testing: '🧪', game: '🏆' };

export default function Train() {
  const { workoutId } = useParams();
  const { ctx, player, refresh } = usePlayer();

  if (workoutId) return <WorkoutDetail workoutId={workoutId} />;

  const [tab, setTab] = useState('today');
  if (!ctx) return <p className="muted">Loading…</p>;

  const upcoming = ctx.upcomingWorkouts || [];
  const filtered = tab === 'today' ? upcoming.filter((w) => w.scheduled_date === ctx.today)
    : tab === 'history' ? null
    : upcoming.filter((w) => w.day_type === tab && w.scheduled_date >= ctx.today);

  return (
    <div>
      <h2>Train</h2>
      <div className="row wrap" style={{ marginBottom: 16 }}>
        {['today', 'skills', 'gym', 'field', 'history'].map((t) => (
          <button key={t} className={`chip-toggle ${tab === t ? 'selected' : ''}`} onClick={() => setTab(t)}>
            {t === 'today' ? '📅 Today' : t === 'history' ? '📜 History' : `${TYPE_ICON[t]} ${t[0].toUpperCase()}${t.slice(1)}`}
          </button>
        ))}
      </div>

      {tab !== 'history' ? (
        <div>
          {filtered && filtered.length ? filtered.map((w) => <WorkoutCard key={w.id} workout={w} showDate={tab !== 'today'} />)
            : <p className="muted">Nothing here right now.</p>}
        </div>
      ) : (
        <div className="stack-list">
          {(ctx.recentLogs || []).map((l) => (
            <div key={l.id} className="card">
              <div className="row between">
                <strong>{l.title}</strong>
                <span className="small muted">{l.scheduled_date}</span>
              </div>
              <div className="row small muted wrap" style={{ marginTop: 6 }}>
                <span>Difficulty {l.difficulty_rating}/10</span>
                <span>·</span>
                <span>Energy {l.energy_level}/10</span>
                <span>·</span>
                <span>Soreness {l.soreness_level}/10</span>
                {l.pain_flag ? <span style={{ color: 'var(--red)' }}>· Pain reported</span> : null}
              </div>
            </div>
          ))}
          {!ctx.recentLogs?.length && <p className="muted">No completed workouts yet.</p>}
        </div>
      )}
    </div>
  );
}

function WorkoutDetail({ workoutId }) {
  const { player, refresh } = usePlayer();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [checkinDone, setCheckinDone] = useState(false);
  const [checkinStep, setCheckinStep] = useState(true);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [checkinDetail, setCheckinDetail] = useState({ location: '', severity: 5, worsensWithMovement: false });
  const [medicalMessage, setMedicalMessage] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [completeForm, setCompleteForm] = useState({ difficultyRating: 5, energyLevel: 5, sorenessLevel: 3, painFlag: false, overallRating: 7, notes: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.getWorkout(workoutId).then((w) => { setWorkout(w); setCheckinStep(w.status === 'scheduled'); });
  useEffect(() => { load(); }, [workoutId]);

  if (!workout) return <p className="muted">Loading…</p>;

  async function submitCheckin(status) {
    setCheckinStatus(status);
    if (status === 'no') { setCheckinStep(false); return; }
  }

  async function confirmCheckinDetail() {
    setBusy(true);
    try {
      const res = await api.checkin(workoutId, { status: checkinStatus, ...checkinDetail });
      setWorkout(res.workout);
      if (res.medicalMessage) setMedicalMessage(res.medicalMessage);
      setCheckinStep(false);
    } finally { setBusy(false); }
  }

  async function submitComplete() {
    setBusy(true);
    try {
      const res = await api.completeWorkout(workoutId, completeForm);
      setResult(res);
      await refresh();
    } finally { setBusy(false); }
  }

  if (checkinStep) {
    return (
      <div>
        <BackLink />
        <h2>Before You Start</h2>
        <div className="card">
          <h3>Are you injured or sore?</h3>
          {!checkinStatus && (
            <div className="row wrap">
              <button className="btn secondary" onClick={() => submitCheckin('no')}>No, I'm good</button>
              <button className="btn secondary" onClick={() => setCheckinStatus('sore')}>Sore</button>
              <button className="btn secondary" onClick={() => setCheckinStatus('injured')}>Injured</button>
            </div>
          )}
          {(checkinStatus === 'sore' || checkinStatus === 'injured') && (
            <div className="col" style={{ marginTop: 12 }}>
              <div>
                <span className="label">Where?</span>
                <input value={checkinDetail.location} onChange={(e) => setCheckinDetail((d) => ({ ...d, location: e.target.value }))} placeholder="e.g. right ankle, quads" />
              </div>
              <div>
                <span className="label">How severe? ({checkinDetail.severity}/10)</span>
                <input type="range" min="1" max="10" value={checkinDetail.severity} onChange={(e) => setCheckinDetail((d) => ({ ...d, severity: Number(e.target.value) }))} />
              </div>
              <label className="row small muted" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={checkinDetail.worsensWithMovement} onChange={(e) => setCheckinDetail((d) => ({ ...d, worsensWithMovement: e.target.checked }))} />
                Does movement make it worse?
              </label>
              <button className="btn block" disabled={busy} onClick={confirmCheckinDetail}>{busy ? <span className="spinner" /> : 'Continue'}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <h2>Nice work! 💪</h2>
        <div className="card">
          <p>+{result.xpGain} XP earned. Streak: 🔥 {result.streak} days.</p>
          {result.adaptedNextWorkout && (
            <p className="small" style={{ color: 'var(--green)' }}>Your coach adjusted your next {result.adaptedNextWorkout.day_type} session based on this feedback: "{result.adaptedNextWorkout.objective}"</p>
          )}
        </div>
        <button className="btn block" onClick={() => navigate('/home')}>Back to Home</button>
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      {medicalMessage && <div className="card" style={{ borderColor: 'var(--red)' }}><p style={{ color: 'var(--red)', margin: 0 }}>⚠️ {medicalMessage}</p></div>}
      <div className="row between">
        <span className={`pill ${workout.day_type}`}>{TYPE_ICON[workout.day_type]} {workout.day_type}</span>
        {workout.status === 'modified' && <span className="pill" style={{ color: '#fbbf24' }}>✎ modified for you today</span>}
      </div>
      <h2>{workout.title}</h2>
      <p className="muted">{workout.objective}</p>
      <div className="row small muted"><span>⏱ {workout.est_duration_min} min</span></div>

      {workout.warmup?.length > 0 && <Section title="Warm-Up" items={workout.warmup} />}
      {workout.main?.length > 0 && <Section title="Main" items={workout.main} />}
      {workout.cooldown?.length > 0 && <Section title="Cooldown" items={workout.cooldown} />}

      {workout.status !== 'completed' ? (
        <button className="btn block" onClick={() => setShowComplete(true)}>Mark Workout Complete</button>
      ) : (
        <p className="muted">✓ Completed</p>
      )}
      <Link to="/coach" className="btn secondary block" style={{ marginTop: 10, textDecoration: 'none' }}>Ask Coach to Adjust This Workout</Link>

      {showComplete && (
        <div className="modal-backdrop" onClick={() => setShowComplete(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h3>How did it go?</h3>
            <div className="col">
              <RangeField label="Difficulty" value={completeForm.difficultyRating} onChange={(v) => setCompleteForm((f) => ({ ...f, difficultyRating: v }))} />
              <RangeField label="Energy Level" value={completeForm.energyLevel} onChange={(v) => setCompleteForm((f) => ({ ...f, energyLevel: v }))} />
              <RangeField label="Body/Leg Fatigue" value={completeForm.sorenessLevel} onChange={(v) => setCompleteForm((f) => ({ ...f, sorenessLevel: v }))} />
              <RangeField label="Overall Rating" value={completeForm.overallRating} onChange={(v) => setCompleteForm((f) => ({ ...f, overallRating: v }))} />
              <label className="row small muted" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={completeForm.painFlag} onChange={(e) => setCompleteForm((f) => ({ ...f, painFlag: e.target.checked }))} />
                I felt pain or discomfort during this session
              </label>
              <textarea placeholder="Notes (optional)" rows={2} value={completeForm.notes} onChange={(e) => setCompleteForm((f) => ({ ...f, notes: e.target.value }))} />
              <button className="btn block" disabled={busy} onClick={submitComplete}>{busy ? <span className="spinner" /> : 'Submit Feedback'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return <Link to="/train" className="small muted" style={{ textDecoration: 'none' }}>← Back to Train</Link>;
}

function Section({ title, items }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="stack-list">
        {items.map((it, i) => (
          <div key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: 8 }}>
            <div className="row between">
              <strong>{it.name}</strong>
              <span className="small muted">
                {it.durationMin ? `${it.durationMin} min` : ''}
                {it.sets ? `${it.sets}x${it.reps}` : ''}
              </span>
            </div>
            {it.description || it.desc ? <p className="small muted" style={{ margin: '4px 0 0' }}>{it.description || it.desc}</p> : null}
            {it.note && <p className="small" style={{ margin: '4px 0 0', color: 'var(--blue)' }}>{it.note}</p>}
            {it.restNote && <p className="small faint" style={{ margin: '4px 0 0' }}>{it.restNote}</p>}
            {it.target && <p className="small faint" style={{ margin: '4px 0 0' }}>🎯 {it.target}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RangeField({ label, value, onChange }) {
  return (
    <div>
      <span className="label">{label} ({value}/10)</span>
      <input type="range" min="1" max="10" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
