import { normalizePhone } from '@/lib/user-profile';
import { upsertUser } from '@/lib/airtable/users';
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
