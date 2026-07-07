export function getKakaoRestApiKey(): string {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) {
    throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
  }
  return key;
}

export function getKakaoClientSecret(): string | undefined {
  const secret = process.env.KAKAO_CLIENT_SECRET?.trim();
  return secret || undefined;
}

/** 카카오디벨로퍼스에 등록한 Redirect URI와 정확히 일치해야 함 */
export function getKakaoRedirectUri(origin?: string): string {
  const configured = process.env.KAKAO_REDIRECT_URI?.trim();
  if (configured) return configured;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (appUrl) return `${appUrl}/api/auth/kakao/callback`;

  if (origin) return `${origin.replace(/\/$/, '')}/api/auth/kakao/callback`;

  return 'https://travel-companion-companion-black.vercel.app/api/auth/kakao/callback';
}

export function isKakaoLoginConfigured(): boolean {
  return Boolean(process.env.KAKAO_REST_API_KEY?.trim());
}
