import { getKakaoClientSecret, getKakaoRestApiKey } from './kakao-config';

export type KakaoUserProfile = {
  kakaoId: string;
  nickname: string;
  avatarUrl: string | null;
};

type KakaoTokenResponse = {
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type KakaoMeResponse = {
  id?: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
  };
};

export async function exchangeKakaoCodeForToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: getKakaoRestApiKey(),
    redirect_uri: redirectUri,
    code,
  });

  const clientSecret = getKakaoClientSecret();
  if (clientSecret) {
    params.set('client_secret', clientSecret);
  }

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: params.toString(),
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => null)) as KakaoTokenResponse | null;
  if (!res.ok || !body?.access_token) {
    throw new Error(body?.error_description ?? body?.error ?? '카카오 토큰 발급 실패');
  }

  return body.access_token;
}

export async function fetchKakaoUserProfile(accessToken: string): Promise<KakaoUserProfile> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => null)) as KakaoMeResponse | null;
  if (!res.ok || body?.id == null) {
    throw new Error('카카오 사용자 정보를 가져오지 못했습니다.');
  }

  const profile = body.kakao_account?.profile;
  const nickname = profile?.nickname?.trim() || `카카오${body.id}`;
  const avatarUrl = profile?.profile_image_url ?? profile?.thumbnail_image_url ?? null;

  return {
    kakaoId: String(body.id),
    nickname,
    avatarUrl,
  };
}
