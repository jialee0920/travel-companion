import { NextResponse } from 'next/server';
import { completeLogin } from '@/lib/auth/complete-login';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import { getUserById } from '@/lib/airtable/users';
import { airtableUserToUserProfile } from '@/lib/profile/transform';
import { resolveRegionForStorage } from '@/lib/region-filter';
import { normalizePhone } from '@/lib/user-profile';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, region } = body as {
      name?: string;
      phone?: string;
      region?: string;
    };

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: '이름과 연락처를 입력해주세요.' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return NextResponse.json({ error: '올바른 휴대폰 번호를 입력해주세요.' }, { status: 400 });
    }

    const user = await completeLogin({
      name: name.trim(),
      phone: normalizedPhone,
      region: resolveRegionForStorage(region),
    });

    const token = await createSessionToken(user);
    const airtableUser = await getUserById(user.id);
    const profile = airtableUser
      ? airtableUserToUserProfile(airtableUser)
      : {
          id: user.id,
          name: user.name,
          nickname: user.nickname,
          phone: user.phone,
          region: user.region,
          avatar_url: null,
          profile_completed: false,
        };
    const response = NextResponse.json({ user: profile });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '로그인 처리에 실패했습니다.' },
      { status: 500 },
    );
  }
}
