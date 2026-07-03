import { getRegion } from '@/lib/regions';
import { normalizePhone } from '@/lib/user-profile';
import { getSupabaseAdmin, requireSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProfileRow } from '@/lib/supabase/types';

const memoryProfiles = new Map<string, ProfileRow>();

function memKey(phone: string, region: string) {
  return `${region}:${normalizePhone(phone)}`;
}

export async function upsertProfile(input: {
  name: string;
  phone: string;
  region: string;
}): Promise<ProfileRow> {
  const supabase = getSupabaseAdmin();
  const phone = input.phone.trim();
  const name = input.name.trim();
  const region = input.region;

  if (supabase) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .eq('region', region)
      .is('companion_seed_id', null)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ProfileRow;
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({ phone, name, region })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ProfileRow;
  }

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
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as ProfileRow | null;
  }
  return [...memoryProfiles.values()].find((p) => p.id === id) ?? null;
}

/** 지역 동행자(mock)를 profiles에 시드하고 profile row 반환 */
export async function getOrCreateCompanionProfile(
  companionSeedId: string,
  regionCode: string,
): Promise<ProfileRow> {
  const supabase = getSupabaseAdmin();
  const region = getRegion(regionCode);
  const companion = region.companions.find((c) => c.id === companionSeedId);
  if (!companion) throw new Error('동행자를 찾을 수 없습니다.');

  if (supabase) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('companion_seed_id', companionSeedId)
      .maybeSingle();

    if (existing) return existing as ProfileRow;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        phone: `seed:${companionSeedId}`,
        name: companion.name,
        region: regionCode,
        avatar_url: companion.avatar,
        companion_seed_id: companionSeedId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ProfileRow;
  }

  const key = `seed:${companionSeedId}`;
  if (memoryProfiles.has(key)) return memoryProfiles.get(key)!;

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
  const region = getRegion(regionCode);
  return Promise.all(region.companions.map((c) => getOrCreateCompanionProfile(c.id, regionCode)));
}

export { requireSupabaseAdmin };
