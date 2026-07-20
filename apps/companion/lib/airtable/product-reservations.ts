import {
  createRecord,
  escapeAirtableFormula,
  listRecords,
  updateRecord,
} from './client';
import { requireAirtableConfig } from './config';
import { parseOrderQuantity } from '@/lib/group-buy/quantity';
import { normalizePhone } from '@/lib/user-profile';

export type ProductReservationStatus =
  | 'reserved'
  | 'notified'
  | 'completed'
  | 'cancelled';

export type AirtableProductReservationFields = {
  'Product ID'?: string;
  'User ID'?: string;
  Name?: string;
  Phone?: string;
  Quantity?: number;
  Status?: ProductReservationStatus;
  'Reserved At'?: string;
};

export type ProductReservationRecord = {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  phone: string;
  quantity: number;
  status: ProductReservationStatus;
  reserved_at: string;
};

function parseStatus(value: unknown): ProductReservationStatus {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return 'reserved';
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'notified' ||
    normalized === 'completed' ||
    normalized === 'cancelled'
  ) {
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
    quantity: parseOrderQuantity(record.fields.Quantity),
    status: parseStatus(record.fields.Status),
    reserved_at:
      record.fields['Reserved At']?.trim() ||
      record.createdTime ||
      new Date().toISOString(),
  };
}

function isActiveStatus(status: ProductReservationStatus): boolean {
  return status !== 'cancelled';
}

/** 동일 상품·유저의 유효 예약 (cancelled 제외) */
export async function findProductReservation(
  productId: string,
  userId: string,
): Promise<ProductReservationRecord | null> {
  const config = requireAirtableConfig();
  const formula = `AND({Product ID}="${escapeAirtableFormula(productId)}",{User ID}="${escapeAirtableFormula(userId)}",NOT({Status}="cancelled"))`;
  const records = await listRecords<AirtableProductReservationFields>(
    config.productReservationsTable,
    { filterByFormula: formula, maxRecords: 1 },
  );
  if (records.length === 0) return null;
  return mapReservation(records[0]);
}

/** 내 공동구매용 — cancelled 제외 */
export async function listProductReservationsByUserId(
  userId: string,
): Promise<ProductReservationRecord[]> {
  const config = requireAirtableConfig();
  const formula = `AND({User ID}="${escapeAirtableFormula(userId)}",NOT({Status}="cancelled"))`;
  const records = await listRecords<AirtableProductReservationFields>(
    config.productReservationsTable,
    { filterByFormula: formula },
  );
  return records
    .map(mapReservation)
    .filter((row) => isActiveStatus(row.status))
    .sort(
      (a, b) =>
        new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime(),
    );
}

/** 공동구매 물량 합산용 — cancelled 제외 */
export async function listActiveReservationsByProductId(
  productId: string,
): Promise<ProductReservationRecord[]> {
  const config = requireAirtableConfig();
  const formula = `AND({Product ID}="${escapeAirtableFormula(productId)}",NOT({Status}="cancelled"))`;
  const records = await listRecords<AirtableProductReservationFields>(
    config.productReservationsTable,
    { filterByFormula: formula },
  );
  return records.map(mapReservation).filter((row) => isActiveStatus(row.status));
}

export async function createProductReservation(input: {
  productId: string;
  userId: string;
  name: string;
  phone: string;
  quantity: number;
}): Promise<ProductReservationRecord> {
  const config = requireAirtableConfig();
  const reservedAt = new Date().toISOString();
  const quantity = parseOrderQuantity(input.quantity);
  const created = await createRecord<AirtableProductReservationFields>(
    config.productReservationsTable,
    {
      'Product ID': input.productId,
      'User ID': input.userId,
      Name: input.name.trim(),
      Phone: normalizePhone(input.phone),
      Quantity: quantity,
      Status: 'reserved',
      'Reserved At': reservedAt,
    },
    { typecast: true },
  );
  return mapReservation(created);
}

export async function cancelProductReservation(
  reservationId: string,
): Promise<ProductReservationRecord> {
  const config = requireAirtableConfig();
  const updated = await updateRecord<AirtableProductReservationFields>(
    config.productReservationsTable,
    reservationId,
    { Status: 'cancelled' },
    { typecast: true },
  );
  return mapReservation(updated);
}
