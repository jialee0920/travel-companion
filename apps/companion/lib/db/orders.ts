import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type OrderRecord = {
  id: string;
  order_code: string;
  product_id: string;
  product_name: string;
  participant_name: string;
  participant_phone: string;
  region: string;
  amount: number;
  payment_status: 'pending' | 'paid' | 'failed';
  imp_uid?: string | null;
  merchant_uid?: string | null;
  created_at: string;
};

export type ParticipantRecord = {
  id: string;
  product_id: string;
  display_name: string;
  order_code: string;
  created_at: string;
};

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabaseAdmin;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/** Supabase 미설정 시 빌드·데모용 인메모리 저장 */
const memoryOrders: OrderRecord[] = [];
const memoryParticipants: ParticipantRecord[] = [];

export async function saveOrder(order: Omit<OrderRecord, 'id' | 'created_at'>): Promise<OrderRecord> {
  const supabase = getSupabaseAdmin();
  const row = {
    ...order,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase.from('orders').insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as OrderRecord;
  }

  memoryOrders.unshift(row);
  return row;
}

export async function updateOrderPayment(
  merchantUid: string,
  patch: Partial<Pick<OrderRecord, 'payment_status' | 'imp_uid'>>,
): Promise<OrderRecord | null> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('merchant_uid', merchantUid)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as OrderRecord;
  }

  const idx = memoryOrders.findIndex((o) => o.merchant_uid === merchantUid);
  if (idx < 0) return null;
  memoryOrders[idx] = { ...memoryOrders[idx], ...patch };
  return memoryOrders[idx];
}

export async function listOrders(): Promise<OrderRecord[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderRecord[];
  }
  return [...memoryOrders];
}

export async function addParticipant(
  participant: Omit<ParticipantRecord, 'id' | 'created_at'>,
): Promise<ParticipantRecord> {
  const supabase = getSupabaseAdmin();
  const row = {
    ...participant,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase.from('participants').insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as ParticipantRecord;
  }

  memoryParticipants.unshift(row);
  return row;
}

export async function listParticipants(productId: string): Promise<ParticipantRecord[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ParticipantRecord[];
  }
  return memoryParticipants.filter((p) => p.product_id === productId);
}

export async function incrementProductCount(productId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: product } = await supabase
    .from('products')
    .select('current_count, target_count')
    .eq('id', productId)
    .single();

  if (!product) return;

  const nextCount = (product.current_count ?? 0) + 1;
  const status = nextCount >= product.target_count ? 'success' : 'open';

  await supabase
    .from('products')
    .update({ current_count: nextCount, group_buy_status: status })
    .eq('id', productId);
}
