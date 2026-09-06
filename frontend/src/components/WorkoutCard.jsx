import React from 'react';
import { Link } from 'react-router-dom';

const TYPE_ICON = { skills: '🏀', gym: '🏋️', field: '⚡', recovery: '😴', testing: '🧪', game: '🏆' };

export default function WorkoutCard({ workout, showDate = false }) {
  if (!workout) return null;
  return (
    <Link to={`/train/${workout.id}`} className="card" style={{ display: 'block', textDecoration: 'none' }}>
      <div className="row between">
        <div className="row">
          <span className={`pill ${workout.day_type}`}>{TYPE_ICON[workout.day_type]} {workout.day_type}</span>
          {workout.status === 'modified' && <span className="pill" style={{ color: '#fbbf24' }}>✎ modified</span>}
          {workout.status === 'completed' && <span className="pill" style={{ color: '#34d399' }}>✓ done</span>}
        </div>
        {showDate && <span className="small muted">{workout.scheduled_date}</span>}
      </div>
      <h3 style={{ margin: '10px 0 4px' }}>{workout.title}</h3>
      <p className="muted small" style={{ margin: 0 }}>{workout.objective}</p>
      <div className="row small muted" style={{ marginTop: 10 }}>
        <span>⏱ {workout.est_duration_min ?? '?'} min</span>
        <span>·</span>
        <span>{(workout.main || []).length} block{(workout.main || []).length === 1 ? '' : 's'}</span>
      </div>
    </Link>
  );
}
