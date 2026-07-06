'use client';

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (
        params: Record<string, unknown>,
        callback?: (result: unknown) => void,
      ) => void;
    };
  }
}

export function loadPaymentSdk(sdkUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('브라우저 환경이 아닙니다.'));
      return;
    }

    if (window.AUTHNICE) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[data-payment-sdk="${sdkUrl}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('결제 SDK 로드 실패')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = sdkUrl;
    script.async = true;
    script.dataset.paymentSdk = sdkUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('결제 SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

export function openPaymentWindow(params: {
  sdkUrl: string;
  clientId: string;
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
  buyerName?: string;
  buyerTel?: string;
  onError?: (message: string) => void;
}): Promise<void> {
  return loadPaymentSdk(params.sdkUrl).then(() => {
    if (!window.AUTHNICE) {
      throw new Error('결제 SDK를 초기화할 수 없습니다.');
    }

    window.AUTHNICE.requestPay({
      clientId: params.clientId,
      method: 'card',
      orderId: params.orderId,
      amount: params.amount,
      goodsName: params.goodsName,
      returnUrl: params.returnUrl,
      buyerName: params.buyerName,
      buyerTel: params.buyerTel,
      fnError: (result: { errorMsg?: string; msg?: string }) => {
        const message = result?.errorMsg ?? result?.msg ?? '';
        if (message.includes('사용자') && message.includes('취소')) return;
        params.onError?.(message || '결제창 오류');
      },
    });
  });
}
