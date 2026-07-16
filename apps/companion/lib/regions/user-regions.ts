import { airtableLabelToRegionCode } from './airtable-regions';
import { DEFAULT_REGION_CODE, getRegionDisplayName, isKnownRegionCode, REGION_OPTIONS } from './index';

function resolveStoredRegionValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const fromLabel = airtableLabelToRegionCode(trimmed);
  if (fromLabel) return fromLabel;
  if (isKnownRegionCode(trimmed)) return trimmed;
  return null;
}

/** Airtable Region 필드(단일/복수, 라벨 또는 레거시 코드) → 정규화된 지역 코드 배열 */
export function parseUserRegions(value: unknown): string[] {
  if (Array.isArray(value)) {
    const codes = value
      .filter((v): v is string => typeof v === 'string')
      .map(resolveStoredRegionValue)
      .filter((code): code is string => code != null);
    return normalizeUserRegions(codes);
  }
  if (typeof value === 'string' && value.trim()) {
    const code = resolveStoredRegionValue(value);
    return code ? normalizeUserRegions([code]) : [];
  }
  return [];
}

/** 알려진 코드만 유지, 중복 제거, UI 표시 순서 정렬 */
export function normalizeUserRegions(codes: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const code of codes) {
    const trimmed = code.trim();
    if (!trimmed || !isKnownRegionCode(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  const order = REGION_OPTIONS.map((option) => option.code);
  return result.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** 채팅·세션 등 단일 region이 필요할 때 첫 번째 활동 지역 */
export function primaryRegion(regions: string[]): string {
  return normalizeUserRegions(regions)[0] ?? DEFAULT_REGION_CODE;
}

export function formatRegionsDisplay(regions: string[]): string {
  const normalized = normalizeUserRegions(regions);
  if (normalized.length === 0) return '';
  return normalized.map(getRegionDisplayName).join(' · ');
}

export function regionsEqual(a: string[], b: string[]): boolean {
  const left = normalizeUserRegions(a);
  const right = normalizeUserRegions(b);
  if (left.length !== right.length) return false;
  return left.every((code, index) => code === right[index]);
}
