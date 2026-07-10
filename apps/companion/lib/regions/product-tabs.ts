import { mukhoRegion } from './mukho';
import { seoulRegion } from './seoul';
import type { RegionConfig } from './types';

/** Airtable Products.Region — 지역 무관(온라인 배송 등) */
export const NATIONAL_PRODUCT_REGION = 'national';

export const DEFAULT_PRODUCT_REGION_TAB = 'all';

/**
 * 공동구매 지역 탭에 노출할 서비스 지역 (표시 순서).
 * 새 지역 탭 추가: 1) regions/{code}.ts 작성 2) 이 배열에 push
 */
const PRODUCT_TAB_REGIONS: RegionConfig[] = [mukhoRegion, seoulRegion];

export type ProductRegionTabId = 'all' | typeof NATIONAL_PRODUCT_REGION | string;

export const PRODUCT_REGION_TABS: { id: ProductRegionTabId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: NATIONAL_PRODUCT_REGION, label: '전국' },
  ...PRODUCT_TAB_REGIONS.map((region) => ({
    id: region.code,
    label: region.name,
  })),
];

export function filterProductsByRegionTab<T extends { region: string }>(
  products: T[],
  tab: ProductRegionTabId,
): T[] {
  if (tab === 'all') return products;
  return products.filter((product) => product.region === tab);
}
