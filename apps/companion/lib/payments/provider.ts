import { getPaymentConfig } from './config';
import { InicisProvider } from './providers/inicis';
import { NicepayProvider } from './providers/nicepay';
import type { PaymentProvider } from './types';

let nicepay: NicepayProvider | null = null;
let inicis: InicisProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  const { provider } = getPaymentConfig();

  if (provider === 'inicis') {
    inicis ??= new InicisProvider();
    return inicis;
  }

  nicepay ??= new NicepayProvider();
  return nicepay;
}
