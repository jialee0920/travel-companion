import { NextResponse } from 'next/server';
import { listRealUsers } from '@/lib/airtable/users';
import { getSessionUser } from '@/lib/auth/session';
import { resolveRegionForStorage } from '@/lib/region-filter';

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const region = resolveRegionForStorage(searchParams.get('region') ?? session.region);

  try {
    const users = await listRealUsers(region, session.id);
    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, name: u.name, phone: u.phone })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '사용자 목록 조회 실패' },
      { status: 500 },
    );
  }
}
