'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Handshake, Heart, MapPin, MessageCircle, X, Zap } from 'lucide-react';
import type { RegionCompanion } from '@/lib/regions/types';
import { CATEGORY_LABELS } from '@/lib/regions/types';
import { formatDistance, temperatureLabel } from '@/lib/geo';
import { TemperatureRing } from './TemperatureRing';

type Props = {
  companion: RegionCompanion | null;
  liveDistanceKm?: number;
  onClose: () => void;
};

export function CompanionDetailSheet({ companion, liveDistanceKm, onClose }: Props) {
  useEffect(() => {
    if (!companion) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [companion, onClose]);

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
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground"
          >
            <MessageCircle className="size-5" />
            동행 신청하기
          </button>
        </div>
      </div>
    </div>
  );
}
