'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { credsKey } from '@/hooks/useRoom';

export default function RoomEntry() {
  const router = useRouter();
  const [nick, setNick] = useState('');
  const [rounds, setRounds] = useState(5);
  const [time, setTime] = useState(120);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ code: string; playerId: string; secret: string }>('/api/rooms', {
        method: 'POST', body: { nickname: nick, totalRounds: rounds, timeLimitSec: time },
      });
      localStorage.setItem(credsKey(r.code), JSON.stringify({ playerId: r.playerId, secret: r.secret }));
      router.push(`/room/${r.code}`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  const field = 'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-brand';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">← Ana sayfa</Link>
      <h1 className="text-3xl font-black">Çok Oyunculu</h1>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="font-bold">Oda kur</h2>
        <input className={field} placeholder="Takma adın" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select className={field} value={rounds} onChange={(e) => setRounds(+e.target.value)}>
            {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} tur</option>)}
          </select>
          <select className={field} value={time} onChange={(e) => setTime(+e.target.value)}>
            <option value={60}>60 sn</option><option value={120}>2 dk</option><option value={180}>3 dk</option><option value={0}>Süresiz</option>
          </select>
        </div>
        <button disabled={!nick.trim() || busy} onClick={create} className="w-full rounded-xl bg-brand py-3 font-bold text-slate-950 disabled:opacity-40">
          {busy ? 'Oluşturuluyor…' : 'Oda oluştur'}
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="font-bold">Odaya katıl</h2>
        <input className={`${field} uppercase tracking-widest`} placeholder="ODA KODU" maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button disabled={code.length < 5} onClick={() => router.push(`/room/${code}`)} className="w-full rounded-xl border border-slate-600 py-3 font-bold disabled:opacity-40">
          Katıl
        </button>
      </section>
      {err && <p className="text-center text-sm text-rose-300">{err}</p>}
    </main>
  );
}
