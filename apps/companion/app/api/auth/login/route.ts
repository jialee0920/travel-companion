import { NextResponse } from 'next/server';
import { completeLogin } from '@/lib/auth/complete-login';
import { createSessionToken, sessionUserToProfile, setSessionCookie } from '@/lib/auth/session';
import { DEFAULT_REGION_CODE } from '@/lib/regions';
import { normalizePhone } from '@/lib/user-profile';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, region = DEFAULT_REGION_CODE } = body as {
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
      region,
    });

    const token = await createSessionToken(user);
    const response = NextResponse.json({ user: sessionUserToProfile(user) });
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
