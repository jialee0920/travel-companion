import { NextResponse } from 'next/server';
import { listOrdersByProfileId, listOrdersByPhone } from '@/lib/db/orders';
import { listReservationsByUserId } from '@/lib/db/product-reservations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');
  const phone = searchParams.get('phone');

  try {
    if (profileId) {
      const [orders, reservations] = await Promise.all([
        listOrdersByProfileId(profileId),
        listReservationsByUserId(profileId),
      ]);
      return NextResponse.json({ orders, reservations });
    }
    if (phone?.trim()) {
      const orders = await listOrdersByPhone(phone.trim());
      return NextResponse.json({ orders, reservations: [] });
    }
    return NextResponse.json({ error: 'profileId 또는 phone 필요' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '내역 조회에 실패했습니다.' }, { status: 500 });
  }
}
