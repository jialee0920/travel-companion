/** Gathering Date (Airtable date±time) 파싱·조합·표시 */

export function splitGatheringDateTime(value: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!value?.trim()) return { date: '', time: '' };
  const raw = value.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { date: raw.slice(0, 10), time: '' };
  }

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  const date = `${y}-${m}-${d}`;

  // ISO/datetime에 시각이 있으면 로컬 시·분 추출 (날짜만이면 시간 비움)
  const hasTime = /T\d{2}:\d{2}/.test(raw) || /\d{2}:\d{2}/.test(raw.slice(10));
  if (!hasTime) return { date, time: '' };

  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  return { date, time: `${hh}:${mm}` };
}

/** 폼 입력 → Airtable 저장용 (날짜만 또는 ISO datetime) */
export function combineGatheringDateTime(
  date: string,
  time: string,
): string | null {
  const d = date.trim();
  if (!d) return null;
  const t = time.trim();
  if (!t) return d;

  const local = new Date(`${d}T${t}:00`);
  if (Number.isNaN(local.getTime())) return d;
  return local.toISOString();
}

function hasExplicitTime(value: string): boolean {
  return /T\d{2}:\d{2}/.test(value) || /\d{2}:\d{2}/.test(value.slice(10));
}

/** 카드용 — 짧은 날짜 + 시간(있으면) */
export function formatGatheringDateShort(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  const dateLabel = date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  if (!hasExplicitTime(value)) return dateLabel;

  const timeLabel = date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateLabel} ${timeLabel}`;
}

/** 상세용 — 긴 날짜 + 시간(있으면) 예: 2026년 7월 20일 (월) 오후 6:00 */
export function formatGatheringDateLong(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  const dateLabel = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  if (!hasExplicitTime(value)) return dateLabel;

  const timeLabel = date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateLabel} ${timeLabel}`;
}
