import { NextResponse } from 'next/server';
import { updateUserLocation } from '@/lib/airtable/users';
import { getSessionUser } from '@/lib/auth/session';
import { airtableUserToUserProfile } from '@/lib/profile/transform';

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lat, lng } = body as { lat?: number; lng?: number };

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'lat, lng 필요' }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: '올바른 좌표를 입력해주세요.' }, { status: 400 });
    }

    const user = await updateUserLocation(session.id, lat, lng);
    return NextResponse.json({
      user: airtableUserToUserProfile(user),
      location: {
        lat: user.latitude,
        lng: user.longitude,
        location_updated_at: user.locationUpdatedAt,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '위치 저장 실패' },
      { status: 500 },
    );
  }
}
