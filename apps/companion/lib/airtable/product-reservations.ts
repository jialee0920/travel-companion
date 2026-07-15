import {
  createRecord,
  escapeAirtableFormula,
  listRecords,
} from './client';
import { requireAirtableConfig } from './config';
import { normalizePhone } from '@/lib/user-profile';

export type ProductReservationStatus = 'reserved' | 'notified' | 'completed';

export type AirtableProductReservationFields = {
  'Product ID'?: string;
  'User ID'?: string;
  Name?: string;
  Phone?: string;
  Status?: ProductReservationStatus;
  'Reserved At'?: string;
};

export type ProductReservationRecord = {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  phone: string;
  status: ProductReservationStatus;
  reserved_at: string;
};

function parseStatus(value: unknown): ProductReservationStatus {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return 'reserved';
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'notified' || normalized === 'completed') {
    return normalized;
  }
  return 'reserved';
}

function mapReservation(record: {
  id: string;
  createdTime?: string;
  fields: AirtableProductReservationFields;
}): ProductReservationRecord {
  return {
    id: record.id,
    product_id: record.fields['Product ID']?.trim() || '',
    user_id: record.fields['User ID']?.trim() || '',
    name: record.fields.Name?.trim() || '',
    phone: record.fields.Phone?.trim() || '',
    status: parseStatus(record.fields.Status),
    reserved_at:
      record.fields['Reserved At']?.trim() ||
      record.createdTime ||
      new Date().toISOString(),
  };
}

/** 동일 상품·유저의 기존 예약 (status 무관 — 재예약 방지) */
export async function findProductReservation(
  productId: string,
  userId: string,
): Promise<ProductReservationRecord | null> {
  const config = requireAirtableConfig();
  const formula = `AND({Product ID}="${escapeAirtableFormula(productId)}",{User ID}="${escapeAirtableFormula(userId)}")`;
  const records = await listRecords<AirtableProductReservationFields>(
    config.productReservationsTable,
    { filterByFormula: formula, maxRecords: 1 },
  );
  if (records.length === 0) return null;
  return mapReservation(records[0]);
}

export async function listProductReservationsByUserId(
  userId: string,
): Promise<ProductReservationRecord[]> {
  const config = requireAirtableConfig();
  const formula = `{User ID}="${escapeAirtableFormula(userId)}"`;
  const records = await listRecords<AirtableProductReservationFields>(
    config.productReservationsTable,
    { filterByFormula: formula },
  );
  return records
    .map(mapReservation)
    .sort(
      (a, b) =>
        new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime(),
    );
}

export async function createProductReservation(input: {
  productId: string;
  userId: string;
  name: string;
  phone: string;
}): Promise<ProductReservationRecord> {
  const config = requireAirtableConfig();
  const reservedAt = new Date().toISOString();
  const created = await createRecord<AirtableProductReservationFields>(
    config.productReservationsTable,
    {
      'Product ID': input.productId,
      'User ID': input.userId,
      Name: input.name.trim(),
      Phone: normalizePhone(input.phone),
      Status: 'reserved',
      'Reserved At': reservedAt,
    },
    { typecast: true },
  );
  return mapReservation(created);
}
