'use client';

import { Calendar, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { AuthorChatAvatar } from '@/components/AuthorChatAvatar';
import type { GatheringRecord } from '@/lib/db/gatherings';
import { formatGatheringDateShort } from '@/lib/gatherings/datetime';
import { getRegionDisplayName } from '@/lib/regions';
import { cn } from '@/lib/utils';

type Props = {
  gathering: GatheringRecord;
};

export function GatheringCard({ gathering }: Props) {
  const dateLabel = formatGatheringDateShort(gathering.gathering_date);
  const closed = gathering.status === 'closed';

  return (
    <Link
      href={`/gatherings/${gathering.id}`}
      className={cn(
        'block rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/30',
      )}
    >
      <div className="flex gap-3">
        <AuthorChatAvatar
          authorId={gathering.author_id}
          authorName={gathering.author_name}
          authorAvatarUrl={gathering.author_avatar_url}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-0.5 text-xs font-semibold text-primary">
              <span aria-hidden>🤝</span>
              동행
            </span>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {getRegionDisplayName(gathering.region)}
            </span>
            {closed && (
              <span className="ml-auto text-xs font-semibold text-muted-foreground">마감</span>
            )}
          </div>

          <p className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
            {gathering.title}
          </p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {gathering.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="truncate font-medium text-foreground">
              {gathering.author_name}
            </span>
            {dateLabel && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {dateLabel}
              </span>
            )}
            <span className="flex items-center gap-1 font-medium text-primary">
              <Users className="size-3.5" />
              참여자 {gathering.current_count}/{gathering.target_count}명
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
