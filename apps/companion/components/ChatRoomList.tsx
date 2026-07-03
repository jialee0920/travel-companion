'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, MessageCircle, Plus } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getRegion, DEFAULT_REGION_CODE } from '@/lib/regions';
import type { ChatRoomWithPeer } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

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
  const { profile, ready, loading, login } = useUserProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rooms, setRooms] = useState<ChatRoomWithPeer[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const region = getRegion();

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    await login(name.trim(), phone.trim(), DEFAULT_REGION_CODE);
  }

  async function startChat(companionSeedId: string) {
    if (!profile?.id) return;
    setStartingId(companionSeedId);
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myProfileId: profile.id,
          companionSeedId,
          region: DEFAULT_REGION_CODE,
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

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <form onSubmit={handleLogin} className="flex flex-col gap-4 px-4 pb-28 pt-2">
        <p className="text-sm text-muted-foreground">
          동행자와 1:1 채팅을 하려면 이름과 연락처를 입력해주세요.
        </p>
        <label className="block">
          <span className="text-sm font-medium">이름</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">연락처</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : '시작하기'}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-28 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{profile.name}님의 대화</p>
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
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">동행자 선택</p>
          <div className="flex flex-col gap-2">
            {region.companions.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={startingId === c.id}
                onClick={() => startChat(c.id)}
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
                    <span className="shrink-0 text-[10px] text-muted-foreground">
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
