import { getPaymentConfig, getPaymentReturnUrl, isPaymentConfigured } from '../config';
import type {
  ApprovePaymentInput,
  ApprovePaymentResult,
  ClientCheckoutConfig,
  PaymentProvider,
  PaymentReturnPayload,
  VerifyReturnResult,
} from '../types';

const NICEPAY_SDK_URL = 'https://pay.nicepay.co.kr/v1/js/';

function basicAuthHeader(clientId: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`;
}

export class NicepayProvider implements PaymentProvider {
  readonly id = 'nicepay' as const;

  private get config() {
    return getPaymentConfig();
  }

  isConfigured(): boolean {
    return isPaymentConfigured(this.config);
  }

  getClientCheckoutConfig(): ClientCheckoutConfig {
    const configured = this.isConfigured();
    return {
      configured,
      provider: this.id,
      sdkUrl: NICEPAY_SDK_URL,
      clientId: configured ? this.config.publicClientId : '',
      returnUrl: getPaymentReturnUrl(this.config),
      method: 'card',
    };
  }

  verifyReturnPayload(payload: PaymentReturnPayload): VerifyReturnResult {
    const authResultCode = payload.authResultCode ?? payload.AuthResultCode ?? '';
    const orderId = payload.orderId ?? payload.OrderId ?? '';
    const transactionId = payload.tid ?? payload.Tid ?? '';
    const amountRaw = payload.amount ?? payload.Amount ?? '';

    if (authResultCode !== '0000') {
      const msg = payload.authResultMsg ?? payload.AuthResultMsg ?? '결제 인증에 실패했습니다.';
      return { ok: false, error: msg, orderId: orderId || undefined };
    }

    const amount = Number(amountRaw);
    if (!orderId || !transactionId || !Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: '결제 인증 응답 형식이 올바르지 않습니다.', orderId: orderId || undefined };
    }

    return { ok: true, transactionId, orderId, amount };
  }

  async approvePayment(input: ApprovePaymentInput): Promise<ApprovePaymentResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        transactionId: input.transactionId,
        orderId: input.orderId,
        amount: input.amount,
        status: 'not_configured',
        error: '결제 PG 설정이 완료되지 않았습니다.',
      };
    }

    const { clientId, secretKey, apiBaseUrl } = this.config;
    const url = `${apiBaseUrl}/v1/payments/${encodeURIComponent(input.transactionId)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: basicAuthHeader(clientId, secretKey),
        },
        body: JSON.stringify({ amount: input.amount }),
        cache: 'no-store',
      });

      const body = (await res.json().catch(() => null)) as {
        resultCode?: string;
        resultMsg?: string;
        status?: string;
        amount?: number;
        tid?: string;
        orderId?: string;
      } | null;

      if (!res.ok || !body) {
        return {
          ok: false,
          transactionId: input.transactionId,
          orderId: input.orderId,
          amount: input.amount,
          status: 'http_error',
          error: body?.resultMsg ?? `PG 승인 API 오류 (${res.status})`,
        };
      }

      if (body.resultCode !== '0000') {
        return {
          ok: false,
          transactionId: input.transactionId,
          orderId: input.orderId,
          amount: input.amount,
          status: body.status ?? 'failed',
          error: body.resultMsg ?? 'PG 승인에 실패했습니다.',
        };
      }

      if (body.amount != null && body.amount !== input.amount) {
        return {
          ok: false,
          transactionId: input.transactionId,
          orderId: input.orderId,
          amount: input.amount,
          status: 'amount_mismatch',
          error: '승인 금액이 주문 금액과 일치하지 않습니다.',
        };
      }

      return {
        ok: true,
        transactionId: body.tid ?? input.transactionId,
        orderId: body.orderId ?? input.orderId,
        amount: body.amount ?? input.amount,
        status: body.status ?? 'paid',
      };
    } catch (error) {
      return {
        ok: false,
        transactionId: input.transactionId,
        orderId: input.orderId,
        amount: input.amount,
        status: 'network_error',
        error: error instanceof Error ? error.message : 'PG 승인 요청 실패',
      };
    }
  }
}
