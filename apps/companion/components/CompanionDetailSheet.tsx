'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Handshake, Heart, Loader2, MapPin, MessageCircle, X, Zap } from 'lucide-react';
import type { RegionCompanion } from '@/lib/regions/types';
import { CATEGORY_LABELS } from '@/lib/regions/types';
import { formatDistance, temperatureLabel } from '@/lib/geo';
import { DEFAULT_REGION_CODE } from '@/lib/regions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TemperatureRing } from './TemperatureRing';

type Props = {
  companion: RegionCompanion | null;
  liveDistanceKm?: number;
  onClose: () => void;
};

export function CompanionDetailSheet({ companion, liveDistanceKm, onClose }: Props) {
  const router = useRouter();
  const { profile, login, loading } = useUserProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!companion) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [companion, onClose]);

  async function handleChatStart() {
    if (!companion) return;

    if (!profile) {
      setShowLogin(true);
      return;
    }

    setStarting(true);
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myProfileId: profile.id,
          companionSeedId: companion.id,
          region: DEFAULT_REGION_CODE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '채팅방 생성 실패');
      onClose();
      router.push(`/chat/${data.room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '채팅을 시작할 수 없습니다.');
    } finally {
      setStarting(false);
    }
  }

  async function handleLoginAndChat(e: React.FormEvent) {
    e.preventDefault();
    if (!companion || !name.trim() || !phone.trim()) return;

    try {
      const loggedIn = await login(name.trim(), phone.trim(), DEFAULT_REGION_CODE);
      setShowLogin(false);
      setStarting(true);
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myProfileId: loggedIn.id,
          companionSeedId: companion.id,
          region: DEFAULT_REGION_CODE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '채팅방 생성 실패');
      onClose();
      router.push(`/chat/${data.room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '채팅을 시작할 수 없습니다.');
    } finally {
      setStarting(false);
    }
  }

  if (!companion) return null;

  const tone = temperatureLabel(companion.temperature);
  const distance = liveDistanceKm ?? companion.distanceKm;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />

      {showLogin && (
        <div className="relative z-50 mx-5 mb-4 rounded-2xl border border-border bg-background p-4 shadow-xl">
          <p className="text-sm font-semibold">채팅을 시작하려면 확인이 필요해요</p>
          <form onSubmit={handleLoginAndChat} className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              required
            />
            <input
              type="tel"
              placeholder="연락처"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              required
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="h-10 flex-1 rounded-xl border border-border text-sm"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || starting}
                className="flex h-10 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-70"
              >
                {loading || starting ? <Loader2 className="size-4 animate-spin" /> : '시작'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative max-h-[86%] overflow-y-auto rounded-t-[2rem] border-t border-border bg-background pb-24 shadow-2xl">
        <div className="sticky top-0 flex justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </div>

        <div className="relative px-5 pt-2">
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="absolute right-5 top-2 flex size-9 items-center justify-center rounded-full bg-secondary"
          >
            <X className="size-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <span className="relative size-24 overflow-hidden rounded-full border-4 border-card shadow-md">
              <Image
                src={companion.avatar}
                alt={`${companion.name} 프로필`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </span>
            <h2 className="mt-3 text-xl font-bold">
              {companion.name}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                {companion.age}세
              </span>
            </h2>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {companion.area} · 약 {formatDistance(distance)}
            </p>
          </div>
        </div>

        <div className="mx-5 mt-5 flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
          <TemperatureRing temperature={companion.temperature} size={84} stroke={8} />
          <div>
            <p className="text-xs font-medium text-muted-foreground">동행 온도</p>
            <p className="text-lg font-bold" style={{ color: tone.color }}>
              {tone.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              함께할 때의 케미 지표예요. 화면 사용 중 위치로 거리·방향을 갱신합니다.
            </p>
          </div>
        </div>

        <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Handshake className="size-3.5" /> 동행 성공
            </p>
            <p className="mt-1 text-lg font-bold">{companion.matches}회</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="size-3.5" /> 응답률
            </p>
            <p className="mt-1 text-lg font-bold">{companion.responseRate}%</p>
          </div>
        </div>

        <div className="mx-5 mt-5">
          <h3 className="text-sm font-semibold">
            <span className="rounded-md bg-accent px-1.5 py-0.5 text-accent-foreground">
              {CATEGORY_LABELS[companion.category]}
            </span>{' '}
            {companion.headline}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{companion.bio}</p>
        </div>

        <div className="mx-5 mt-4 flex flex-wrap gap-2">
          {companion.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
          <button
            type="button"
            aria-label="좋아요"
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-primary"
          >
            <Heart className="size-5" />
          </button>
          <button
            type="button"
            disabled={starting}
            onClick={handleChatStart}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
          >
            {starting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <MessageCircle className="size-5" />
                동행 신청하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
