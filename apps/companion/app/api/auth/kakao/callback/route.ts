import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/airtable/users';
import { completeKakaoLogin } from '@/lib/auth/complete-login';
import { exchangeKakaoCodeForToken, fetchKakaoUserProfile } from '@/lib/auth/kakao-client';
import { getKakaoRedirectUri } from '@/lib/auth/kakao-config';
import { safeReturnUrl, verifyKakaoOAuthState } from '@/lib/auth/kakao-oauth-state';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import { defaultRegionCode } from '@/lib/region-filter';

function redirectToLogin(request: Request, message: string, returnUrl = '/') {
  const origin = new URL(request.url).origin;
  const url = new URL('/login', origin);
  url.searchParams.set('returnUrl', safeReturnUrl(returnUrl));
  url.searchParams.set('error', message);
  return NextResponse.redirect(url.toString());
}

/** 카카오 Redirect URI 콜백 — 토큰 교환 → Users 저장 → 세션 쿠키 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const kakaoError = searchParams.get('error');
  const kakaoErrorDescription = searchParams.get('error_description');

  if (kakaoError) {
    return redirectToLogin(
      request,
      kakaoErrorDescription ?? '카카오 로그인이 취소되었습니다.',
    );
  }

  if (!code || !state) {
    return redirectToLogin(request, '카카오 인증 정보가 올바르지 않습니다.');
  }

  let returnUrl = '/';
  try {
    ({ returnUrl } = await verifyKakaoOAuthState(state));
  } catch {
    return redirectToLogin(request, '로그인 세션이 만료되었습니다. 다시 시도해 주세요.');
  }

  try {
    const origin = new URL(request.url).origin;
    const redirectUri = getKakaoRedirectUri(origin);
    const accessToken = await exchangeKakaoCodeForToken(code, redirectUri);
    const profile = await fetchKakaoUserProfile(accessToken);

    const sessionUser = await completeKakaoLogin({
      kakaoId: profile.kakaoId,
      nickname: profile.nickname,
      region: defaultRegionCode(),
      avatarUrl: profile.avatarUrl,
    });

    const token = await createSessionToken(sessionUser);
    const user = await getUserById(sessionUser.id);
    const profileCompleted = user?.profileCompleted ?? false;

    const destination = profileCompleted
      ? safeReturnUrl(returnUrl)
      : `/profile/setup?returnUrl=${encodeURIComponent(safeReturnUrl(returnUrl))}`;

    const response = NextResponse.redirect(new URL(destination, origin).toString());
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error(error);
    return redirectToLogin(
      request,
      error instanceof Error ? error.message : '카카오 로그인 처리 중 오류가 발생했습니다.',
      returnUrl,
    );
  }
}
