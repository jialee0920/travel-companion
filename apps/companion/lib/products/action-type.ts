/** Airtable Products.Action Type — 단일 소스 */
export const PRODUCT_ACTION_TYPES = [
  'payment',
  'payment_link',
  'kakao_channel',
  'reservation',
] as const;

export type ProductActionType = (typeof PRODUCT_ACTION_TYPES)[number];

export const DEFAULT_PRODUCT_ACTION_TYPE: ProductActionType = 'payment';

/** payment_link CTA — 라벨 변경 시 이 상수만 수정 */
export const PAYMENT_LINK_BUTTON_LABEL = '결제 페이지로 이동';

export const PAYMENT_LINK_NO_LINK_MSG = '결제 링크를 준비 중이에요. 잠시 후 다시 확인해 주세요.';

/** kakao_channel CTA */
export const KAKAO_CHANNEL_BUTTON_LABEL = '동행 모집글 보러가기';

export const KAKAO_CHANNEL_NO_LINK_MSG = '신청 링크를 준비 중이에요. 잠시 후 다시 확인해 주세요.';

export function parseProductActionType(value: unknown): ProductActionType {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return DEFAULT_PRODUCT_ACTION_TYPE;

  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'payment_link' || normalized === 'paymentlink') {
    return 'payment_link';
  }
  if (normalized === 'kakao_channel' || normalized.includes('kakao')) {
    return 'kakao_channel';
  }
  if (normalized === 'reservation' || normalized === 'pre_reservation') {
    return 'reservation';
  }
  if (normalized === 'payment') {
    return 'payment';
  }

  return DEFAULT_PRODUCT_ACTION_TYPE;
}

export function isPaymentAction(actionType: string): actionType is 'payment' {
  return actionType === 'payment';
}

export function isPaymentLinkAction(actionType: string): actionType is 'payment_link' {
  return actionType === 'payment_link';
}

export function isKakaoChannelAction(actionType: string): actionType is 'kakao_channel' {
  return actionType === 'kakao_channel';
}

export function isReservationAction(actionType: string): actionType is 'reservation' {
  return actionType === 'reservation';
}

/** 앱 내 NicePay 결제 + Orders 생성 대상 */
export function usesInAppPayment(actionType: string): boolean {
  return isPaymentAction(actionType);
}

export function openProductExternalLink(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** kakao_channel 등 — 같은 탭에서 이동 (앱 내부는 client router, 외부는 location.assign) */
export function navigateProductExternalLinkSameWindow(
  url: string,
  navigate: (href: string) => void,
): void {
  if (typeof window === 'undefined') return;

  try {
    const target = new URL(url, window.location.href);
    const href = `${target.pathname}${target.search}${target.hash}` || '/';
    if (target.origin === window.location.origin) {
      navigate(href);
      return;
    }
    window.location.assign(target.toString());
  } catch {
    window.location.assign(url);
  }
}
