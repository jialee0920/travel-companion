import { DEFAULT_REGION_CODE } from '@/lib/regions';

/**
 * 다지역 확장 시 Airtable 조회·전화번호 중복 판별에 Region 조건을 켤 수 있는 스위치.
 *
 * ENABLE_REGION_FILTER=false (기본) → Region 조건 없이 조회
 * ENABLE_REGION_FILTER=true          → {Region}="mukho" 등 Region 필터 적용
 *
 * 신규 레코드의 Region 필드 저장값은 필터 on/off와 무관하게 defaultRegionCode() 사용.
 */
export function isRegionFilterEnabled(): boolean {
  const raw = process.env.ENABLE_REGION_FILTER?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

/** Airtable·세션 등에 저장할 기본 Region 코드 */
export function defaultRegionCode(): string {
  return DEFAULT_REGION_CODE;
}

/** API/클라이언트에서 받은 region → DB 저장용 코드 (미입력 시 defaultRegionCode) */
export function resolveRegionForStorage(explicit?: string | null): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  return defaultRegionCode();
}

/** listRecords filterByFormula — Region 절 (필터 OFF면 undefined) */
export function airtableRegionFormula(
  regionCode: string,
  escape: (value: string) => string,
): string | undefined {
  if (!isRegionFilterEnabled()) return undefined;
  return `{Region}="${escape(regionCode)}"`;
}

export function airtableAndFormula(...parts: Array<string | undefined>): string | undefined {
  const clauses = parts.filter((part): part is string => Boolean(part));
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return `AND(${clauses.join(',')})`;
}
