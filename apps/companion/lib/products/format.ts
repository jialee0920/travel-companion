/** Image URL이 없을 때 상품 상세·목록에 쓰는 기본 이미지 */
export const PRODUCT_PLACEHOLDER_IMAGE = '/product-placeholder.svg';

export function resolveProductImageUrl(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : PRODUCT_PLACEHOLDER_IMAGE;
}

/** Airtable Discount Rate 정수(37 = 37%)를 % 배지용 숫자로 반환 */
export function formatDiscountPercent(discountRate: number): number {
  if (!Number.isFinite(discountRate) || discountRate <= 0) return 0;
  if (discountRate >= 1) return Math.round(discountRate);
  return Math.round(discountRate * 100);
}
