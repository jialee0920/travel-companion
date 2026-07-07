import { SignJWT, jwtVerify } from 'jose';
import { requireAuthSessionSecret } from './constants';

type OAuthStatePayload = {
  returnUrl: string;
};

function getSecretKey() {
  return new TextEncoder().encode(requireAuthSessionSecret());
}

export async function createKakaoOAuthState(returnUrl: string): Promise<string> {
  return new SignJWT({ returnUrl })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getSecretKey());
}

export async function verifyKakaoOAuthState(state: string): Promise<OAuthStatePayload> {
  const { payload } = await jwtVerify(state, getSecretKey());
  const returnUrl = payload.returnUrl;
  if (typeof returnUrl !== 'string') {
    throw new Error('Invalid OAuth state');
  }
  return { returnUrl };
}

export function safeReturnUrl(url: string | null | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}
