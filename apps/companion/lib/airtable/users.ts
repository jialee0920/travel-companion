import { getRegion } from '@/lib/regions';
import {
  airtableAndFormula,
  airtableRegionFormula,
  isRegionFilterEnabled,
  resolveRegionForStorage,
} from '@/lib/region-filter';
import { normalizePhone } from '@/lib/user-profile';
import type { ProfileRow } from '@/lib/chat/types';
import {
  createRecord,
  escapeAirtableFormula,
  getRecord,
  listRecords,
  updateRecord,
} from './client';
import { getAirtableConfig, requireAirtableConfig } from './config';

export type AirtableUserFields = {
  Phone?: string;
  Name?: string;
  Region?: string;
  'Avatar URL'?: string;
  'Companion Seed ID'?: string;
  Bio?: string;
  'Interest Category'?: string[];
  'Profile Completed'?: boolean;
  Age?: number;
  Latitude?: number;
  Longitude?: number;
  'Location Updated At'?: string;
  'Kakao ID'?: string;
  'Auth Provider'?: 'phone' | 'kakao';
};

export type AirtableUser = {
  id: string;
  phone: string;
  name: string;
  region: string;
  avatarUrl: string | null;
  companionSeedId: string | null;
  bio: string | null;
  interestCategories: string[];
  profileCompleted: boolean;
  age: number | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  kakaoId: string | null;
  authProvider: 'phone' | 'kakao' | null;
};

function parseNumberField(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function mapUser(record: { id: string; fields: AirtableUserFields }): AirtableUser {
  return {
    id: record.id,
    phone: record.fields.Phone ?? '',
    name: record.fields.Name ?? '',
    region: record.fields.Region ?? '',
    avatarUrl: record.fields['Avatar URL'] ?? null,
    companionSeedId: record.fields['Companion Seed ID'] ?? null,
    bio: record.fields.Bio?.trim() || null,
    interestCategories: record.fields['Interest Category'] ?? [],
    profileCompleted: record.fields['Profile Completed'] === true,
    age: parseNumberField(record.fields.Age),
    latitude: parseNumberField(record.fields.Latitude),
    longitude: parseNumberField(record.fields.Longitude),
    locationUpdatedAt: record.fields['Location Updated At'] ?? null,
    kakaoId: record.fields['Kakao ID']?.trim() || null,
    authProvider: record.fields['Auth Provider'] ?? null,
  };
}

export function toProfileRow(user: AirtableUser, createdAt?: string): ProfileRow {
  const now = new Date().toISOString();
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    region: user.region,
    avatar_url: user.avatarUrl,
    companion_seed_id: user.companionSeedId,
    created_at: createdAt ?? now,
    updated_at: now,
  };
}

export async function getUserById(id: string): Promise<AirtableUser | null> {
  const config = getAirtableConfig();
  if (!config) return null;

  try {
    const record = await getRecord<AirtableUserFields>(config.usersTable, id);
    return mapUser(record);
  } catch {
    return null;
  }
}

export async function findUserByCompanionSeedId(
  companionSeedId: string,
): Promise<AirtableUser | null> {
  const config = getAirtableConfig();
  if (!config) return null;

  const formula = `{Companion Seed ID}="${escapeAirtableFormula(companionSeedId)}"`;
  const records = await listRecords<AirtableUserFields>(config.usersTable, {
    filterByFormula: formula,
    maxRecords: 1,
  });

  if (records.length === 0) return null;
  return mapUser(records[0]);
}

export async function findUserByKakaoId(kakaoId: string): Promise<AirtableUser | null> {
  const config = getAirtableConfig();
  if (!config) return null;

  const formula = `{Kakao ID}="${escapeAirtableFormula(kakaoId)}"`;
  const records = await listRecords<AirtableUserFields>(config.usersTable, {
    filterByFormula: formula,
    maxRecords: 1,
  });

  if (records.length === 0) return null;
  return mapUser(records[0]);
}

export async function findUserByPhone(phone: string, region: string): Promise<AirtableUser | null> {
  const config = getAirtableConfig();
  if (!config) return null;

  const normalized = normalizePhone(phone);
  const formula = airtableAndFormula(
    `{Phone}="${escapeAirtableFormula(normalized)}"`,
    airtableRegionFormula(region, escapeAirtableFormula),
  );
  const records = await listRecords<AirtableUserFields>(config.usersTable, {
    filterByFormula: formula,
    maxRecords: 1,
  });

  if (records.length === 0) return null;
  return mapUser(records[0]);
}

/** 실제 가입자 — ENABLE_REGION_FILTER=true 일 때만 Region 조건 적용 */
export async function listRealUsers(
  region: string,
  excludeUserId?: string,
): Promise<AirtableUser[]> {
  if (!isRegionFilterEnabled()) {
    return listAllRealUsers(excludeUserId);
  }

  const config = requireAirtableConfig();
  const formula = airtableRegionFormula(region, escapeAirtableFormula);
  const records = await listRecords<AirtableUserFields>(config.usersTable, {
    filterByFormula: formula,
  });

  return filterRealUsers(records.map(mapUser), excludeUserId);
}

/** Region 무관 — 지도 nearby·전체 실가입자 목록용 */
export async function listAllRealUsers(excludeUserId?: string): Promise<AirtableUser[]> {
  const config = requireAirtableConfig();
  const records = await listRecords<AirtableUserFields>(config.usersTable, {});

  return filterRealUsers(records.map(mapUser), excludeUserId);
}

function isRealUser(user: AirtableUser): boolean {
  if (user.companionSeedId) return false;
  const phone = user.phone.trim();
  if (phone.startsWith('seed:')) return false;
  if (user.kakaoId) return true;
  if (phone) return true;
  return false;
}

function filterRealUsers(users: AirtableUser[], excludeUserId?: string): AirtableUser[] {
  return users
    .filter((user) => isRealUser(user) && user.id !== excludeUserId)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export async function upsertUser(input: {
  phone: string;
  name: string;
  region: string;
}): Promise<AirtableUser> {
  const config = requireAirtableConfig();
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const region = resolveRegionForStorage(input.region);

  const existing = await findUserByPhone(phone, region);
  if (existing) {
    if (existing.name === name) return existing;
    const updated = await updateRecord<AirtableUserFields>(config.usersTable, existing.id, {
      Name: name,
    });
    return mapUser(updated);
  }

  const created = await createRecord<AirtableUserFields>(config.usersTable, {
    Phone: phone,
    Name: name,
    Region: region,
    'Auth Provider': 'phone',
  });
  return mapUser(created);
}

export async function upsertKakaoUser(input: {
  kakaoId: string;
  name: string;
  region: string;
  avatarUrl?: string | null;
}): Promise<AirtableUser> {
  const config = requireAirtableConfig();
  const kakaoId = input.kakaoId.trim();
  const name = input.name.trim() || `카카오${kakaoId}`;
  const region = resolveRegionForStorage(input.region);

  const existing = await findUserByKakaoId(kakaoId);
  if (existing) {
    const fields: Partial<AirtableUserFields> = {};
    if (existing.name !== name) fields.Name = name;
    if (input.avatarUrl && existing.avatarUrl !== input.avatarUrl) {
      fields['Avatar URL'] = input.avatarUrl;
    }
    if (Object.keys(fields).length === 0) return existing;
    const updated = await updateRecord<AirtableUserFields>(config.usersTable, existing.id, fields);
    return mapUser(updated);
  }

  const created = await createRecord<AirtableUserFields>(config.usersTable, {
    Name: name,
    Region: region,
    'Kakao ID': kakaoId,
    'Auth Provider': 'kakao',
    'Avatar URL': input.avatarUrl ?? undefined,
  });
  return mapUser(created);
}

export async function updateUserProfile(
  userId: string,
  input: {
    bio?: string | null;
    interestCategories?: string[];
    profileCompleted?: boolean;
    age?: number | null;
    region?: string;
  },
): Promise<AirtableUser> {
  const config = requireAirtableConfig();
  const fields: Partial<AirtableUserFields> = {};

  if (input.bio !== undefined) {
    fields.Bio = input.bio?.trim() || undefined;
  }
  if (input.interestCategories !== undefined) {
    fields['Interest Category'] = input.interestCategories;
  }
  if (input.profileCompleted !== undefined) {
    fields['Profile Completed'] = input.profileCompleted;
  }
  if (input.age !== undefined) {
    fields.Age = input.age ?? undefined;
  }
  if (input.region !== undefined) {
    fields.Region = resolveRegionForStorage(input.region);
  }

  const updated = await updateRecord<AirtableUserFields>(config.usersTable, userId, fields);
  return mapUser(updated);
}

export async function updateUserLocation(
  userId: string,
  lat: number,
  lng: number,
): Promise<AirtableUser> {
  const config = requireAirtableConfig();
  const updated = await updateRecord<AirtableUserFields>(
    config.usersTable,
    userId,
    {
      Latitude: lat,
      Longitude: lng,
      'Location Updated At': new Date().toISOString(),
    },
    { typecast: true },
  );

  const mapped = mapUser(updated);
  if (
    mapped.latitude == null ||
    mapped.longitude == null ||
    mapped.locationUpdatedAt == null
  ) {
    throw new Error(
      'Airtable에 위치가 저장되지 않았습니다. Users 테이블 필드명·타입을 확인하세요: ' +
        'Latitude(Number), Longitude(Number), Location Updated At(Date · 시간 포함).',
    );
  }

  return mapped;
}

/** 1시간 이내 위치 갱신된 실가입자 (Region 무관, 5km 반경 필터는 클라이언트) */
export async function listNearbyActiveUsers(excludeUserId?: string): Promise<AirtableUser[]> {
  const oneHourAgoMs = Date.now() - 60 * 60 * 1000;
  const users = await listAllRealUsers(excludeUserId);

  return users.filter((user) => {
    if (user.latitude == null || user.longitude == null || !user.locationUpdatedAt) {
      return false;
    }
    const updatedMs = new Date(user.locationUpdatedAt).getTime();
    return !Number.isNaN(updatedMs) && updatedMs >= oneHourAgoMs;
  });
}

export async function getOrCreateCompanionUser(
  companionSeedId: string,
  regionCode: string,
): Promise<AirtableUser> {
  const existing = await findUserByCompanionSeedId(companionSeedId);
  if (existing) return existing;

  const region = getRegion(regionCode);
  const companion = region.companions.find((c) => c.id === companionSeedId);
  if (!companion) throw new Error('동행자를 찾을 수 없습니다.');

  const config = requireAirtableConfig();
  const created = await createRecord<AirtableUserFields>(config.usersTable, {
    Phone: `seed:${companionSeedId}`,
    Name: companion.name,
    Region: regionCode,
    'Avatar URL': companion.avatar,
    'Companion Seed ID': companionSeedId,
  });
  return mapUser(created);
}
