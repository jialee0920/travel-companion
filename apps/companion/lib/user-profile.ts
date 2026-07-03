export type UserProfile = {
  id: string;
  name: string;
  phone: string;
  region: string;
  avatar_url?: string | null;
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
