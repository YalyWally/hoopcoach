import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePlayer } from '../state/PlayerContext.jsx';
import RatingBar from '../components/RatingBar.jsx';

const CATEGORY_LABELS = {
  shooting: 'Shooting', ball_handling: 'Ball Handling', finishing: 'Finishing', passing: 'Passing',
  defense: 'Defense', speed: 'Speed (Sprint Testing)', vertical: 'Vertical Jump', explosiveness: 'Explosiveness',
  conditioning: 'Conditioning', strength: 'Strength (Age-Appropriate)',
};

export default function Assessment() {
  const { playerId, refresh } = usePlayer();
  const [tests, setTests] = useState([]);
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.getTests().then(setTests); }, []);

  const byCategory = tests.reduce((acc, t) => { (acc[t.category] = acc[t.category] || []).push(t); return acc; }, {});

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const numericValues = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => [k, Number(v)]));
      const res = await api.submitAssessment(playerId, { type: 'initial', results: numericValues });
      setResult(res);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div>
        <h2>Assessment Complete 🏀</h2>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="ovr-badge" style={{ width: 90, height: 90, margin: '0 auto 12px' }}>
            <div className="num" style={{ fontSize: 30 }}>{result.ovr}</div>
            <div className="lbl">OVERALL</div>
          </div>
          <p className="muted">This is your baseline. Your AI coach just built your first 12-week program around it.</p>
        </div>
        <div className="card">
          <h3>Your Ratings</h3>
          {Object.entries(result.ratings).map(([k, v]) => (
            <RatingBar key={k} label={CATEGORY_LABELS[k] || k} value={v} />
          ))}
        </div>
        <button className="btn block" onClick={() => navigate('/home')}>See My Program</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Skills & Athletic Assessment</h2>
      <p className="muted">This establishes your baseline. Do what you can safely with the equipment you have — leave anything blank that you can't test right now, and your coach will schedule it for later.</p>
      {Object.entries(byCategory).map(([cat, catTests]) => (
        <div className="card" key={cat}>
          <h3>{CATEGORY_LABELS[cat] || cat}</h3>
          <div className="col">
            {catTests.map((t) => (
              <div key={t.id}>
                <span className="label">{t.label} ({t.unit})</span>
                <p className="faint small" style={{ margin: '0 0 6px' }}>{t.instructions}</p>
                <input
                  type="number" step="any" placeholder={`e.g. ${t.mean}`}
                  value={values[t.id] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
      <button className="btn block" disabled={submitting} onClick={submit}>
        {submitting ? <span className="spinner" /> : 'Submit Assessment & Build My Plan'}
      </button>
    </div>
  );
}
