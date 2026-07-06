import { getAirtableConfig } from '@/lib/airtable/config';
import {
  addParticipant as addAirtableParticipant,
  listParticipants as listAirtableParticipants,
  type ParticipantRecord,
} from '@/lib/airtable/participants';
import {
  incrementProductCount as incrementAirtableProductCount,
} from '@/lib/airtable/products';
import {
  listOrders as listAirtableOrders,
  listOrdersByPhone as listAirtableOrdersByPhone,
  listOrdersByProfileId as listAirtableOrdersByProfileId,
  saveOrder as saveAirtableOrder,
  updateOrderPayment as updateAirtableOrderPayment,
  type OrderRecord,
} from '@/lib/airtable/orders';
import { normalizePhone } from '@/lib/user-profile';

export type { OrderRecord, ParticipantRecord };

const memoryOrders: OrderRecord[] = [];
const memoryParticipants: ParticipantRecord[] = [];

export async function saveOrder(
  order: Omit<OrderRecord, 'id' | 'created_at'>,
): Promise<OrderRecord> {
  if (getAirtableConfig()) {
    return saveAirtableOrder(order);
  }

  const row: OrderRecord = {
    ...order,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  memoryOrders.unshift(row);
  return row;
}

export async function updateOrderPayment(
  merchantUid: string,
  patch: Partial<Pick<OrderRecord, 'payment_status' | 'imp_uid' | 'profile_id'>>,
): Promise<OrderRecord | null> {
  if (getAirtableConfig()) {
    return updateAirtableOrderPayment(merchantUid, patch);
  }

  const idx = memoryOrders.findIndex((o) => o.merchant_uid === merchantUid);
  if (idx < 0) return null;
  memoryOrders[idx] = { ...memoryOrders[idx], ...patch };
  return memoryOrders[idx];
}

export async function listOrders(): Promise<OrderRecord[]> {
  if (getAirtableConfig()) {
    return listAirtableOrders();
  }
  return [...memoryOrders];
}

export async function listOrdersByPhone(phone: string): Promise<OrderRecord[]> {
  if (getAirtableConfig()) {
    return listAirtableOrdersByPhone(phone);
  }
  const normalized = normalizePhone(phone);
  return memoryOrders.filter((o) => normalizePhone(o.participant_phone) === normalized);
}

export async function listOrdersByProfileId(profileId: string): Promise<OrderRecord[]> {
  if (getAirtableConfig()) {
    return listAirtableOrdersByProfileId(profileId);
  }
  return memoryOrders.filter((o) => o.profile_id === profileId);
}

export async function addParticipant(
  participant: Omit<ParticipantRecord, 'id' | 'created_at'>,
): Promise<ParticipantRecord> {
  if (getAirtableConfig()) {
    return addAirtableParticipant(participant);
  }

  const row: ParticipantRecord = {
    ...participant,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  memoryParticipants.unshift(row);
  return row;
}

export async function listParticipants(productId: string): Promise<ParticipantRecord[]> {
  if (getAirtableConfig()) {
    return listAirtableParticipants(productId);
  }
  return memoryParticipants.filter((p) => p.product_id === productId);
}

export async function incrementProductCount(productId: string): Promise<void> {
  if (getAirtableConfig()) {
    await incrementAirtableProductCount(productId);
    return;
  }
}
