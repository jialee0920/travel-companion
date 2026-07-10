'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle, Plus, User } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getRegion } from '@/lib/regions';
import type { ChatRoomWithPeer } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

type RealUser = {
  id: string;
  name: string;
  phone: string;
};

function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function ChatRoomList() {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [rooms, setRooms] = useState<ChatRoomWithPeer[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [realUsers, setRealUsers] = useState<RealUser[]>([]);
  const [loadingRealUsers, setLoadingRealUsers] = useState(false);

  const region = getRegion();

  useEffect(() => {
    if (!ready || !profile) return;
    if (!profile.profile_completed) {
      router.replace(`/profile/setup?returnUrl=${encodeURIComponent('/chat')}`);
    }
  }, [ready, profile, router]);

  const loadRooms = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingRooms(true);
    try {
      const res = await fetch(`/api/chat/rooms?profileId=${encodeURIComponent(profile.id)}`);
      const data = await res.json();
      if (data.rooms) setRooms(data.rooms);
    } finally {
      setLoadingRooms(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!showNew || !profile?.id) return;

    let cancelled = false;
    setLoadingRealUsers(true);

    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.users) setRealUsers(data.users);
      })
      .finally(() => {
        if (!cancelled) setLoadingRealUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showNew, profile?.id]);

  async function startChatWithSeed(companionSeedId: string) {
    if (!profile?.id) return;
    setStartingId(companionSeedId);
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myProfileId: profile.id,
          companionSeedId,
          ...(profile.region ? { region: profile.region } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '채팅방 생성 실패');
      window.location.href = `/chat/${data.room.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : '채팅을 시작할 수 없습니다.');
    } finally {
      setStartingId(null);
    }
  }

  async function startChatWithPeer(peerProfileId: string) {
    if (!profile?.id) return;
    setStartingId(peerProfileId);
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myProfileId: profile.id,
          peerProfileId,
          ...(profile.region ? { region: profile.region } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '채팅방 생성 실패');
      window.location.href = `/chat/${data.room.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : '채팅을 시작할 수 없습니다.');
    } finally {
      setStartingId(null);
    }
  }

  if (!ready || !profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {profile.nickname || '사용자'}님의 대화
        </p>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <Plus className="size-3.5" />
          새 대화
        </button>
      </div>

      {showNew && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Mock 동행자</p>
            <div className="flex flex-col gap-2">
              {region.companions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={startingId === c.id}
                  onClick={() => startChatWithSeed(c.id)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-secondary/50 disabled:opacity-60"
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
                    <Image src={c.avatar} alt="" fill className="object-cover" sizes="40px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.headline}</span>
                  </span>
                  {startingId === c.id ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <MessageCircle className="size-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">가입한 동행자</p>
            {loadingRealUsers ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : realUsers.length === 0 ? (
              <p className="rounded-xl bg-secondary px-3 py-4 text-center text-sm text-muted-foreground">
                아직 다른 가입자가 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {realUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={startingId === u.id}
                    onClick={() => startChatWithPeer(u.id)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-secondary/50 disabled:opacity-60"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{u.name}</span>
                    </span>
                    {startingId === u.id ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <MessageCircle className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loadingRooms ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <MessageCircle className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">아직 대화가 없습니다.</p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="mt-2 text-sm font-medium text-primary"
          >
            동행자에게 메시지 보내기
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link
                href={`/chat/${room.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/30"
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                  {room.peer.avatar_url ? (
                    <Image
                      src={room.peer.avatar_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-lg font-bold text-primary">
                      {room.peer.name.slice(0, 1)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{room.peer.name}</span>
                    <span className="shrink-0 text-micro text-muted-foreground">
                      {formatTime(room.last_message_at ?? room.created_at)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block truncate text-sm',
                      room.last_message ? 'text-muted-foreground' : 'text-muted-foreground/60',
                    )}
                  >
                    {room.last_message ?? '대화를 시작해보세요'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
