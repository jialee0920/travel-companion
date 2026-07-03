import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function requireSupabaseAdmin(): SupabaseClient<Database> {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 및 키를 .env.local에 추가하세요.',
    );
  }
  return client;
}
