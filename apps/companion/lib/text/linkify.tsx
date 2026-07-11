import type { ReactNode } from 'react';

/** http(s) URL — 공백·꺾쇠 전까지. 끝 구두점은 별도 분리 */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

const TRAILING_PUNCT_RE = /[),.;:!?'"\]]+$/;

function splitTrailingPunctuation(raw: string): { urlCandidate: string; trailing: string } {
  const match = raw.match(TRAILING_PUNCT_RE);
  if (!match) return { urlCandidate: raw, trailing: '' };
  return {
    urlCandidate: raw.slice(0, -match[0].length),
    trailing: match[0],
  };
}

/** http/https 만 허용 (javascript: 등 차단) */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export type LinkifyPart =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string };

/** 텍스트를 일반 문자열 / 안전 URL 파트로 분리 (XSS: 호출측에서 React 텍스트로 렌더) */
export function splitTextWithLinks(text: string): LinkifyPart[] {
  if (!text) return [];

  const parts: LinkifyPart[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;

    if (start > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, start) });
    }

    const { urlCandidate, trailing } = splitTrailingPunctuation(raw);
    if (urlCandidate && isSafeHttpUrl(urlCandidate)) {
      const href = new URL(urlCandidate).href;
      parts.push({ type: 'link', href, label: urlCandidate });
      if (trailing) parts.push({ type: 'text', value: trailing });
    } else {
      parts.push({ type: 'text', value: raw });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

export function linkifyToReactNodes(text: string): ReactNode[] {
  return splitTextWithLinks(text).map((part, index) => {
    if (part.type === 'text') {
      return part.value;
    }
    return (
      <a
        key={`l-${index}`}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-medium text-primary underline-offset-2 hover:underline"
      >
        {part.label}
      </a>
    );
  });
}
