import React, { useEffect, useState } from 'react';
import { usePlayer } from '../state/PlayerContext.jsx';
import { api } from '../api.js';
import WorkoutCard from '../components/WorkoutCard.jsx';
import Ring from '../components/Ring.jsx';
import { Link } from 'react-router-dom';

export default function Home() {
  const { player, ctx, refresh } = usePlayer();
  const [nutrition, setNutrition] = useState(null);

  useEffect(() => {
    if (player) api.getNutritionToday(player.id).then(setNutrition);
  }, [player?.id, ctx]);

  if (!player || !ctx) return <p className="muted">Loading…</p>;
  const { latestAssessment, todayWorkout, upcomingWorkouts } = ctx;
  const nextWorkouts = upcomingWorkouts.filter((w) => w.scheduled_date > ctx.today && w.status === 'scheduled').slice(0, 2);

  return (
    <div>
      <div className="row between" style={{ marginBottom: 4 }}>
        <div>
          <h2 style={{ margin: '0 0 2px' }}>Hey {player.name.split(' ')[0]} 👋</h2>
          <p className="muted small" style={{ margin: 0 }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        {latestAssessment && (
          <div className="ovr-badge">
            <div className="num">{latestAssessment.ovr}</div>
            <div className="lbl">OVR</div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Today's Workout</h3>
        {todayWorkout ? <WorkoutCard workout={todayWorkout} /> : <p className="muted">No workout scheduled today — enjoy the rest or check your Plan tab.</p>}
      </div>

      {nutrition?.target && (
        <div className="card">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Nutrition</h3>
            <Link to="/nutrition" className="small" style={{ color: 'var(--orange)' }}>Details →</Link>
          </div>
          <div className="row" style={{ marginTop: 12, justifyContent: 'space-around' }}>
            <Ring value={nutrition.totals.calories} max={nutrition.target.calories} color="#ff7a1a"
              label={Math.round(nutrition.totals.calories)} sub={`/ ${nutrition.target.calories} kcal`} size={100} stroke={10} />
            <div className="col" style={{ justifyContent: 'center', gap: 8 }}>
              <MacroLine label="Protein" val={nutrition.totals.protein_g} target={nutrition.target.protein_g} color="#3ea6ff" />
              <MacroLine label="Carbs" val={nutrition.totals.carbs_g} target={nutrition.target.carbs_g} color="#fbbf24" />
              <MacroLine label="Fat" val={nutrition.totals.fat_g} target={nutrition.target.fat_g} color="#a78bfa" />
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Streak & Level</h3></div>
        <div className="row" style={{ marginTop: 8, justifyContent: 'space-around', textAlign: 'center' }}>
          <div><div style={{ fontSize: 22 }}>🔥 {player.streak_count || 0}</div><div className="small muted">day streak</div></div>
          <div><div style={{ fontSize: 22 }}>Lv {player.level || 1}</div><div className="small muted">{player.xp || 0} XP</div></div>
        </div>
      </div>

      {nextWorkouts.length > 0 && (
        <div>
          <h3>Coming Up</h3>
          {nextWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} showDate />)}
        </div>
      )}
    </div>
  );
}

function MacroLine({ label, val, target, color }) {
  const pct = target ? Math.min(100, Math.round((val / target) * 100)) : 0;
  return (
    <div style={{ minWidth: 160 }}>
      <div className="row between small muted"><span>{label}</span><span>{Math.round(val)}/{target}g</span></div>
      <div className="progress-bar" style={{ height: 6 }}><div style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}
