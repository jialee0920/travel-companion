import { NextResponse } from 'next/server';
import { getUserById, updateUserProfile } from '@/lib/airtable/users';
import {
  createSessionToken,
  getSessionUser,
  setSessionCookie,
} from '@/lib/auth/session';
import { normalizeInterestCategories } from '@/lib/profile/constants';
import { airtableUserToUserProfile } from '@/lib/profile/transform';
import { isKnownRegionCode } from '@/lib/regions';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const user = await getUserById(session.id);
    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ user: airtableUserToUserProfile(user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프로필 조회 실패' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { bio, interest_categories, profile_completed, age, region } = body as {
      bio?: string | null;
      interest_categories?: unknown;
      profile_completed?: boolean;
      age?: number | null;
      region?: string;
    };

    if (age !== undefined && age !== null) {
      if (!Number.isInteger(age) || age < 14 || age > 99) {
        return NextResponse.json({ error: '만 나이는 14~99 사이로 입력해주세요.' }, { status: 400 });
      }
    }

    if (region !== undefined) {
      const trimmed = typeof region === 'string' ? region.trim() : '';
      if (!trimmed || !isKnownRegionCode(trimmed)) {
        return NextResponse.json({ error: '올바른 지역을 선택해주세요.' }, { status: 400 });
      }
    }

    const user = await updateUserProfile(session.id, {
      bio: bio !== undefined ? (bio?.trim() || null) : undefined,
      interestCategories:
        interest_categories !== undefined
          ? normalizeInterestCategories(interest_categories)
          : undefined,
      profileCompleted: profile_completed,
      age: age !== undefined ? age : undefined,
      region: region !== undefined ? region.trim() : undefined,
    });

    const response = NextResponse.json({ user: airtableUserToUserProfile(user) });

    // Region이 세션 JWT에도 있으므로 변경 시 쿠키 갱신
    if (region !== undefined && user.region !== session.region) {
      const token = await createSessionToken({
        id: user.id,
        phone: user.phone,
        name: user.name,
        region: user.region,
        airtableId: user.id,
      });
      setSessionCookie(response, token);
    }

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프로필 저장 실패' },
      { status: 500 },
    );
  }
}
