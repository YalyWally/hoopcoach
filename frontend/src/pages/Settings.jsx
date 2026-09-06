import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../state/PlayerContext.jsx';
import { api } from '../api.js';
import { pushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from '../push.js';

const NOTIF_TYPES = [
  { key: 'workoutReminders', label: 'Workout reminders', desc: "Today's workout, once per day." },
  { key: 'mealReminders', label: 'Meal reminders', desc: "Nudge if you haven't logged anything by mid-afternoon." },
  { key: 'assessmentReminders', label: 'Retest reminders', desc: 'When a scheduled retest day arrives.' },
  { key: 'recoveryReminders', label: 'Recovery reminders', desc: 'Heads up on scheduled recovery days.' },
  { key: 'milestones', label: 'Milestones', desc: 'Badges earned and streak milestones.' },
];

export default function Settings() {
  const { player } = usePlayer();
  const [prefs, setPrefs] = useState({});
  const [pushState, setPushState] = useState({ supported: false, permission: 'default', subscribed: false });
  const [busy, setBusy] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!player) return;
    api.getNotificationPrefs(player.id).then(setPrefs);
    getPushSubscriptionState().then(setPushState);
  }, [player?.id]);

  async function toggle(key) {
    const next = { ...prefs, [key]: prefs[key] === false ? true : false };
    setPrefs(next);
    await api.setNotificationPrefs(player.id, { [key]: next[key] });
  }

  async function enablePush() {
    setBusy(true);
    try {
      await subscribeToPush(player.id);
      setPushState(await getPushSubscriptionState());
    } catch (e) {
      alert(e.message);
    } finally { setBusy(false); }
  }

  async function disablePush() {
    setBusy(true);
    try {
      await unsubscribeFromPush(player.id);
      setPushState(await getPushSubscriptionState());
    } finally { setBusy(false); }
  }

  async function sendTest() {
    await api.sendTestPush(player.id);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  }

  if (!player) return null;

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <Link to="/home" className="small muted" style={{ textDecoration: 'none' }}>← Back</Link>
      </div>
      <h2>Settings</h2>

      <div className="card">
        <h3>Push Notifications</h3>
        {!pushState.supported ? (
          <p className="muted small">Push notifications aren't supported in this browser.</p>
        ) : pushState.subscribed ? (
          <div className="col">
            <p className="small" style={{ color: 'var(--green)' }}>✓ Notifications are enabled on this device.</p>
            <div className="row wrap">
              <button className="btn secondary" disabled={busy} onClick={sendTest}>Send Test Notification</button>
              <button className="btn ghost" disabled={busy} onClick={disablePush}>Turn Off</button>
            </div>
            {testSent && <p className="small muted">Test sent — check your notifications.</p>}
          </div>
        ) : (
          <div className="col">
            <p className="muted small">Turn on notifications to get workout reminders, retest alerts, and milestone celebrations.</p>
            <button className="btn" disabled={busy} onClick={enablePush}>{busy ? <span className="spinner" /> : 'Enable Notifications'}</button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Notification Types</h3>
        <div className="stack-list">
          {NOTIF_TYPES.map((t) => (
            <div key={t.key} className="row between">
              <div>
                <div>{t.label}</div>
                <div className="small muted">{t.desc}</div>
              </div>
              <button className={`chip-toggle ${prefs[t.key] !== false ? 'selected' : ''}`} onClick={() => toggle(t.key)}>
                {prefs[t.key] !== false ? 'On' : 'Off'}
              </button>
            </div>
          ))}
        </div>
        <p className="small faint" style={{ marginTop: 10 }}>Notifications are kept purposeful — you won't be pinged just to maintain a streak.</p>
      </div>
    </div>
  );
}
