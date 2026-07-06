import { normalizePhone } from '@/lib/user-profile';
import { createRecord, escapeAirtableFormula, listRecords, updateRecord } from './client';
import { requireAirtableConfig } from './config';

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

type OrderFields = {
  'Order Code': string;
  'User ID'?: string;
  'Product ID': string;
  'Product Name': string;
  'Participant Name': string;
  'Participant Phone': string;
  Region: string;
  Amount: number;
  'Payment Status': string;
  'Imp UID'?: string;
  'Merchant UID'?: string;
};

function mapOrder(record: { id: string; createdTime?: string; fields: OrderFields }): OrderRecord {
  return {
    id: record.id,
    order_code: record.fields['Order Code'],
    profile_id: record.fields['User ID'] ?? null,
    product_id: record.fields['Product ID'],
    product_name: record.fields['Product Name'],
    participant_name: record.fields['Participant Name'],
    participant_phone: record.fields['Participant Phone'],
    region: record.fields.Region,
    amount: record.fields.Amount,
    payment_status: record.fields['Payment Status'] as OrderRecord['payment_status'],
    imp_uid: record.fields['Imp UID'] ?? null,
    merchant_uid: record.fields['Merchant UID'] ?? null,
    created_at: record.createdTime ?? new Date().toISOString(),
  };
}

function toFields(order: Omit<OrderRecord, 'id' | 'created_at'>): OrderFields {
  return {
    'Order Code': order.order_code,
    'User ID': order.profile_id ?? undefined,
    'Product ID': order.product_id,
    'Product Name': order.product_name,
    'Participant Name': order.participant_name,
    'Participant Phone': order.participant_phone,
    Region: order.region,
    Amount: order.amount,
    'Payment Status': order.payment_status,
    'Imp UID': order.imp_uid ?? undefined,
    'Merchant UID': order.merchant_uid ?? undefined,
  };
}

export async function saveOrder(
  order: Omit<OrderRecord, 'id' | 'created_at'>,
): Promise<OrderRecord> {
  const config = requireAirtableConfig();
  const created = await createRecord<OrderFields>(config.ordersTable, toFields(order));
  return mapOrder(created);
}

export async function updateOrderPayment(
  merchantUid: string,
  patch: Partial<Pick<OrderRecord, 'payment_status' | 'imp_uid' | 'profile_id'>>,
): Promise<OrderRecord | null> {
  const config = requireAirtableConfig();
  const formula = `{Merchant UID}="${escapeAirtableFormula(merchantUid)}"`;
  const records = await listRecords<OrderFields>(config.ordersTable, {
    filterByFormula: formula,
    maxRecords: 1,
  });

  const record = records[0];
  if (!record) return null;

  const fields: Partial<OrderFields> = {};
  if (patch.payment_status) fields['Payment Status'] = patch.payment_status;
  if (patch.imp_uid !== undefined) fields['Imp UID'] = patch.imp_uid ?? undefined;
  if (patch.profile_id !== undefined) fields['User ID'] = patch.profile_id ?? undefined;

  const updated = await updateRecord<OrderFields>(config.ordersTable, record.id, fields);
  return mapOrder(updated);
}

export async function listOrders(): Promise<OrderRecord[]> {
  const config = requireAirtableConfig();
  const records = await listRecords<OrderFields>(config.ordersTable, {});
  return records
    .map(mapOrder)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function listOrdersByProfileId(profileId: string): Promise<OrderRecord[]> {
  const config = requireAirtableConfig();
  const formula = `{User ID}="${escapeAirtableFormula(profileId)}"`;
  const records = await listRecords<OrderFields>(config.ordersTable, {
    filterByFormula: formula,
  });
  return records
    .map(mapOrder)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function listOrdersByPhone(phone: string): Promise<OrderRecord[]> {
  const normalized = normalizePhone(phone);
  const orders = await listOrders();
  return orders.filter((o) => normalizePhone(o.participant_phone) === normalized);
}
