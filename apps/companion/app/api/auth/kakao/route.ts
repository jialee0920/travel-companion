import { NextResponse } from 'next/server';
import { createKakaoOAuthState, safeReturnUrl } from '@/lib/auth/kakao-oauth-state';
import { getKakaoRedirectUri, getKakaoRestApiKey, isKakaoLoginConfigured } from '@/lib/auth/kakao-config';

/** 카카오 OAuth 시작 — 카카오 인증 화면으로 리다이렉트 */
export async function GET(request: Request) {
  if (!isKakaoLoginConfigured()) {
    return NextResponse.json(
      { error: '카카오 로그인이 설정되지 않았습니다. KAKAO_REST_API_KEY를 확인하세요.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'));
  const origin = new URL(request.url).origin;
  const redirectUri = getKakaoRedirectUri(origin);
  const state = await createKakaoOAuthState(returnUrl);

  const authorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', getKakaoRestApiKey());
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);

  return NextResponse.redirect(authorizeUrl.toString());
}
