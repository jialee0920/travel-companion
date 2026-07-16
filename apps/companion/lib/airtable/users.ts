import {
  getRegion,
  normalizeUserRegions,
  parseUserRegions,
  primaryRegion,
} from '@/lib/regions';
import { assertAirtableRegionField, buildAirtableRegionField } from '@/lib/regions/constants';
import {
  airtableAndFormula,
  airtableRegionFormula,
  isRegionFilterEnabled,
  resolveRegionForStorage,
} from '@/lib/region-filter';
import { normalizePhone } from '@/lib/user-profile';
import type { ProfileRow } from '@/lib/chat/types';
import {
  displayNickname,
  normalizeNicknameKey,
} from '@/lib/users/nickname';
import {
  createRecordNoTypecast,
  escapeAirtableFormula,
  getRecord,
  listRecords,
  updateRecordNoTypecast,
} from './client';
import { getAirtableConfig, requireAirtableConfig } from './config';

export class NicknameTakenError extends Error {
  constructor(message = '이미 사용 중인 별명이에요. 다른 별명을 입력해주세요') {
    super(message);
    this.name = 'NicknameTakenError';
  }
}

export type AirtableUserFields = {
  Phone?: string;
  /** 실명 — 결제/신원확인용, 화면 미노출 */
  Name?: string;
  /** 카카오 닉네임 등 공개 표시용 */
  Nickname?: string;
  Region?: string[];
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
  /** 실명 (Users.Name) */
  name: string;
  /** 공개 표시명 (Users.Nickname) */
  nickname: string;
  regions: string[];
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

/** 화면에 보여줄 이름 — Nickname만 사용 (실명 Name은 절대 노출하지 않음) */
export function userDisplayName(user: {
  nickname?: string | null;
  name?: string | null;
}): string {
  const nickname = user.nickname?.trim();
  if (nickname) return nickname;
  return '사용자';
}

/** 참여자 목록용 마스킹 (닉네임 첫 글자 + **) */
export function maskDisplayName(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return '**';
  return `${trimmed.slice(0, 1)}**`;
}

function sanitizeUserFieldsForAirtable(
  fields: Partial<AirtableUserFields>,
): Partial<AirtableUserFields> {
  const out: Partial<AirtableUserFields> = { ...fields };

  if (out.Region !== undefined) {
    const regionInput =
      typeof out.Region === 'string' ? out.Region : out.Region;
    const regionField = assertAirtableRegionField(buildAirtableRegionField(regionInput));
    if (regionField) {
      out.Region = regionField;
    } else {
      delete out.Region;
    }
  }

  return out;
}

function logAirtableUsersPayload(
  action: 'createRecord' | 'updateRecord',
  fields: Partial<AirtableUserFields>,
  recordId?: string,
): void {
  const httpPayload = recordId
    ? { records: [{ id: recordId, fields }] }
    : { records: [{ fields }] };

  console.log('[Airtable Users]', action, {
    ...(recordId ? { recordId } : {}),
    fields,
  });

  if (fields.Region !== undefined) {
    console.log('[Airtable Users] Region detail', {
      isArray: Array.isArray(fields.Region),
      raw: fields.Region,
      json: JSON.stringify(fields.Region),
      entries: Array.isArray(fields.Region)
        ? fields.Region.map((value, index) => ({
            index,
            value,
            typeof: typeof value,
            json: JSON.stringify(value),
          }))
        : [{ value: fields.Region, typeof: typeof fields.Region }],
    });
  }

  console.log('[Airtable Users] HTTP body', JSON.stringify(httpPayload));
}

async function createUserRecord(
  fields: Partial<AirtableUserFields>,
): Promise<AirtableRecord<AirtableUserFields>> {
  const config = requireAirtableConfig();
  const sanitized = sanitizeUserFieldsForAirtable(fields);
  logAirtableUsersPayload('createRecord', sanitized);
  return createRecordNoTypecast<AirtableUserFields>(config.usersTable, sanitized);
}

async function updateUserRecord(
  recordId: string,
  fields: Partial<AirtableUserFields>,
): Promise<AirtableRecord<AirtableUserFields>> {
  const config = requireAirtableConfig();
  const sanitized = sanitizeUserFieldsForAirtable(fields);
  logAirtableUsersPayload('updateRecord', sanitized, recordId);
  return updateRecordNoTypecast<AirtableUserFields>(config.usersTable, recordId, sanitized);
}

type AirtableRecord<T> = { id: string; fields: T };

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
    nickname: record.fields.Nickname ?? '',
    regions: parseUserRegions(record.fields.Region),
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
    name: userDisplayName(user),
    region: primaryRegion(user.regions),
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
    .sort((a, b) => userDisplayName(a).localeCompare(userDisplayName(b), 'ko'));
}

/** Nickname이 있는 모든 Users (시드 포함) — 중복 검사·감사 */
export async function listUsersWithNickname(): Promise<AirtableUser[]> {
  const config = requireAirtableConfig();
  const records = await listRecords<AirtableUserFields>(config.usersTable, {
    filterByFormula: `AND({Nickname}!="", LEN(TRIM({Nickname}))>0)`,
  });
  return records.map(mapUser);
}

/** 정규화 키 기준으로 닉네임 사용 중인지 (본인 제외) */
export async function isNicknameTaken(
  nickname: string,
  excludeUserId?: string,
): Promise<boolean> {
  const key = normalizeNicknameKey(nickname);
  if (!key) return false;

  const users = await listUsersWithNickname();
  return users.some(
    (user) =>
      user.id !== excludeUserId && normalizeNicknameKey(user.nickname) === key,
  );
}

/** 원하는 닉네임이 가능하면 그대로, 아니면 base2, base3… */
export async function allocateUniqueNickname(
  desired: string,
  excludeUserId?: string,
): Promise<string> {
  const base = displayNickname(desired) || '사용자';
  if (!(await isNicknameTaken(base, excludeUserId))) return base;

  for (let n = 2; n <= 99; n += 1) {
    const candidate = `${base}${n}`;
    if (!(await isNicknameTaken(candidate, excludeUserId))) return candidate;
  }

  return `${base}${Date.now().toString().slice(-4)}`;
}

/** 정규화 키별 중복 그룹 (기존 데이터 점검용) */
export async function findDuplicateNicknameGroups(): Promise<
  { key: string; users: { id: string; nickname: string }[] }[]
> {
  const users = await listUsersWithNickname();
  const byKey = new Map<string, { id: string; nickname: string }[]>();

  for (const user of users) {
    const key = normalizeNicknameKey(user.nickname);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push({ id: user.id, nickname: user.nickname });
    byKey.set(key, list);
  }

  return [...byKey.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, users: group }));
}

export async function upsertUser(input: {
  phone: string;
  name: string;
  region: string;
}): Promise<AirtableUser> {
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  const region = resolveRegionForStorage(input.region);

  const existing = await findUserByPhone(phone, region);
  if (existing) {
    if (existing.name === name) return existing;
    const updated = await updateUserRecord(existing.id, {
      Name: name,
    });
    return mapUser(updated);
  }

  const nickname = await allocateUniqueNickname(name);
  const regionField = buildAirtableRegionField([region]);
  const created = await createUserRecord({
    Phone: phone,
    Name: name,
    Nickname: nickname,
    ...(regionField ? { Region: regionField } : {}),
    'Auth Provider': 'phone',
  });
  return mapUser(created);
}

export async function upsertKakaoUser(input: {
  kakaoId: string;
  nickname: string;
  region: string;
  avatarUrl?: string | null;
}): Promise<AirtableUser> {
  const kakaoId = input.kakaoId.trim();
  const desired = displayNickname(input.nickname) || `카카오${kakaoId}`;
  const region = resolveRegionForStorage(input.region);

  const existing = await findUserByKakaoId(kakaoId);
  if (existing) {
    // 사용자가 설정한 Nickname은 보존. 비어 있을 때만 카카오 닉네임으로 채움.
    // Name·Avatar URL은 덮어쓰지 않음.
    const fields: Partial<AirtableUserFields> = {};
    if (!existing.nickname.trim() && desired) {
      fields.Nickname = await allocateUniqueNickname(desired, existing.id);
      console.info('[upsertKakaoUser] empty Nickname filled from Kakao', {
        userId: existing.id,
        nickname: fields.Nickname,
      });
    } else {
      console.info('[upsertKakaoUser] preserve existing Nickname', {
        userId: existing.id,
        existingNickname: existing.nickname,
        kakaoNickname: desired,
      });
    }
    if (Object.keys(fields).length === 0) return existing;
    const updated = await updateUserRecord(existing.id, fields);
    return mapUser(updated);
  }

  const nickname = await allocateUniqueNickname(desired);
  const regionField = buildAirtableRegionField([region]);
  const created = await createUserRecord({
    Nickname: nickname,
    ...(regionField ? { Region: regionField } : {}),
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
    regions?: string[];
    name?: string;
    nickname?: string;
    phone?: string;
    avatarUrl?: string | null;
  },
): Promise<AirtableUser> {
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
  if (input.regions !== undefined) {
    const normalized = normalizeUserRegions(input.regions);
    if (normalized.length === 0) {
      throw new Error('활동 지역을 하나 이상 선택해주세요.');
    }
    const regionField = buildAirtableRegionField(normalized);
    if (regionField) {
      fields.Region = regionField;
    }
  }
  if (input.name !== undefined) {
    fields.Name = input.name.trim();
  }
  if (input.nickname !== undefined) {
    const next = displayNickname(input.nickname);
    if (!next) {
      throw new Error('별명을 입력해주세요.');
    }
    const current = await getUserById(userId);
    const unchanged =
      current &&
      normalizeNicknameKey(current.nickname) === normalizeNicknameKey(next);
    if (!unchanged && (await isNicknameTaken(next, userId))) {
      throw new NicknameTakenError();
    }
    fields.Nickname = next;
  }
  if (input.phone !== undefined) {
    fields.Phone = normalizePhone(input.phone);
  }
  if (input.avatarUrl !== undefined) {
    fields['Avatar URL'] = input.avatarUrl?.trim() || undefined;
  }

  console.info('[updateUserProfile] writing fields', {
    userId,
    nickname: input.nickname,
    fieldKeys: Object.keys(fields),
  });

  await updateUserRecord(userId, fields);

  // PATCH 응답은 부분 필드일 수 있어 전체 레코드를 다시 조회
  const refreshed = await getUserById(userId);
  if (!refreshed) {
    throw new Error('프로필 저장 후 사용자를 찾을 수 없습니다.');
  }

  console.info('[updateUserProfile] saved Nickname', {
    userId,
    nickname: refreshed.nickname,
  });

  return refreshed;
}

export async function updateUserLocation(
  userId: string,
  lat: number,
  lng: number,
): Promise<AirtableUser> {
  const updated = await updateUserRecord(userId, {
    Latitude: lat,
    Longitude: lng,
    'Location Updated At': new Date().toISOString(),
  });

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

  const regionField = buildAirtableRegionField([regionCode]);
  const created = await createUserRecord({
    Phone: `seed:${companionSeedId}`,
    Nickname: companion.name,
    ...(regionField ? { Region: regionField } : {}),
    'Avatar URL': companion.avatar,
    'Companion Seed ID': companionSeedId,
  });
  return mapUser(created);
}
