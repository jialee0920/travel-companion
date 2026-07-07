import { mukhoRegion } from './mukho';
import type { RegionConfig } from './types';

const REGIONS: Record<string, RegionConfig> = {
  [mukhoRegion.code]: mukhoRegion,
};

/** 기본 서비스 지역 (추후 region 코드만 추가하면 확장 가능). 조회 필터는 lib/region-filter.ts 참고 */
export const DEFAULT_REGION_CODE = 'mukho';

export function getRegion(code: string = DEFAULT_REGION_CODE): RegionConfig {
  const region = REGIONS[code];
  if (!region) {
    throw new Error(`Unknown region: ${code}`);
  }
  return region;
}

export function getAllRegions(): RegionConfig[] {
  return Object.values(REGIONS);
}

export function getProductById(productId: string, regionCode = DEFAULT_REGION_CODE) {
  return getRegion(regionCode).products.find((p) => p.id === productId) ?? null;
}

export { mukhoRegion };
export type * from './types';
