'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { browserSupabase } from '@/lib/supabase-browser';
import type { Creds, RoomState } from '@/lib/types';

export const credsKey = (code: string) => `hagy:room:${code.toUpperCase()}`;

export function useRoom(rawCode: string) {
  const code = rawCode.toUpperCase();
  const [creds, setCreds] = useState<Creds | null | undefined>(undefined); // undefined = yükleniyor
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const offset = useRef(0);

  useEffect(() => {
    try { setCreds(JSON.parse(localStorage.getItem(credsKey(code)) ?? 'null')); } catch { setCreds(null); }
  }, [code]);

  const headers = useMemo(
    () => (creds ? { 'x-player-id': creds.playerId, 'x-player-secret': creds.secret } : undefined),
    [creds],
  );

  const refresh = useCallback(async () => {
    if (!headers) return;
    try {
      const s = await api<RoomState>(`/api/rooms/${code}/state`, { headers });
      offset.current = s.serverNow - Date.now();
      setState(s); setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [code, headers]);

  useEffect(() => { refresh(); }, [refresh]);
  // Realtime kopsa bile oyun ilerlesin diye yedek yoklama
  useEffect(() => { if (!headers) return; const t = setInterval(refresh, 5000); return () => clearInterval(t); }, [headers, refresh]);

  const roomId = state?.room.id;
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb || !roomId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => { clearTimeout(timer); timer = setTimeout(refresh, 150); };
    const ch = sb.channel(`room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, bump)
      .subscribe();
    return () => { clearTimeout(timer); sb.removeChannel(ch); };
  }, [roomId, refresh]);

  const now = useCallback(() => Date.now() + offset.current, []);

  const act = useCallback(async (action: string, body?: unknown) => {
    const r = await api(`/api/rooms/${code}/${action}`, { method: 'POST', body, headers });
    await refresh();
    return r;
  }, [code, headers, refresh]);

  const join = useCallback(async (nickname: string) => {
    const r = await api<Creds>(`/api/rooms/${code}/join`, { method: 'POST', body: { nickname } });
    localStorage.setItem(credsKey(code), JSON.stringify(r));
    setCreds(r);
  }, [code]);

  return { creds, state, error, now, act, join, refresh };
}
