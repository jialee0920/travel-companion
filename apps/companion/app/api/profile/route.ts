import { NextResponse } from 'next/server';
import {
  NicknameTakenError,
  getUserById,
  updateUserProfile,
  userDisplayName,
} from '@/lib/airtable/users';
import {
  createSessionToken,
  getSessionUser,
  setSessionCookie,
} from '@/lib/auth/session';
import { normalizeInterestCategories } from '@/lib/profile/constants';
import { airtableUserToUserProfile } from '@/lib/profile/transform';
import { isKnownUserRegion, normalizeUserRegionList } from '@/lib/regions/constants';
import { primaryRegion } from '@/lib/regions';
import { normalizePhone } from '@/lib/user-profile';
import { displayNickname } from '@/lib/users/nickname';

function isValidProfilePhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return /^\d{10,11}$/.test(digits);
}

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
    const { bio, interest_categories, profile_completed, age, regions, name, nickname, phone } =
      body as {
        bio?: string | null;
        interest_categories?: unknown;
        profile_completed?: boolean;
        age?: number | null;
        regions?: unknown;
        name?: string;
        nickname?: string;
        phone?: string;
      };

    if (age !== undefined && age !== null) {
      if (!Number.isInteger(age) || age < 14 || age > 99) {
        return NextResponse.json({ error: '만 나이는 14~99 사이로 입력해주세요.' }, { status: 400 });
      }
    }

    let normalizedRegions: string[] | undefined;
    if (regions !== undefined) {
      console.info('[PATCH /api/profile] regions raw', {
        typeof: typeof regions,
        isArray: Array.isArray(regions),
        json: JSON.stringify(regions),
      });

      normalizedRegions = normalizeUserRegionList(regions);
      if (normalizedRegions.length === 0) {
        return NextResponse.json(
          { error: '활동 지역을 하나 이상 선택해주세요.' },
          { status: 400 },
        );
      }
      if (normalizedRegions.some((code) => !isKnownUserRegion(code))) {
        return NextResponse.json({ error: '올바른 지역을 선택해주세요.' }, { status: 400 });
      }
    }

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed) {
        return NextResponse.json({ error: '실명을 입력해주세요.' }, { status: 400 });
      }
    }

    if (nickname !== undefined) {
      const trimmed = displayNickname(typeof nickname === 'string' ? nickname : '');
      if (!trimmed) {
        return NextResponse.json({ error: '별명을 입력해주세요.' }, { status: 400 });
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || !isValidProfilePhone(phone)) {
        return NextResponse.json(
          { error: '전화번호는 숫자만 10~11자리로 입력해주세요.' },
          { status: 400 },
        );
      }
    }

    console.info('[PATCH /api/profile] nickname payload', {
      userId: session.id,
      nickname,
      sessionNickname: session.nickname,
    });

    const user = await updateUserProfile(session.id, {
      bio: bio !== undefined ? (bio?.trim() || null) : undefined,
      interestCategories:
        interest_categories !== undefined
          ? normalizeInterestCategories(interest_categories)
          : undefined,
      profileCompleted: profile_completed,
      age: age !== undefined ? age : undefined,
      regions: normalizedRegions,
      name: name !== undefined ? name.trim() : undefined,
      nickname: nickname !== undefined ? displayNickname(nickname) : undefined,
      phone: phone !== undefined ? phone : undefined,
    });

    console.info('[PATCH /api/profile] saved user nickname', {
      userId: user.id,
      nickname: user.nickname,
      displayName: userDisplayName(user),
    });

    const response = NextResponse.json({ user: airtableUserToUserProfile(user) });

    const sessionChanged =
      (normalizedRegions !== undefined && primaryRegion(user.regions) !== session.region) ||
      (name !== undefined && user.name !== session.name) ||
      (phone !== undefined && user.phone !== session.phone) ||
      userDisplayName(user) !== session.nickname;

    if (sessionChanged) {
      const token = await createSessionToken({
        id: user.id,
        phone: user.phone,
        name: user.name,
        nickname: userDisplayName(user),
        region: primaryRegion(user.regions),
        airtableId: user.id,
      });
      setSessionCookie(response, token);
      console.info('[PATCH /api/profile] session nickname refreshed', {
        nickname: userDisplayName(user),
      });
    }

    return response;
  } catch (error) {
    console.error(error);
    if (error instanceof NicknameTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프로필 저장 실패' },
      { status: 500 },
    );
  }
}
