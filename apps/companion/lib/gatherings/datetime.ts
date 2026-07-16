/** Gathering Date — 항상 한국 시간(KST, Asia/Seoul) 기준으로 저장·표시 */

const KST = 'Asia/Seoul';

function hasExplicitTime(value: string): boolean {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  return /T\d{2}:\d{2}/.test(raw) || /\d{2}:\d{2}/.test(raw.slice(10));
}

function kstParts(date: Date): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

export function splitGatheringDateTime(value: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!value?.trim()) return { date: '', time: '' };
  const raw = value.trim();

  // 날짜만 (YYYY-MM-DD) — 타임존 변환 없이 그대로
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { date: raw, time: '' };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { date: raw.slice(0, 10), time: '' };
  }

  const { year, month, day, hour, minute } = kstParts(parsed);
  const date = `${year}-${month}-${day}`;
  if (!hasExplicitTime(raw)) return { date, time: '' };
  return { date, time: `${hour}:${minute}` };
}

/**
 * 폼 입력(KST 벽시계) → Airtable 저장용.
 * 시간 있으면 ISO UTC (예: 18:30 KST → ...T09:30:00.000Z),
 * 날짜만이면 YYYY-MM-DD.
 */
export function combineGatheringDateTime(
  date: string,
  time: string,
): string | null {
  const d = date.trim();
  if (!d) return null;
  const t = time.trim();
  if (!t) return d;

  // 브라우저/서버 로컬 TZ에 의존하지 않고 KST(+09:00)로 해석
  const parsed = new Date(`${d}T${t}:00+09:00`);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toISOString();
}

const shortDateOpts: Intl.DateTimeFormatOptions = {
  timeZone: KST,
  month: 'short',
  day: 'numeric',
  weekday: 'short',
};

const longDateOpts: Intl.DateTimeFormatOptions = {
  timeZone: KST,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
};

const timeOpts: Intl.DateTimeFormatOptions = {
  timeZone: KST,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

/** 카드 3행 — 7.17(금) 오후 6:00 형식, 항상 KST */
export function formatGatheringDateCard(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();

  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date = new Date(`${raw}T12:00:00+09:00`);
  } else {
    date = new Date(raw);
  }
  if (Number.isNaN(date.getTime())) return null;

  const { month, day } = kstParts(date);
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    weekday: 'short',
  })
    .format(date)
    .replace(/\./g, '');

  const dateLabel = `${Number(month)}.${Number(day)}(${weekday})`;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || !hasExplicitTime(raw)) {
    return dateLabel;
  }

  const timeLabel = date.toLocaleTimeString('ko-KR', timeOpts);
  return `${dateLabel} ${timeLabel}`;
}

/** 카드용 — 짧은 날짜 + 시간(있으면), 항상 KST */
export function formatGatheringDateShort(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00+09:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString('ko-KR', shortDateOpts);
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);

  const dateLabel = date.toLocaleDateString('ko-KR', shortDateOpts);
  if (!hasExplicitTime(raw)) return dateLabel;

  const timeLabel = date.toLocaleTimeString('ko-KR', timeOpts);
  return `${dateLabel} ${timeLabel}`;
}

/** 상세용 — 긴 날짜 + 시간(있으면), 항상 KST */
export function formatGatheringDateLong(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00+09:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString('ko-KR', longDateOpts);
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);

  const dateLabel = date.toLocaleDateString('ko-KR', longDateOpts);
  if (!hasExplicitTime(raw)) return dateLabel;

  const timeLabel = date.toLocaleTimeString('ko-KR', timeOpts);
  return `${dateLabel} ${timeLabel}`;
}
