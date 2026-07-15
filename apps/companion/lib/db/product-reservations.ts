import { getAirtableConfig } from '@/lib/airtable/config';
import {
  createProductReservation as createAirtableReservation,
  findProductReservation as findAirtableReservation,
  listProductReservationsByUserId as listAirtableReservationsByUserId,
  type ProductReservationRecord,
  type ProductReservationStatus,
} from '@/lib/airtable/product-reservations';
import { getProductById } from '@/lib/db/products';
import { normalizePhone } from '@/lib/user-profile';

export type { ProductReservationRecord, ProductReservationStatus };

export type MyProductReservationItem = ProductReservationRecord & {
  product_name: string;
};

export class ProductReservationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ProductReservationError';
    this.status = status;
  }
}

type MemoryReservation = ProductReservationRecord;

const memoryReservations = new Map<string, MemoryReservation>();

function memoryKey(productId: string, userId: string) {
  return `${productId}:${userId}`;
}

export async function findUserProductReservation(
  productId: string,
  userId: string,
): Promise<ProductReservationRecord | null> {
  if (getAirtableConfig()) {
    return findAirtableReservation(productId, userId);
  }
  return memoryReservations.get(memoryKey(productId, userId)) ?? null;
}

async function withProductNames(
  rows: ProductReservationRecord[],
): Promise<MyProductReservationItem[]> {
  const uniqueIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))];
  const products = await Promise.all(uniqueIds.map((id) => getProductById(id)));
  const nameById = new Map(
    uniqueIds.map((id, i) => [id, products[i]?.name?.trim() || '상품']),
  );

  return rows.map((row) => ({
    ...row,
    product_name: nameById.get(row.product_id) || '상품',
  }));
}

export async function listReservationsByUserId(
  userId: string,
): Promise<MyProductReservationItem[]> {
  let rows: ProductReservationRecord[];
  if (getAirtableConfig()) {
    rows = await listAirtableReservationsByUserId(userId);
  } else {
    rows = [...memoryReservations.values()]
      .filter((row) => row.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime(),
      );
  }
  return withProductNames(rows);
}

export async function reserveProduct(input: {
  productId: string;
  userId: string;
  name: string;
  phone: string;
}): Promise<{ reservation: ProductReservationRecord; alreadyReserved: boolean }> {
  const product = await getProductById(input.productId);
  if (!product) {
    throw new ProductReservationError('상품을 찾을 수 없습니다.', 404);
  }
  if (product.actionType !== 'reservation') {
    throw new ProductReservationError('사전 예약이 가능한 상품이 아닙니다.', 400);
  }
  if (product.groupBuyStatus === 'preparing') {
    throw new ProductReservationError('곧 만나요! 준비중인 상품이에요.', 400);
  }
  if (product.groupBuyStatus === 'closed') {
    throw new ProductReservationError('예약이 마감된 상품입니다.', 400);
  }

  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (!name || !phone) {
    throw new ProductReservationError('이름과 연락처가 필요합니다.', 400);
  }

  const existing = await findUserProductReservation(input.productId, input.userId);
  if (existing) {
    return { reservation: existing, alreadyReserved: true };
  }

  if (getAirtableConfig()) {
    const reservation = await createAirtableReservation({
      productId: input.productId,
      userId: input.userId,
      name,
      phone,
    });
    return { reservation, alreadyReserved: false };
  }

  const reservation: MemoryReservation = {
    id: `mem_${crypto.randomUUID()}`,
    product_id: input.productId,
    user_id: input.userId,
    name,
    phone,
    status: 'reserved',
    reserved_at: new Date().toISOString(),
  };
  memoryReservations.set(memoryKey(input.productId, input.userId), reservation);
  return { reservation, alreadyReserved: false };
}
