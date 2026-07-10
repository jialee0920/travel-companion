import { mukhoRegion } from './mukho';
import { seoulRegion } from './seoul';
import type { RegionConfig } from './types';

/**
 * 서비스 지역 목록 (UI 표시 순서).
 * 새 지역 추가: 1) regions/{code}.ts 작성 2) 이 배열에 push
 */
const REGION_LIST: RegionConfig[] = [seoulRegion, mukhoRegion];

const REGIONS: Record<string, RegionConfig> = Object.fromEntries(
  REGION_LIST.map((region) => [region.code, region]),
);

/** 기본 서비스 지역. 조회 필터는 lib/region-filter.ts 참고 */
export const DEFAULT_REGION_CODE = 'mukho';

/** 프로필 등 UI용 지역 선택 옵션 */
export const REGION_OPTIONS: { code: string; name: string }[] = REGION_LIST.map((region) => ({
  code: region.code,
  name: region.name,
}));

export function isKnownRegionCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGIONS, code);
}

export function getRegion(code: string = DEFAULT_REGION_CODE): RegionConfig {
  const region = REGIONS[code];
  if (!region) {
    throw new Error(`Unknown region: ${code}`);
  }
  return region;
}

/** 알 수 없는 코드면 코드 문자열 그대로 반환 */
export function getRegionDisplayName(code: string): string {
  return REGIONS[code]?.name ?? code;
}

export function getAllRegions(): RegionConfig[] {
  return [...REGION_LIST];
}

export function getProductById(productId: string, regionCode = DEFAULT_REGION_CODE) {
  return getRegion(regionCode).products.find((p) => p.id === productId) ?? null;
}

export { mukhoRegion, seoulRegion };
export type * from './types';
