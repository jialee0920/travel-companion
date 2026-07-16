'use client';

import { MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { GatheringCoverThumbnail } from '@/components/GatheringCoverThumbnail';
import { UserAvatar } from '@/components/UserAvatar';
import type { GatheringRecord } from '@/lib/db/gatherings';
import { formatGatheringDateCard } from '@/lib/gatherings/datetime';
import {
  getGatheringRecruitLabel,
  getGatheringStatusBadge,
} from '@/lib/gatherings/status';
import { getRegionDisplayName } from '@/lib/regions';
import { cn } from '@/lib/utils';

type Props = {
  gathering: GatheringRecord;
};

export function GatheringCard({ gathering }: Props) {
  const dateLabel = formatGatheringDateCard(gathering.gathering_date);
  const regionLabel = getRegionDisplayName(gathering.region);
  const statusBadge = getGatheringStatusBadge(gathering);
  const recruitLabel = getGatheringRecruitLabel(gathering);
  const locationDateLine = [regionLabel, dateLabel].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/gatherings/${gathering.id}`}
      className={cn(
        'block rounded-2xl bg-white px-4 py-3.5 transition-transform active:scale-[0.98]',
      )}
    >
      <div className="flex gap-3.5">
        <GatheringCoverThumbnail
          coverImageUrl={gathering.cover_image_url}
          region={gathering.region}
        />

        <div className="flex min-h-24 min-w-0 flex-1 flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <span className="rounded-lg bg-[#F0F0F0] px-2.5 py-1 text-xs font-medium text-[#4A4A4A]">
              동행
            </span>
            {statusBadge && (
              <span className="rounded-lg bg-primary-muted px-2.5 py-1 text-xs font-medium text-[#F4623A]">
                {statusBadge}
              </span>
            )}
          </div>

          <p className="truncate text-base font-bold text-[#1A1A1A]">{gathering.title}</p>

          <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{locationDateLine}</span>
          </p>

          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <UserAvatar
              name={gathering.author_name}
              avatarUrl={gathering.author_avatar_url}
              size="xs"
              className="shrink-0"
            />
            <span className="min-w-0 truncate">
              {gathering.author_name}
              {' · '}
              <span className="inline-flex items-center gap-0.5">
                <Users className="size-3.5 shrink-0" strokeWidth={2} />
                {gathering.current_count}/{gathering.target_count}명
              </span>
              {' · '}
              {recruitLabel}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
