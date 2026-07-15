import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import {
  findUserProductReservation,
  ProductReservationError,
  reserveProduct,
} from '@/lib/db/product-reservations';

type Props = {
  params: Promise<{ id: string }>;
};

/** 로그인 사용자의 해당 상품 예약 여부 */
export async function GET(_request: Request, { params }: Props) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ reserved: false, reservation: null });
  }

  try {
    const { id } = await params;
    const reservation = await findUserProductReservation(id, session.id);
    return NextResponse.json({
      reserved: reservation != null,
      reservation,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '예약 조회 실패' },
      { status: 500 },
    );
  }
}

/** 사전 예약 생성 */
export async function POST(_request: Request, { params }: Props) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await reserveProduct({
      productId: id,
      userId: session.id,
      name: session.name || session.nickname,
      phone: session.phone,
    });

    return NextResponse.json({
      reservation: result.reservation,
      alreadyReserved: result.alreadyReserved,
      currentCount: result.currentCount,
      targetCount: result.targetCount,
      message: result.alreadyReserved
        ? '이미 사전 예약한 상품입니다.'
        : '예약 완료! 결제 준비되면 바로 알려드릴게요!',
    });
  } catch (error) {
    console.error(error);
    if (error instanceof ProductReservationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '사전 예약 실패' },
      { status: 500 },
    );
  }
}
