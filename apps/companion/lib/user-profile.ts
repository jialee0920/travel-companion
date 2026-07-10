export type UserProfile = {
  id: string;
  /** 실명 (Users.Name) — 결제/프로필 입력용, 공개 화면 미사용 */
  name: string;
  /** 공개 표시명 (Users.Nickname) */
  nickname: string;
  phone: string;
  region: string;
  avatar_url?: string | null;
  bio?: string | null;
  interest_categories?: string[];
  profile_completed?: boolean;
  age?: number | null;
};

const STORAGE_KEY = 'mukho-user-profile';

export function loadUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearUserProfile(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** 화면에 보여줄 이름 — Nickname만 (실명 미노출) */
export function profileDisplayName(profile: {
  nickname?: string | null;
  name?: string | null;
}): string {
  const nickname = profile.nickname?.trim();
  if (nickname) return nickname;
  return '사용자';
}
