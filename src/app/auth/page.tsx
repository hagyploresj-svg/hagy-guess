
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase-browser';

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>(
    'register'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const supabase = browserSupabase();

      if (!supabase) {
        throw new Error('Supabase bağlantısı bulunamadı.');
      }

      if (mode === 'register') {
        const { error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo:
                `${window.location.origin}/auth`,
            },
          });

        if (signUpError) throw signUpError;

        setMessage(
          'Kayıt isteğin alındı! E-postana gelen doğrulama bağlantısını kontrol et. Doğruladıktan sonra giriş yapabilirsin.'
        );
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) throw signInError;

        router.push('/profile');
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Bir hata oluştu.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#071522] px-5 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-xs font-bold tracking-[0.3em] text-cyan-400"
          >
            HAGY EXPLORER
          </Link>

          <div className="my-5 text-5xl">🌍</div>

          <h1 className="text-3xl font-black">
            {mode === 'register'
              ? 'Macerana Başla'
              : 'Tekrar Hoş Geldin'}
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {mode === 'register'
              ? 'Hesabını oluştur, karakterini tasarla ve dünyayı keşfet.'
              : 'Hesabına giriş yap ve keşfetmeye devam et.'}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#102638] p-6 shadow-2xl">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[#071522] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setMessage('');
              }}
              className={`rounded-lg py-3 text-sm font-bold transition ${
                mode === 'register'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kayıt Ol
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
              className={`rounded-lg py-3 text-sm font-bold transition ${
                mode === 'login'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Giriş Yap
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-slate-300"
              >
                E-posta adresi
              </label>

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@gmail.com"
                className="w-full rounded-xl border border-white/10 bg-[#071522] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-slate-300"
              >
                Şifre
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === 'register'
                    ? 'new-password'
                    : 'current-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full rounded-xl border border-white/10 bg-[#071522] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-300"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-200"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 py-4 font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading
                ? 'Lütfen bekle...'
                : mode === 'register'
                ? 'Hesap Oluştur'
                : 'Giriş Yap'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            HAGY EXPLORER · Dünyayı keşfet
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-slate-400 hover:text-cyan-300"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
