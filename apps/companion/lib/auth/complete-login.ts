import { normalizePhone } from '@/lib/user-profile';
import { upsertKakaoUser, upsertUser } from '@/lib/airtable/users';
import type { SessionUser } from './session';

export async function completeLogin(input: {
  name: string;
  phone: string;
  region: string;
}): Promise<SessionUser> {
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const region = input.region;

  const user = await upsertUser({ phone, name, region });

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    region: user.region,
    airtableId: user.id,
  };
}

export async function completeKakaoLogin(input: {
  kakaoId: string;
  name: string;
  region: string;
  avatarUrl?: string | null;
}): Promise<SessionUser> {
  const user = await upsertKakaoUser(input);

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    region: user.region,
    airtableId: user.id,
  };
}
