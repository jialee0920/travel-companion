import { NextResponse } from 'next/server';
import { verifyOtpCode } from '@/lib/airtable/otp-codes';
import { completeLogin } from '@/lib/auth/complete-login';
import { createSessionToken, sessionUserToProfile, setSessionCookie } from '@/lib/auth/session';
import { resolveRegionForStorage } from '@/lib/region-filter';
import { normalizePhone } from '@/lib/user-profile';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, code, name, region } = body as {
      phone?: string;
      code?: string;
      name?: string;
      region?: string;
    };

    if (!phone?.trim() || !code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: '휴대폰 번호, 인증번호, 이름을 입력해주세요.' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const valid = await verifyOtpCode(normalizedPhone, code.trim());
    if (!valid) {
      return NextResponse.json({ error: '인증번호가 올바르지 않거나 만료되었습니다.' }, { status: 400 });
    }

    const user = await completeLogin({
      phone: normalizedPhone,
      name: name.trim(),
      region: resolveRegionForStorage(region),
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
