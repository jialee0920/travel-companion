import { getAirtableConfig } from '@/lib/airtable/config';
import {
  cancelProductReservation as cancelAirtableReservation,
  createProductReservation as createAirtableReservation,
  findProductReservation as findAirtableReservation,
  listProductReservationsByUserId as listAirtableReservationsByUserId,
  type ProductReservationRecord,
  type ProductReservationStatus,
} from '@/lib/airtable/product-reservations';
import { decrementProductCount, incrementProductCount } from '@/lib/db/orders';
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

function isReservationFull(product: {
  groupBuyStatus: string;
  currentCount: number;
  targetCount: number;
}): boolean {
  return (
    product.groupBuyStatus === 'success' ||
    (product.targetCount > 0 && product.currentCount >= product.targetCount)
  );
}

export async function findUserProductReservation(
  productId: string,
  userId: string,
): Promise<ProductReservationRecord | null> {
  if (getAirtableConfig()) {
    return findAirtableReservation(productId, userId);
  }
  const row = memoryReservations.get(memoryKey(productId, userId));
  if (!row || row.status === 'cancelled') return null;
  return row;
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
      .filter((row) => row.user_id === userId && row.status !== 'cancelled')
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
}): Promise<{
  reservation: ProductReservationRecord;
  alreadyReserved: boolean;
  currentCount: number;
  targetCount: number;
}> {
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
    return {
      reservation: existing,
      alreadyReserved: true,
      currentCount: product.currentCount,
      targetCount: product.targetCount,
    };
  }

  if (isReservationFull(product)) {
    throw new ProductReservationError(
      '목표 인원이 채워져 예약이 마감되었어요.',
      400,
    );
  }

  if (getAirtableConfig()) {
    const reservation = await createAirtableReservation({
      productId: input.productId,
      userId: input.userId,
      name,
      phone,
    });
    await incrementProductCount(input.productId);
    const refreshed = await getProductById(input.productId);
    return {
      reservation,
      alreadyReserved: false,
      currentCount: refreshed?.currentCount ?? product.currentCount + 1,
      targetCount: product.targetCount,
    };
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
  return {
    reservation,
    alreadyReserved: false,
    currentCount: product.currentCount + 1,
    targetCount: product.targetCount,
  };
}

export async function cancelProductReservation(input: {
  productId: string;
  userId: string;
}): Promise<{
  reservation: ProductReservationRecord;
  currentCount: number;
  targetCount: number;
}> {
  const product = await getProductById(input.productId);
  if (!product) {
    throw new ProductReservationError('상품을 찾을 수 없습니다.', 404);
  }
  if (product.actionType !== 'reservation') {
    throw new ProductReservationError('사전 예약 상품이 아닙니다.', 400);
  }

  const existing = await findUserProductReservation(input.productId, input.userId);
  if (!existing) {
    throw new ProductReservationError('취소할 예약이 없습니다.', 404);
  }

  if (getAirtableConfig()) {
    const reservation = await cancelAirtableReservation(existing.id);
    await decrementProductCount(input.productId);
    const refreshed = await getProductById(input.productId);
    return {
      reservation,
      currentCount: refreshed?.currentCount ?? Math.max(0, product.currentCount - 1),
      targetCount: product.targetCount,
    };
  }

  const reservation: MemoryReservation = {
    ...existing,
    status: 'cancelled',
  };
  memoryReservations.set(memoryKey(input.productId, input.userId), reservation);
  return {
    reservation,
    currentCount: Math.max(0, product.currentCount - 1),
    targetCount: product.targetCount,
  };
}
