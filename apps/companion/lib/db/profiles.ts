import { getAirtableConfig } from '@/lib/airtable/config';
import {
  getOrCreateCompanionUser,
  getUserById,
  toProfileRow,
  upsertUser,
} from '@/lib/airtable/users';
import type { ProfileRow } from '@/lib/chat/types';
import { isRegionFilterEnabled, resolveRegionForStorage } from '@/lib/region-filter';

const memoryProfiles = new Map<string, ProfileRow>();

function memKey(phone: string, region: string) {
  const normalized = phone.replace(/\D/g, '');
  // ENABLE_REGION_FILTER=true 일 때만 region+phone 복합 키
  if (isRegionFilterEnabled()) return `${region}:${normalized}`;
  return normalized;
}

export async function upsertProfile(input: {
  name: string;
  phone: string;
  region: string;
}): Promise<ProfileRow> {
  if (getAirtableConfig()) {
    const user = await upsertUser(input);
    return toProfileRow(user);
  }

  const phone = input.phone.trim();
  const name = input.name.trim();
  const region = resolveRegionForStorage(input.region);
  const key = memKey(phone, region);
  const row: ProfileRow = {
    id: memoryProfiles.get(key)?.id ?? crypto.randomUUID(),
    phone,
    name,
    region,
    avatar_url: null,
    companion_seed_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  memoryProfiles.set(key, row);
  return row;
}

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  if (getAirtableConfig()) {
    const user = await getUserById(id);
    return user ? toProfileRow(user) : null;
  }
  return [...memoryProfiles.values()].find((p) => p.id === id) ?? null;
}

export async function getOrCreateCompanionProfile(
  companionSeedId: string,
  regionCode: string,
): Promise<ProfileRow> {
  if (getAirtableConfig()) {
    const user = await getOrCreateCompanionUser(companionSeedId, regionCode);
    return toProfileRow(user);
  }

  const key = `seed:${companionSeedId}`;
  if (memoryProfiles.has(key)) return memoryProfiles.get(key)!;

  const { getRegion } = await import('@/lib/regions');
  const region = getRegion(regionCode);
  const companion = region.companions.find((c) => c.id === companionSeedId);
  if (!companion) throw new Error('동행자를 찾을 수 없습니다.');

  const row: ProfileRow = {
    id: crypto.randomUUID(),
    phone: `seed:${companionSeedId}`,
    name: companion.name,
    region: regionCode,
    avatar_url: companion.avatar,
    companion_seed_id: companionSeedId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  memoryProfiles.set(key, row);
  return row;
}

export async function seedAllCompanionProfiles(regionCode: string): Promise<ProfileRow[]> {
  const { getRegion } = await import('@/lib/regions');
  const region = getRegion(regionCode);
  return Promise.all(region.companions.map((c) => getOrCreateCompanionProfile(c.id, regionCode)));
}
