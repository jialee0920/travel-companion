import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/db/products';
import { completeOrderAfterPayment } from '@/lib/payments/complete-order';
import { getPaymentProvider } from '@/lib/payments/provider';
import { upsertUser } from '@/lib/airtable/users';
import { generateOrderCode, perPersonCharge } from '@/lib/geo';
import { saveOrder } from '@/lib/db/orders';

/** PG 인증 returnUrl — 인증 결과 POST 후 승인·주문 완료 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  const config = provider.getClientCheckoutConfig();

  if (!config.configured) {
    return redirectWithError(request, '결제 PG 설정이 완료되지 않았습니다.');
  }

  try {
    const payload = await parseReturnPayload(request);
    const verified = provider.verifyReturnPayload(payload);

    if (!verified.ok) {
      return redirectWithError(request, verified.error, verified.orderId);
    }

    const { getOrderByMerchantUid } = await import('@/lib/db/orders');
    const order = await getOrderByMerchantUid(verified.orderId);
    if (!order) {
      return redirectWithError(request, '주문을 찾을 수 없습니다.', verified.orderId);
    }
    if (order.payment_status === 'paid') {
      return redirectWithSuccess(request, order.product_id);
    }
    if (order.amount !== verified.amount) {
      return redirectWithError(request, '결제 금액이 주문과 일치하지 않습니다.', verified.orderId);
    }

    const approved = await provider.approvePayment({
      transactionId: verified.transactionId,
      amount: verified.amount,
      orderId: verified.orderId,
    });

    if (!approved.ok) {
      return redirectWithError(request, approved.error ?? '결제 승인에 실패했습니다.', verified.orderId);
    }

    await completeOrderAfterPayment({
      merchantUid: verified.orderId,
      pgTransactionId: approved.transactionId,
      amount: approved.amount,
      name: order.participant_name,
      phone: order.participant_phone,
      productId: order.product_id,
      productName: order.product_name,
      region: order.region,
      profileId: order.profile_id ?? undefined,
    });

    return redirectWithSuccess(request, order.product_id);
  } catch (error) {
    console.error(error);
    return redirectWithError(request, '결제 처리 중 오류가 발생했습니다.');
  }
}

async function parseReturnPayload(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await request.formData();
    const payload: Record<string, string> = {};
    form.forEach((value, key) => {
      payload[key] = String(value);
    });
    return payload;
  }

  if (contentType.includes('application/json')) {
    const json = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, String(value ?? '')]),
    );
  }

  const text = await request.text();
  if (!text) return {};

  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, String(value ?? '')]),
    );
  } catch {
    const params = new URLSearchParams(text);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  }
}

function getAppOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return new URL(request.url).origin;
}

function redirectWithSuccess(request: Request, productId: string) {
  const url = `${getAppOrigin(request)}/product/${encodeURIComponent(productId)}?payment=success`;
  return NextResponse.redirect(url, 303);
}

function redirectWithError(request: Request, message: string, orderId?: string) {
  const params = new URLSearchParams({ payment: 'error', message });
  if (orderId) params.set('orderId', orderId);
  const url = `${getAppOrigin(request)}/orders?${params.toString()}`;
  return NextResponse.redirect(url, 303);
}
