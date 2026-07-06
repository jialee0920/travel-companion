import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabasePublishableKey, getSupabaseUrl, isSupabaseConfigured } from './env';

let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserClient(): SupabaseClient<Database> | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;

  if (!browserClient) {
    browserClient = createClient<Database>(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return browserClient;
}

export { isSupabaseConfigured };
