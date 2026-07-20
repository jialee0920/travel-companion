/** Airtable Quantity 필드 — 정수, 최소 1 */
export function parseOrderQuantity(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 1;
  return n;
}

/** 목표 대비 남은 구매 가능 물량 */
export function remainingGroupBuyQuantity(
  targetCount: number,
  currentCount: number,
): number {
  if (targetCount <= 0) return 0;
  return Math.max(0, targetCount - currentCount);
}

export function clampOrderQuantity(quantity: number, remaining: number): number {
  if (remaining <= 0) return 1;
  return Math.min(Math.max(1, quantity), remaining);
}

export function isGroupBuyQuantityFull(product: {
  groupBuyStatus: string;
  currentCount: number;
  targetCount: number;
}): boolean {
  return (
    product.groupBuyStatus === 'success' ||
    (product.targetCount > 0 && product.currentCount >= product.targetCount)
  );
}

export function formatGroupBuyProgress(current: number, target: number): string {
  return `${current} / ${target}개`;
}

export function formatGroupBuySummary(target: number, current: number): string {
  return `목표 ${target}개 · 현재 ${current}개`;
}

export function totalCharge(unitCharge: number, quantity: number): number {
  return unitCharge * parseOrderQuantity(quantity);
}

export class GroupBuyQuantityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'GroupBuyQuantityError';
    this.status = status;
  }
}

export function assertGroupBuyQuantityAvailable(
  product: {
    groupBuyStatus: string;
    currentCount: number;
    targetCount: number;
  },
  quantity: number,
): void {
  const qty = parseOrderQuantity(quantity);
  if (isGroupBuyQuantityFull(product)) {
    throw new GroupBuyQuantityError('목표 물량이 채워져 마감되었어요.');
  }
  const remaining = remainingGroupBuyQuantity(product.targetCount, product.currentCount);
  if (qty > remaining) {
    throw new GroupBuyQuantityError(`남은 물량은 ${remaining}개입니다.`);
  }
}
