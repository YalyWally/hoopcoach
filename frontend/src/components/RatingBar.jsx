import React from 'react';

function colorFor(v) {
  if (v >= 85) return '#34d399';
  if (v >= 70) return '#3ea6ff';
  if (v >= 55) return '#fbbf24';
  return '#f87171';
}

export default function RatingBar({ label, value, delta }) {
  return (
    <div className="rating-row">
      <span className="muted">{label}</span>
      <div className="progress-bar"><div style={{ width: `${value}%`, background: colorFor(value) }} /></div>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>
        {value}
        {delta ? <span className="small" style={{ color: delta > 0 ? '#34d399' : '#f87171', marginLeft: 4 }}>{delta > 0 ? `+${delta}` : delta}</span> : null}
      </span>
    </div>
  );
}
