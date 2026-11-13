import 'server-only';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Eksik ortam değişkeni: ${name}`);
  return v;
}

export const env = {
  get mapillaryToken() { return req('MAPILLARY_TOKEN'); },
  get roundSecret() { return req('ROUND_SECRET'); },
  get supabaseUrl() { return req('NEXT_PUBLIC_SUPABASE_URL'); },
  get serviceKey() { return req('SUPABASE_SERVICE_ROLE_KEY'); },
};
