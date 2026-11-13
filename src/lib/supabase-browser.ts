import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Tarayıcı istemcisi (anon key). Yalnızca Realtime ile rooms/players değişikliklerini dinler. */
export function browserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { realtime: { params: { eventsPerSecond: 5 } } });
  return client;
}
