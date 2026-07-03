import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/user-profile';

export type OrderRecord = {
  id: string;
  order_code: string;
  profile_id?: string | null;
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
  profile_id?: string | null;
  product_id: string;
  display_name: string;
  order_code: string;
  created_at: string;
};

const memoryOrders: OrderRecord[] = [];
const memoryParticipants: ParticipantRecord[] = [];

export async function saveOrder(
  order: Omit<OrderRecord, 'id' | 'created_at'>,
): Promise<OrderRecord> {
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
  patch: Partial<Pick<OrderRecord, 'payment_status' | 'imp_uid' | 'profile_id'>>,
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

export async function listOrdersByPhone(phone: string): Promise<OrderRecord[]> {
  const normalized = normalizePhone(phone);
  const orders = await listOrders();
  return orders.filter((o) => normalizePhone(o.participant_phone) === normalized);
}

export async function listOrdersByProfileId(profileId: string): Promise<OrderRecord[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderRecord[];
  }
  return memoryOrders.filter((o) => o.profile_id === profileId);
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

  const nextCount = (product.current_count as number) + 1;
  const status = nextCount >= (product.target_count as number) ? 'success' : 'open';

  await supabase
    .from('products')
    .update({ current_count: nextCount, group_buy_status: status })
    .eq('id', productId);
}
