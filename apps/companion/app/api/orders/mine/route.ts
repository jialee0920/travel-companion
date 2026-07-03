import { NextResponse } from 'next/server';
import { listOrdersByProfileId, listOrdersByPhone } from '@/lib/db/orders';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');
  const phone = searchParams.get('phone');

  try {
    if (profileId) {
      const orders = await listOrdersByProfileId(profileId);
      return NextResponse.json({ orders });
    }
    if (phone?.trim()) {
      const orders = await listOrdersByPhone(phone.trim());
      return NextResponse.json({ orders });
    }
    return NextResponse.json({ error: 'profileId 또는 phone 필요' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '내역 조회에 실패했습니다.' }, { status: 500 });
  }
}
