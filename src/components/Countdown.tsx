'use client';
import { useEffect, useState } from 'react';

export default function Countdown({ deadline, getNow }: { deadline: number; getNow: () => number }) {
  const [left, setLeft] = useState(() => Math.max(0, deadline - getNow()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, deadline - getNow())), 250);
    return () => clearInterval(t);
  }, [deadline, getNow]);
  const s = Math.ceil(left / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span className={`font-mono tabular-nums ${s <= 10 ? 'text-rose-400' : ''}`}>{mm}:{ss}</span>;
}
