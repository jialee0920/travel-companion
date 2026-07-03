import Image from 'next/image';
import type { RegionCompanion } from '@/lib/regions/types';
import { CATEGORY_LABELS } from '@/lib/regions/types';
import { formatDistance } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { TemperatureRing } from './TemperatureRing';

type Props = {
  companion: RegionCompanion;
  active?: boolean;
  liveDistanceKm?: number;
  liveAngle?: number;
  onClick: () => void;
};

export function CompanionCard({
  companion,
  active,
  liveDistanceKm,
  liveAngle,
  onClick,
}: Props) {
  const distance = liveDistanceKm ?? companion.distanceKm;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors',
        active ? 'border-primary shadow-sm' : 'border-border hover:bg-secondary/50',
      )}
    >
      <div className="relative flex size-[52px] shrink-0 flex-col items-center justify-center">
        <TemperatureRing temperature={companion.temperature} size={52} stroke={5} />
        {liveAngle != null && (
          <span className="absolute -bottom-1 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {liveAngle.toFixed(0)}°
          </span>
        )}
      </div>
      <span className="relative size-11 shrink-0 overflow-hidden rounded-full border border-border">
        <Image
          src={companion.avatar}
          alt={`${companion.name} 프로필`}
          fill
          className="object-cover"
          sizes="44px"
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {companion.name} · {companion.age}
          </span>
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
            {CATEGORY_LABELS[companion.category]}
          </span>
        </div>
        <p className="truncate text-sm text-foreground">{companion.headline}</p>
        <p className="text-xs text-muted-foreground">
          {companion.area} · {formatDistance(distance)}
        </p>
      </div>
    </button>
  );
}
