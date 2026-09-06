import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';

const PlayerCtx = createContext(null);

export function PlayerProvider({ children }) {
  const [playerId, setPlayerIdState] = useState(() => localStorage.getItem('hc_player_id'));
  const [player, setPlayer] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);

  const setPlayerId = useCallback((id) => {
    if (id) localStorage.setItem('hc_player_id', id);
    else localStorage.removeItem('hc_player_id');
    setPlayerIdState(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!playerId) { setPlayer(null); setCtx(null); setLoading(false); return; }
    try {
      const [p, c] = await Promise.all([api.getPlayer(playerId), api.getContext(playerId)]);
      setPlayer(p);
      setCtx(c);
    } catch (e) {
      console.error('Failed to load player, resetting', e);
      setPlayerId(null);
    } finally {
      setLoading(false);
    }
  }, [playerId, setPlayerId]);

  useEffect(() => { setLoading(true); refresh(); }, [playerId]);

  return (
    <PlayerCtx.Provider value={{ playerId, setPlayerId, player, ctx, loading, refresh }}>
      {children}
    </PlayerCtx.Provider>
  );
}

export function usePlayer() {
  const v = useContext(PlayerCtx);
  if (!v) throw new Error('usePlayer must be used within PlayerProvider');
  return v;
}
