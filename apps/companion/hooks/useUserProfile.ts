'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadUserProfile, saveUserProfile, type UserProfile } from '@/lib/user-profile';
import { DEFAULT_REGION_CODE } from '@/lib/regions';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfile(loadUserProfile());
    setReady(true);
  }, []);

  const login = useCallback(async (name: string, phone: string, region = DEFAULT_REGION_CODE) => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '로그인 실패');

      const next: UserProfile = {
        id: data.profile.id,
        name: data.profile.name,
        phone: data.profile.phone,
        region: data.profile.region,
        avatar_url: data.profile.avatar_url,
      };
      saveUserProfile(next);
      setProfile(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; phone: string; region?: string }) => {
      return login(input.name, input.phone, input.region ?? DEFAULT_REGION_CODE);
    },
    [login],
  );

  return { profile, ready, loading, login, updateProfile };
}
