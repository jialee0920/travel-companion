'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Handshake,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  User,
  X,
  Zap,
} from 'lucide-react';
import { categoryLabel } from '@/lib/companions/build-list';
import type { CompanionListItem } from '@/lib/companions/types';
import { getCategoryBadgeClass } from '@/lib/design-system';
import { formatDistance, temperatureLabel } from '@/lib/geo';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TemperatureRing } from './TemperatureRing';

type Props = {
  companion: CompanionListItem | null;
  onClose: () => void;
};

export function CompanionDetailSheet({ companion, onClose }: Props) {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
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
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setStarting(true);
    try {
      const body =
        companion.kind === 'real' && companion.peerProfileId
          ? {
              myProfileId: profile.id,
              peerProfileId: companion.peerProfileId,
              ...(profile.region ? { region: profile.region } : {}),
            }
          : {
              myProfileId: profile.id,
              companionSeedId: companion.companionSeedId ?? companion.id,
              ...(profile.region ? { region: profile.region } : {}),
            };

      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const hasTemperature = companion.temperature != null;
  const tone = hasTemperature ? temperatureLabel(companion.temperature!) : null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />

      <div className="relative max-h-[86%] overflow-y-auto rounded-t-[2rem] border-t border-border bg-background pb-36 shadow-2xl">
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
            {companion.avatar ? (
              <span className="relative size-24 overflow-hidden rounded-full border-4 border-card shadow-md">
                <Image
                  src={companion.avatar}
                  alt={`${companion.name} 프로필`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </span>
            ) : (
              <span className="flex size-24 items-center justify-center rounded-full border-4 border-card bg-primary/10 text-primary shadow-md">
                <User className="size-10" />
              </span>
            )}
            <h2 className="mt-3 text-xl font-bold">
              {companion.name}
              {companion.age != null && (
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  만 {companion.age}세
                </span>
              )}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {companion.area} · 약 {formatDistance(companion.distanceKm)}
              {companion.activityLabel && (
                <span
                  className={
                    companion.activityActive
                      ? 'font-medium text-success'
                      : undefined
                  }
                >
                  · {companion.activityLabel}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mx-5 mt-5 flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
          {hasTemperature ? (
            <TemperatureRing temperature={companion.temperature!} size={84} stroke={8} />
          ) : (
            <span className="flex size-[84px] shrink-0 items-center justify-center rounded-full border border-border bg-muted text-2xl font-bold text-muted-foreground">
              -
            </span>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">동행 온도</p>
            {hasTemperature && tone ? (
              <p className="text-lg font-bold" style={{ color: tone.color }}>
                {tone.label}
              </p>
            ) : (
              <p className="text-lg font-bold text-muted-foreground">준비 중</p>
            )}
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {hasTemperature
                ? '함께할 때의 케미 지표예요. 화면 사용 중 위치로 거리·방향을 갱신합니다.'
                : '동행 온도는 추후 제공될 예정이에요.'}
            </p>
          </div>
        </div>

        {companion.kind === 'mock' && companion.matches != null && companion.responseRate != null && (
          <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Handshake className="size-3.5" /> 동행 성공
              </p>
              <p className="mt-1 text-lg font-bold">{companion.matches}회</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="size-3.5" /> 응답률
              </p>
              <p className="mt-1 text-lg font-bold">{companion.responseRate}%</p>
            </div>
          </div>
        )}

        <div className="mx-5 mt-5">
          <h3 className="text-sm font-semibold">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${getCategoryBadgeClass(companion.primaryCategory)}`}>
              {categoryLabel(companion)}
            </span>{' '}
            {companion.headline}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{companion.bio}</p>
        </div>

        {companion.tags.length > 0 && (
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
        )}

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
            disabled={starting || !ready}
            onClick={handleChatStart}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
          >
            {starting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <MessageCircle className="size-5" />
                {companion.kind === 'real' ? '채팅하기' : '동행 신청하기'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
