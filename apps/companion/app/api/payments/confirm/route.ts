import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchantUid,
      impUid,
      amount,
      name,
      phone,
      productId,
      productName,
      region,
    } = body as {
      merchantUid?: string;
      impUid?: string;
      amount?: number;
      name?: string;
      phone?: string;
      productId?: string;
      productName?: string;
      region?: string;
    };

    if (!merchantUid || !impUid || !amount || !name || !phone || !productId || !productName) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const apiSecret = process.env.PORTONE_API_SECRET;
    if (apiSecret) {
      const verifyRes = await fetch(`https://api.iamport.kr/payments/${impUid}`, {
        headers: { Authorization: apiSecret },
      });
      const verifyJson = await verifyRes.json();
      const payment = verifyJson.response;
      if (!payment || payment.status !== 'paid' || payment.amount !== amount) {
        return NextResponse.json({ error: '결제 검증에 실패했습니다.' }, { status: 400 });
      }
    }

    const { updateOrderPayment, addParticipant, incrementProductCount } = await import(
      '@/lib/db/orders'
    );
    const { generateOrderCode } = await import('@/lib/geo');

    const order = await updateOrderPayment(merchantUid, {
      payment_status: 'paid',
      imp_uid: impUid,
    });

    if (order) {
      await addParticipant({
        product_id: productId,
        display_name: name.slice(0, 1) + '**',
        order_code: order.order_code,
      });
      await incrementProductCount(productId);
    } else {
      const { saveOrder } = await import('@/lib/db/orders');
      const orderCode = generateOrderCode();
      await saveOrder({
        order_code: orderCode,
        product_id: productId,
        product_name: productName,
        participant_name: name,
        participant_phone: phone,
        region: region ?? 'mukho',
        amount,
        payment_status: 'paid',
        imp_uid: impUid,
        merchant_uid: merchantUid,
      });
      await addParticipant({
        product_id: productId,
        display_name: name.slice(0, 1) + '**',
        order_code: orderCode,
      });
      await incrementProductCount(productId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { saveOrder } = await import('@/lib/db/orders');
    const { generateOrderCode, perPersonCharge } = await import('@/lib/geo');
    const { getProductById } = await import('@/lib/regions');

    const { productId, name, phone, region = 'mukho' } = body as {
      productId?: string;
      name?: string;
      phone?: string;
      region?: string;
    };

    if (!productId || !name || !phone) {
      return NextResponse.json({ error: '참여 정보를 입력해주세요.' }, { status: 400 });
    }

    const product = getProductById(productId, region);
    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (product.groupBuyStatus === 'success' || product.currentCount >= product.targetCount) {
      return NextResponse.json({ error: '모집이 완료된 상품입니다.' }, { status: 400 });
    }

    const amount = perPersonCharge(product.regularPrice, product.discountRate, product.targetCount);
    const merchantUid = `order_${crypto.randomUUID()}`;
    const orderCode = generateOrderCode();

    await saveOrder({
      order_code: orderCode,
      product_id: productId,
      product_name: product.name,
      participant_name: name,
      participant_phone: phone,
      region,
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
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '주문 생성 실패' }, { status: 500 });
  }
}
