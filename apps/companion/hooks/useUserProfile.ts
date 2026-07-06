'use client';

import { useCallback, useEffect, useState } from 'react';
import { clearUserProfile, type UserProfile } from '@/lib/user-profile';
import { DEFAULT_REGION_CODE } from '@/lib/regions';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setProfile(data.user ?? null);
    } catch {
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (name: string, phone: string, region = DEFAULT_REGION_CODE) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '로그인 실패');

      const next: UserProfile = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        region: data.user.region,
        avatar_url: data.user.avatar_url,
      };
      setProfile(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      clearUserProfile();
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, ready, loading, refresh, login, logout };
}
