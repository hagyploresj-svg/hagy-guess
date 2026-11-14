
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase-browser';

type Avatar = {
  skin: string;
  hair: string;
  hairColor: string;
  outfit: string;
  accessory: string;
};

type Profile = {
  username: string;
  display_name: string;
  avatar: Avatar;
  xp: number;
  level: number;
  games_played: number;
  games_won: number;
  total_score: number;
};

const initialAvatar: Avatar = {
  skin: 'medium',
  hair: 'short',
  hairColor: 'brown',
  outfit: 'explorer',
  accessory: 'none',
};

const options = {
  skin: [
    ['light', 'Açık'],
    ['medium', 'Buğday'],
    ['dark', 'Koyu'],
  ],
  hair: [
    ['short', 'Kısa'],
    ['long', 'Uzun'],
    ['curly', 'Kıvırcık'],
    ['bald', 'Kel'],
  ],
  hairColor: [
    ['black', 'Siyah'],
    ['brown', 'Kahverengi'],
    ['blonde', 'Sarı'],
    ['red', 'Kızıl'],
  ],
  outfit: [
    ['explorer', 'Kaşif'],
    ['sport', 'Spor'],
    ['street', 'Sokak'],
  ],
  accessory: [
    ['none', 'Yok'],
    ['glasses', 'Gözlük'],
    ['cap', 'Şapka'],
  ],
} as const;

const skinColors: Record<string, string> = {
  light: '#f5c9a7',
  medium: '#c88d62',
  dark: '#75472f',
};

const hairColors: Record<string, string> = {
  black: '#20212b',
  brown: '#67412d',
  blonde: '#e8bf65',
  red: '#ad4d2e',
};

const outfitColors: Record<string, string> = {
  explorer: '#22d3ee',
  sport: '#a78bfa',
  street: '#f59e0b',
};

function Character({ avatar }: { avatar: Avatar }) {
  const skin = skinColors[avatar.skin] ?? skinColors.medium;
  const hair = hairColors[avatar.hairColor] ?? hairColors.brown;
  const outfit = outfitColors[avatar.outfit] ?? outfitColors.explorer;

  return (
    <svg
      viewBox="0 0 240 280"
      role="img"
      aria-label="Oluşturduğun karakterin ön izlemesi"
      className="mx-auto h-64 w-full max-w-[240px]"
    >
      <ellipse cx="120" cy="260" rx="75" ry="10" fill="#020b15" opacity=".5" />

      <path d="M65 160 Q120 135 175 160 L195 265 H45Z" fill={outfit} />
      <path d="M65 160 L40 225 L58 235 L85 183Z" fill={outfit} />
      <path d="M175 160 L200 225 L182 235 L155 183Z" fill={outfit} />

      <path d="M105 135 H135 V165 Q120 178 105 165Z" fill={skin} />
      <ellipse cx="120" cy="93" rx="54" ry="65" fill={skin} />
      <ellipse cx="67" cy="99" rx="9" ry="16" fill={skin} />
      <ellipse cx="173" cy="99" rx="9" ry="16" fill={skin} />

      {avatar.hair !== 'bald' && (
        <path
          d={
            avatar.hair === 'curly'
              ? 'M67 82 Q54 39 82 35 Q98 12 120 30 Q145 10 164 39 Q188 47 173 85 Q153 62 140 51 Q105 79 67 82Z'
              : avatar.hair === 'long'
              ? 'M65 90 Q55 20 120 22 Q185 20 175 90 L185 165 L158 165 L162 70 Q120 45 78 70 L82 165 H55Z'
              : 'M66 83 Q55 22 120 25 Q184 20 174 83 Q150 56 137 53 Q106 76 66 83Z'
          }
          fill={hair}
        />
      )}

      <ellipse cx="101" cy="101" rx="5" ry="6" fill="#17212d" />
      <ellipse cx="139" cy="101" rx="5" ry="6" fill="#17212d" />
      <path d="M109 127 Q120 134 131 127" fill="none" stroke="#874e43" strokeWidth="3" strokeLinecap="round" />

      {avatar.accessory === 'glasses' && (
        <g fill="none" stroke="#111827" strokeWidth="4">
          <rect x="84" y="90" width="32" height="24" rx="8" />
          <rect x="124" y="90" width="32" height="24" rx="8" />
          <path d="M116 99 H124 M84 98 L69 94 M156 98 L171 94" />
        </g>
      )}

      {avatar.accessory === 'cap' && (
        <g fill="#0e7490">
          <path d="M67 70 Q70 15 120 22 Q170 15 173 70Z" />
          <path d="M65 68 H181 Q193 72 180 79 H65Z" />
        </g>
      )}

      <path d="M110 170 L120 184 L130 170" fill="none" stroke="#ffffff" strokeWidth="5" opacity=".6" />
      <path d="M120 185 V260" stroke="#ffffff" strokeWidth="3" opacity=".25" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState<Avatar>(initialAvatar);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = browserSupabase();

      if (!supabase) {
        if (active) {
          setError('Supabase bağlantısı bulunamadı.');
          setLoading(false);
        }
        return;
      }

      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        router.replace('/auth');
        return;
      }

      setUserId(data.user.id);

      const { data: existing, error: profileError } = await supabase
        .from('user_profiles')
        .select('username,display_name,avatar,xp,level,games_played,games_won,total_score')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError(profileError.message);
      } else if (existing) {
        const p = existing as Profile;
        setProfile(p);
        setUsername(p.username);
        setDisplayName(p.display_name);
        setAvatar({ ...initialAvatar, ...p.avatar });
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  function updateAvatar(key: keyof Avatar, value: string) {
    setAvatar((old) => ({ ...old, [key]: value }));
  }

  async function save() {
    setError('');
    setSuccess('');

    const supabase = browserSupabase();

    if (!supabase || !userId) {
      setError('Oturum bulunamadı.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Kullanıcı adı 3-20 karakter olmalı; yalnızca İngilizce harf, rakam ve _ kullanılabilir.');
      return;
    }

    if (cleanName.length < 1 || cleanName.length > 30) {
      setError('Görünen ad 1-30 karakter olmalı.');
      return;
    }

    setSaving(true);

    try {
      if (!profile) {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            username: cleanUsername,
            display_name: cleanName,
            avatar,
          });

        if (insertError) throw insertError;

        setProfile({
          username: cleanUsername,
          display_name: cleanName,
          avatar,
          xp: 0,
          level: 1,
          games_played: 0,
          games_won: 0,
          total_score: 0,
        });
      } else {
        const { error: updateError } = await supabase.rpc(
          'update_my_profile',
          {
            new_display_name: cleanName,
            new_avatar: avatar,
          }
        );

        if (updateError) throw updateError;

        setProfile({
          ...profile,
          display_name: cleanName,
          avatar,
        });
      }

      setSuccess('Karakterin başarıyla kaydedildi!');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız';

      setError(
        msg.includes('user_profiles_username_key')
          ? 'Bu kullanıcı adı zaten alınmış.'
          : msg
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    const supabase = browserSupabase();
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace('/auth');
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#071522] text-slate-300">
        Profil yükleniyor…
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#071522] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-black tracking-widest text-cyan-400">
            🌍 HAGY EXPLORER
          </Link>

          <button onClick={logout} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
            Çıkış Yap
          </button>
        </header>

        <h1 className="text-3xl font-black">
          {profile ? 'Oyuncu Profilim' : 'Karakterini Oluştur'}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Kendi kaşifini tasarla ve dünyayı keşfetmeye hazırlan.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-[320px_1fr]">
          <section className="rounded-3xl border border-cyan-400/20 bg-[#102638] p-5">
            <div className="rounded-2xl bg-gradient-to-b from-[#19445b] to-[#071522] p-3">
              <Character avatar={avatar} />
            </div>

            <h2 className="mt-5 text-center text-xl font-black text-cyan-300">
              {displayName || 'Yeni Kaşif'}
            </h2>

            <p className="text-center text-sm text-slate-400">
              @{username || 'kullanici'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#071522] p-3 text-center">
                <p className="text-xs text-slate-400">Seviye</p>
                <p className="text-2xl font-black text-cyan-300">
                  {profile?.level ?? 1}
                </p>
              </div>

              <div className="rounded-xl bg-[#071522] p-3 text-center">
                <p className="text-xs text-slate-400">XP</p>
                <p className="text-2xl font-black text-cyan-300">
                  {profile?.xp ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-[#071522] p-3 text-center">
                <p className="text-xs text-slate-400">Oyun</p>
                <p className="text-xl font-bold">
                  {profile?.games_played ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-[#071522] p-3 text-center">
                <p className="text-xs text-slate-400">Galibiyet</p>
                <p className="text-xl font-bold">
                  {profile?.games_won ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-[#071522] p-4 text-center">
              <p className="text-xs text-slate-400">Toplam Skor</p>
              <p className="text-2xl font-black text-cyan-300">
                {(profile?.total_score ?? 0).toLocaleString('tr-TR')}
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-cyan-400/20 bg-[#102638] p-6">
            <h2 className="text-xl font-black">Karakter Ayarları</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm text-slate-300">
                  Kullanıcı Adı
                </label>

                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!profile}
                  maxLength={20}
                  placeholder="hagy_explorer"
                  className="w-full rounded-xl border border-white/10 bg-[#071522] px-4 py-3 outline-none focus:border-cyan-400 disabled:opacity-60"
                />

                {profile && (
                  <p className="mt-1 text-xs text-slate-500">
                    Kullanıcı adı kayıt sonrasında değiştirilemez.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="displayName" className="mb-2 block text-sm text-slate-300">
                  Görünen Ad
                </label>

                <input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                  placeholder="Kaşif"
                  className="w-full rounded-xl border border-white/10 bg-[#071522] px-4 py-3 outline-none focus:border-cyan-400"
                />
              </div>

              {(
                [
                  ['skin', 'Ten Rengi'],
                  ['hair', 'Saç Modeli'],
                  ['hairColor', 'Saç Rengi'],
                  ['outfit', 'Kıyafet'],
                  ['accessory', 'Aksesuar'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <p className="mb-2 text-sm text-slate-300">
                    {label}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {options[key].map(([value, text]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateAvatar(key, value)}
                        className={`rounded-xl border px-4 py-2 text-sm transition ${
                          avatar[key] === value
                            ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200'
                            : 'border-white/10 bg-[#071522] text-slate-400 hover:border-white/30'
                        }`}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="mt-5 rounded-xl bg-cyan-400/10 p-3 text-sm text-cyan-200">
                {success}
              </p>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-cyan-400 py-4 font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {saving
                ? 'Kaydediliyor...'
                : profile
                ? 'Değişiklikleri Kaydet'
                : 'Karakterimi Oluştur'}
            </button>

            {profile && (
              <Link href="/" className="mt-4 block text-center text-sm text-cyan-300 hover:underline">
                Oyuna Dön
              </Link>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
