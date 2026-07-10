import { NextResponse } from 'next/server';
import { listNearbyActiveUsers, userDisplayName } from '@/lib/airtable/users';
import { getSessionUser } from '@/lib/auth/session';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const users = await listNearbyActiveUsers(session.id);
    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: userDisplayName(u),
        age: u.age,
        bio: u.bio,
        interest_categories: u.interestCategories,
        latitude: u.latitude,
        longitude: u.longitude,
        location_updated_at: u.locationUpdatedAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '주변 동행자 조회 실패' },
      { status: 500 },
    );
  }
}
