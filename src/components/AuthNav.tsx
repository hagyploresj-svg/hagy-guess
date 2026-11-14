
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase-browser";

export default function AuthNav() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const supabase = browserSupabase();

    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProfile(userId: string) {
      const { data } = await supabase!
        .from("user_profiles")
        .select("display_name, username")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;

      setDisplayName(
        data?.display_name || data?.username || "Oyuncu"
      );
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      const user = data.user;
      setLoggedIn(!!user);
      setLoading(false);

      if (user) {
        void loadProfile(user.id);
      }
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;

        const user = session?.user;
        setLoggedIn(!!user);

        if (user) {
          void loadProfile(user.id);
        } else {
          setDisplayName("");
        }

        setLoading(false);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const supabase = browserSupabase();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (!error) {
      setLoggedIn(false);
      setDisplayName("");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-400">
        Yükleniyor...
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <nav className="flex items-center gap-2">
        <Link
          href="/auth"
          className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 sm:px-5 sm:text-sm"
        >
          Giriş Yap
        </Link>
        <Link
          href="/auth"
          className="rounded-xl bg-cyan-300 px-3 py-2.5 text-xs font-black text-slate-950 hover:bg-cyan-200 sm:px-5 sm:text-sm"
        >
          Kayıt Ol
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link
        href="/profile"
        className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-300/20 sm:text-sm"
      >
        👤 {displayName || "Profilim"}
      </Link>

      <button
        type="button"
        onClick={logout}
        className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
      >
        Çıkış Yap
      </button>
    </nav>
  );
}
