'use client';

import { useEffect, useState } from 'react';
import {
  publicUserToProfilePerson,
  UserProfileSheet,
  type PublicUserProfile,
} from '@/components/UserProfileSheet';

type Props = {
  userId: string | null;
  chatActive?: boolean;
  onClose: () => void;
};

/** userId로 공개 프로필을 불러와 UserProfileSheet 표시 */
export function PeerProfileSheet({ userId, chatActive = false, onClose }: Props) {
  const [person, setPerson] = useState<ReturnType<typeof publicUserToProfilePerson> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setPerson(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setPerson(null);

    fetch(`/api/users/${encodeURIComponent(userId)}/profile`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '프로필 조회 실패');
        return data.user as PublicUserProfile;
      })
      .then((user) => {
        if (cancelled) return;
        setPerson(publicUserToProfilePerson(user));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '프로필 조회 실패');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  if (loading && !person) {
    return (
      <UserProfileSheet
        person={{
          userId,
          name: '불러오는 중…',
          avatarUrl: null,
          age: null,
          locationLabel: null,
          bio: '',
          interestCategories: [],
        }}
        chatActive={chatActive}
        onClose={onClose}
      />
    );
  }

  if (error && !person) {
    return (
      <UserProfileSheet
        person={{
          userId,
          name: '프로필',
          avatarUrl: null,
          age: null,
          locationLabel: null,
          bio: error,
          interestCategories: [],
        }}
        chatActive={chatActive}
        onClose={onClose}
      />
    );
  }

  return (
    <UserProfileSheet person={person} chatActive={chatActive} onClose={onClose} />
  );
}
