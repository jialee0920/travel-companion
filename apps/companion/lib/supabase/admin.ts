import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from './env';

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey() ?? getSupabasePublishableKey();
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
      'Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY를 설정하세요.',
    );
  }
  return client;
}

export { isSupabaseAdminConfigured };
