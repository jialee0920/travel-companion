/**
 * Supabase env — 새 Publishable/Secret 키 우선, legacy anon/service_role 폴백.
 * @see https://supabase.com/docs/guides/getting-started/api-keys
 */

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** 브라우저·Realtime (구 anon key) */
export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** 서버 API 전용 (구 service_role key). Vercel에만 설정, NEXT_PUBLIC 금지. */
export function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function isSupabaseAdminConfigured(): boolean {
  const url = getSupabaseUrl();
  if (!url) return false;
  return Boolean(getSupabaseSecretKey() ?? getSupabasePublishableKey());
}
