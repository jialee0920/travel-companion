/** Image URL이 없을 때 상품 상세·목록에 쓰는 기본 이미지 */
export const PRODUCT_PLACEHOLDER_IMAGE = '/product-placeholder.svg';

export function resolveProductImageUrl(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : PRODUCT_PLACEHOLDER_IMAGE;
}

/**
 * Airtable Discount Rate는 퍼센트(40 = 40%) 또는 소수(0.4 = 40%)로 저장될 수 있음.
 * 내부 계산·표시는 항상 0~1 소수 비율로 통일한다.
 */
export function normalizeDiscountRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  if (rate > 1) return Math.min(rate / 100, 1);
  return rate;
}

export function formatDiscountPercent(discountRate: number): number {
  return Math.round(normalizeDiscountRate(discountRate) * 100);
}
