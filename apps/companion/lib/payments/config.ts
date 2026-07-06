import type { PaymentEnv, PaymentProviderId } from './types';

export type PaymentConfig = {
  provider: PaymentProviderId;
  env: PaymentEnv;
  clientId: string;
  secretKey: string;
  publicClientId: string;
  appUrl: string;
  apiBaseUrl: string;
  /** KG이니시스 등 추후 MID */
  merchantId: string;
  signKey: string;
};

const PROVIDERS: PaymentProviderId[] = ['nicepay', 'inicis'];

function parseProvider(value: string | undefined): PaymentProviderId {
  if (value && PROVIDERS.includes(value as PaymentProviderId)) {
    return value as PaymentProviderId;
  }
  return 'nicepay';
}

function parseEnv(value: string | undefined): PaymentEnv {
  return value === 'production' ? 'production' : 'sandbox';
}

function defaultApiBaseUrl(provider: PaymentProviderId, env: PaymentEnv): string {
  if (process.env.PAYMENT_API_BASE_URL) {
    return process.env.PAYMENT_API_BASE_URL.replace(/\/$/, '');
  }

  if (provider === 'nicepay') {
    return env === 'production'
      ? 'https://api.nicepay.co.kr'
      : 'https://sandbox-api.nicepay.co.kr';
  }

  // inicis — placeholder until implemented
  return env === 'production' ? 'https://iniapi.inicis.com' : 'https://stginiapi.inicis.com';
}

export function getPaymentConfig(): PaymentConfig {
  const provider = parseProvider(process.env.PAYMENT_PROVIDER);
  const env = parseEnv(process.env.PAYMENT_ENV);
  const clientId = process.env.PAYMENT_CLIENT_ID?.trim() ?? '';
  const secretKey = process.env.PAYMENT_SECRET_KEY?.trim() ?? '';
  const publicClientId =
    process.env.NEXT_PUBLIC_PAYMENT_CLIENT_ID?.trim() || clientId;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );

  return {
    provider,
    env,
    clientId,
    secretKey,
    publicClientId,
    appUrl,
    apiBaseUrl: defaultApiBaseUrl(provider, env),
    merchantId: process.env.PAYMENT_MERCHANT_ID?.trim() ?? '',
    signKey: process.env.PAYMENT_SIGN_KEY?.trim() ?? '',
  };
}

export function isPaymentConfigured(config: PaymentConfig = getPaymentConfig()): boolean {
  if (config.provider === 'nicepay') {
    return Boolean(config.publicClientId && config.clientId && config.secretKey);
  }
  if (config.provider === 'inicis') {
    return Boolean(config.merchantId && config.signKey && config.publicClientId);
  }
  return false;
}

export function getPaymentReturnUrl(config: PaymentConfig = getPaymentConfig()): string {
  return `${config.appUrl}/api/payments/return`;
}
