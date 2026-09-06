import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePlayer } from '../state/PlayerContext.jsx';
import { api } from '../api.js';
import RatingBar from '../components/RatingBar.jsx';

const CATEGORY_LABELS = {
  shooting: 'Shooting', ball_handling: 'Ball Handling', finishing: 'Finishing', passing: 'Passing',
  defense: 'Defense', speed: 'Speed', vertical: 'Vertical', explosiveness: 'Explosiveness',
  conditioning: 'Conditioning', strength: 'Strength',
};

export default function Progress() {
  const { player } = usePlayer();
  const [assessments, setAssessments] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (!player) return;
    api.getAssessments(player.id).then(setAssessments);
    api.getBadges(player.id).then(setBadges);
  }, [player?.id]);

  if (!player) return null;
  const latest = assessments[assessments.length - 1];
  const previous = assessments[assessments.length - 2];
  const chartData = assessments.map((a, i) => ({ name: a.type === 'initial' ? 'Initial' : `Test ${i}`, ovr: a.ovr, date: a.taken_at?.slice(0, 10) }));

  return (
    <div>
      <h2>Progress</h2>

      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Overall Rating Over Time</h3><span className="ovr-badge" style={{ width: 46, height: 46 }}><div className="num" style={{ fontSize: 16 }}>{latest?.ovr ?? '-'}</div></span></div>
        {chartData.length > 1 ? (
          <div style={{ height: 180, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232e3a" />
                <XAxis dataKey="name" stroke="#5c6b7a" fontSize={11} />
                <YAxis domain={[40, 99]} stroke="#5c6b7a" fontSize={11} />
                <Tooltip contentStyle={{ background: '#161e27', border: '1px solid #232e3a' }} />
                <Line type="monotone" dataKey="ovr" stroke="#ff7a1a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="muted small">Complete a retest to start tracking your OVR trend.</p>}
      </div>

      {latest && (
        <div className="card">
          <h3>Skill & Athletic Ratings</h3>
          {Object.entries(latest.ratings).map(([k, v]) => (
            <RatingBar key={k} label={CATEGORY_LABELS[k] || k} value={v} delta={previous ? v - (previous.ratings[k] ?? v) : 0} />
          ))}
        </div>
      )}

      <div className="card">
        <h3>Badges & Achievements</h3>
        {badges.length ? (
          <div className="row wrap">
            {badges.map((b) => <span key={b.id} className="badge-chip">{b.emoji} {b.label}</span>)}
          </div>
        ) : <p className="muted small">Keep training — badges unlock as your ratings climb past 85.</p>}
      </div>

      <div className="card">
        <h3>Assessment History</h3>
        <div className="stack-list">
          {[...assessments].reverse().map((a) => (
            <div key={a.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="muted">{a.taken_at?.slice(0, 10)} · {a.type}</span>
              <strong>{a.ovr} OVR</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
