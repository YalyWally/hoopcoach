import React from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, Link } from 'react-router-dom';
import { usePlayer } from './state/PlayerContext.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Assessment from './pages/Assessment.jsx';
import Home from './pages/Home.jsx';
import Train from './pages/Train.jsx';
import Progress from './pages/Progress.jsx';
import Plan from './pages/Plan.jsx';
import Nutrition from './pages/Nutrition.jsx';
import Coach from './pages/Coach.jsx';
import Settings from './pages/Settings.jsx';

function TopBar() {
  const { player } = usePlayer();
  if (!player) return null;
  return (
    <div className="topbar">
      <div className="brand">Hoop<span>Coach</span></div>
      <div className="row small muted" style={{ alignItems: 'center' }}>
        <span>🔥 {player.streak_count || 0}d</span>
        <span>·</span>
        <span>Lv {player.level || 1}</span>
        <span>·</span>
        <span>{player.xp || 0} XP</span>
        <span>·</span>
        <Link to="/settings" className="muted" title="Settings" style={{ textDecoration: 'none', fontSize: '1.05em' }}>⚙️</Link>
      </div>
    </div>
  );
}

function BottomNav() {
  const loc = useLocation();
  if (loc.pathname === '/onboarding' || loc.pathname === '/assessment') return null;
  const items = [
    { to: '/home', icon: '🏠', label: 'Home' },
    { to: '/train', icon: '🏀', label: 'Train' },
    { to: '/progress', icon: '📈', label: 'Progress' },
    { to: '/plan', icon: '🗓️', label: 'Plan' },
    { to: '/nutrition', icon: '🍎', label: 'Nutrition' },
    { to: '/coach', icon: '💬', label: 'Coach' },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="icon">{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function RequirePlayer({ children }) {
  const { playerId, ctx, loading } = usePlayer();
  if (loading) return <div className="app-content"><p className="muted">Loading…</p></div>;
  if (!playerId) return <Navigate to="/onboarding" replace />;
  if (ctx && !ctx.latestAssessment) return <Navigate to="/assessment" replace />;
  return children;
}

export default function App() {
  const { playerId, ctx, loading } = usePlayer();

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={
            loading ? <p className="muted">Loading…</p> :
            !playerId ? <Navigate to="/onboarding" replace /> :
            (ctx && !ctx.latestAssessment) ? <Navigate to="/assessment" replace /> :
            <Navigate to="/home" replace />
          } />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/home" element={<RequirePlayer><Home /></RequirePlayer>} />
          <Route path="/train" element={<RequirePlayer><Train /></RequirePlayer>} />
          <Route path="/train/:workoutId" element={<RequirePlayer><Train /></RequirePlayer>} />
          <Route path="/progress" element={<RequirePlayer><Progress /></RequirePlayer>} />
          <Route path="/plan" element={<RequirePlayer><Plan /></RequirePlayer>} />
          <Route path="/nutrition" element={<RequirePlayer><Nutrition /></RequirePlayer>} />
          <Route path="/coach" element={<RequirePlayer><Coach /></RequirePlayer>} />
          <Route path="/settings" element={<RequirePlayer><Settings /></RequirePlayer>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}
