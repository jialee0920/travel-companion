import { getPaymentConfig, getPaymentReturnUrl, isPaymentConfigured } from '../config';
import type {
  ApprovePaymentInput,
  ApprovePaymentResult,
  ClientCheckoutConfig,
  PaymentProvider,
  PaymentReturnPayload,
  VerifyReturnResult,
} from '../types';

/** KG이니시스 — 추후 구현 스텁 */
export class InicisProvider implements PaymentProvider {
  readonly id = 'inicis' as const;

  isConfigured(): boolean {
    return isPaymentConfigured(getPaymentConfig());
  }

  getClientCheckoutConfig(): ClientCheckoutConfig {
    return {
      configured: false,
      provider: this.id,
      sdkUrl: '',
      clientId: '',
      returnUrl: getPaymentReturnUrl(),
      method: 'card',
    };
  }

  verifyReturnPayload(_payload: PaymentReturnPayload): VerifyReturnResult {
    return { ok: false, error: 'KG이니시스 연동은 아직 준비 중입니다.' };
  }

  async approvePayment(input: ApprovePaymentInput): Promise<ApprovePaymentResult> {
    return {
      ok: false,
      transactionId: input.transactionId,
      orderId: input.orderId,
      amount: input.amount,
      status: 'not_implemented',
      error: 'KG이니시스 연동은 아직 준비 중입니다.',
    };
  }
}
