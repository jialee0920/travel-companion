import { mukhoRegion } from './mukho';
import { seoulRegion } from './seoul';

/** Internal region code → Airtable Users.Region Multiple select option label */
export const REGION_AIRTABLE_LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  [seoulRegion, mukhoRegion].map((region) => [region.code, region.name]),
);

const REGION_CODE_BY_AIRTABLE_LABEL: Record<string, string> = Object.fromEntries(
  [seoulRegion, mukhoRegion].map((region) => [region.name, region.code]),
);

export function regionCodeToAirtableLabel(code: string): string {
  const trimmed = code.trim();
  return REGION_AIRTABLE_LABEL_BY_CODE[trimmed] ?? trimmed;
}

/** Airtable label or legacy code → internal region code, or null if unknown */
export function airtableLabelToRegionCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (REGION_AIRTABLE_LABEL_BY_CODE[trimmed]) return trimmed;
  if (REGION_CODE_BY_AIRTABLE_LABEL[trimmed]) return REGION_CODE_BY_AIRTABLE_LABEL[trimmed];
  return null;
}

/** Internal codes → Airtable Multiple select labels (deduped, REGION_OPTIONS order) */
export function regionCodesToAirtableLabels(codes: string[]): string[] {
  const order = [seoulRegion, mukhoRegion].map((region) => region.name);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const code of codes) {
    const label = REGION_AIRTABLE_LABEL_BY_CODE[code.trim()];
    if (!label || seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }

  return result.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** Airtable write payload for Region — omit when empty */
export function buildAirtableRegionField(codes: string[]): string[] | undefined {
  const labels = regionCodesToAirtableLabels(codes);
  return labels.length > 0 ? labels : undefined;
}
