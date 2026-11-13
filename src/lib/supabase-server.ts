import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | null = null;

/** Service-role istemci: RLS'i aşar, SADECE sunucuda kullanılır. */
export function admin(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
