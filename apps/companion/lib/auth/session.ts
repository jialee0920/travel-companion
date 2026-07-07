import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC, requireAuthSessionSecret } from './constants';
import { defaultRegionCode } from '@/lib/region-filter';

export type SessionUser = {
  id: string;
  phone: string;
  name: string;
  region: string;
  airtableId?: string;
};

type SessionPayload = SessionUser & {
  sub: string;
};

function getSecretKey() {
  return new TextEncoder().encode(requireAuthSessionSecret());
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    phone: user.phone,
    name: user.name,
    region: user.region,
    airtableId: user.airtableId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, getSecretKey());
  const sub = payload.sub;
  if (typeof sub !== 'string') throw new Error('Invalid session');

  return {
    id: sub,
    phone: String(payload.phone ?? ''),
    name: String(payload.name ?? ''),
    region: String(payload.region ?? defaultRegionCode()),
    airtableId: payload.airtableId ? String(payload.airtableId) : undefined,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function sessionUserToProfile(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    region: user.region,
    avatar_url: null as string | null,
  };
}
