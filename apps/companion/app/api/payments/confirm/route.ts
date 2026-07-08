import { NextResponse } from 'next/server';
import { saveOrder } from '@/lib/db/orders';
import { getProductById } from '@/lib/db/products';
import { generateOrderCode, perPersonCharge } from '@/lib/geo';
import { completeOrderAfterPayment } from '@/lib/payments/complete-order';
import { getPaymentProvider } from '@/lib/payments/provider';
import { resolveRegionForStorage } from '@/lib/region-filter';
import { upsertUser } from '@/lib/airtable/users';

/** PG 승인 완료 후 Orders·Participants 저장 (returnUrl 외 수동 확인용) */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      merchantUid,
      pgTransactionId,
      impUid,
      amount,
      name,
      phone,
      productId,
      productName,
      region,
    } = body as {
      merchantUid?: string;
      pgTransactionId?: string;
      impUid?: string;
      amount?: number;
      name?: string;
      phone?: string;
      productId?: string;
      productName?: string;
      region?: string;
    };

    const transactionId = pgTransactionId ?? impUid;

    if (!merchantUid || !transactionId || !amount || !name || !phone || !productId || !productName) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const provider = getPaymentProvider();
    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: '결제 PG 설정이 완료되지 않았습니다. PAYMENT_* 환경 변수를 확인하세요.' },
        { status: 503 },
      );
    }

    const approved = await provider.approvePayment({
      transactionId,
      amount,
      orderId: merchantUid,
    });

    if (!approved.ok) {
      return NextResponse.json(
        { error: approved.error ?? '결제 검증에 실패했습니다.' },
        { status: 400 },
      );
    }

    await completeOrderAfterPayment({
      merchantUid,
      pgTransactionId: approved.transactionId,
      amount: approved.amount,
      name,
      phone,
      productId,
      productName,
      region: resolveRegionForStorage(region),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

/** 결제창 호출 전 pending 주문 생성 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productId, name, phone, region, profileId } = body as {
      productId?: string;
      name?: string;
      phone?: string;
      region?: string;
      profileId?: string;
    };

    if (!productId || !name || !phone) {
      return NextResponse.json({ error: '참여 정보를 입력해주세요.' }, { status: 400 });
    }

    const resolvedRegion = resolveRegionForStorage(region);
    const product = await getProductById(productId, resolvedRegion);
    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (product.groupBuyStatus === 'success' || product.currentCount >= product.targetCount) {
      return NextResponse.json({ error: '모집이 완료된 상품입니다.' }, { status: 400 });
    }

    const provider = getPaymentProvider();
    const checkout = provider.getClientCheckoutConfig();

    const amount = perPersonCharge(product.discountedPrice, product.targetCount);
    const merchantUid = `order_${crypto.randomUUID()}`;
    const orderCode = generateOrderCode();

    let resolvedProfileId = profileId;
    if (!resolvedProfileId) {
      const user = await upsertUser({ name, phone, region: resolvedRegion });
      resolvedProfileId = user.id;
    }

    await saveOrder({
      order_code: orderCode,
      profile_id: resolvedProfileId,
      product_id: productId,
      product_name: product.name,
      participant_name: name,
      participant_phone: phone,
      region: resolvedRegion,
      amount,
      payment_status: 'pending',
      merchant_uid: merchantUid,
      imp_uid: null,
    });

    return NextResponse.json({
      merchantUid,
      orderCode,
      amount,
      productName: product.name,
      checkout,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '주문 생성 실패' }, { status: 500 });
  }
}
