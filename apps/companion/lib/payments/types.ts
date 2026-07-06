export type PaymentProviderId = 'nicepay' | 'inicis';

export type PaymentEnv = 'sandbox' | 'production';

export type ClientCheckoutConfig = {
  configured: boolean;
  provider: PaymentProviderId;
  sdkUrl: string;
  clientId: string;
  returnUrl: string;
  method: 'card';
};

export type ApprovePaymentInput = {
  transactionId: string;
  amount: number;
  orderId: string;
};

export type ApprovePaymentResult = {
  ok: boolean;
  transactionId: string;
  orderId: string;
  amount: number;
  status: string;
  error?: string;
};

export type PaymentReturnPayload = Record<string, string>;

export type VerifyReturnResult =
  | { ok: true; transactionId: string; orderId: string; amount: number }
  | { ok: false; error: string; orderId?: string };

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  isConfigured(): boolean;
  getClientCheckoutConfig(): ClientCheckoutConfig;
  verifyReturnPayload(payload: PaymentReturnPayload): VerifyReturnResult;
  approvePayment(input: ApprovePaymentInput): Promise<ApprovePaymentResult>;
}
