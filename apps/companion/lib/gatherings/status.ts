import type { GatheringRecord } from '@/lib/db/gatherings';

export type GatheringStatusBadge = '모집완료' | '마감임박';

export function isGatheringRecruitmentClosed(gathering: GatheringRecord): boolean {
  return gathering.status === 'closed' || gathering.current_count >= gathering.target_count;
}

/** 1행 상태 뱃지 — 해당 없으면 null */
export function getGatheringStatusBadge(
  gathering: GatheringRecord,
): GatheringStatusBadge | null {
  if (isGatheringRecruitmentClosed(gathering)) return '모집완료';

  const spotsLeft = gathering.target_count - gathering.current_count;
  if (gathering.status === 'open' && spotsLeft <= 1) return '마감임박';

  return null;
}

/** 4행 모집 상태 텍스트 */
export function getGatheringRecruitLabel(gathering: GatheringRecord): string {
  return isGatheringRecruitmentClosed(gathering) ? '모집완료' : '모집중';
}
