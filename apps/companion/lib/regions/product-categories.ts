/** 공동구매 Products.Category 필터 */

export type ProductCategoryId = 'beauty' | 'supplement' | 'social';

export type ProductCategoryTabId = 'all' | ProductCategoryId;

export const DEFAULT_PRODUCT_CATEGORY_TAB: ProductCategoryTabId = 'all';

export const PRODUCT_CATEGORY_TABS: {
  id: ProductCategoryTabId;
  label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'beauty', label: '뷰티' },
  { id: 'supplement', label: '영양제' },
  { id: 'social', label: '소셜링' },
];

const PRODUCT_CATEGORY_IDS = new Set<string>(['beauty', 'supplement', 'social']);

/** Airtable Category 값을 정규화 (미지/빈 값은 null) */
export function parseProductCategory(value: unknown): ProductCategoryId | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  if (PRODUCT_CATEGORY_IDS.has(normalized)) {
    return normalized as ProductCategoryId;
  }
  return null;
}

export function filterByProductCategory<T extends { category: string }>(
  items: T[],
  tab: ProductCategoryTabId,
): T[] {
  if (tab === 'all') return items;
  return items.filter((item) => {
    const parsed = parseProductCategory(item.category);
    return parsed === tab;
  });
}
