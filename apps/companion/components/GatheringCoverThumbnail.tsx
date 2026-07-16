'use client';

import { Handshake } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { resolveGatheringCoverImageUrl } from '@/lib/gatherings/cover-image';
import { cn } from '@/lib/utils';

type Props = {
  coverImageUrl?: string | null;
  region: string;
  className?: string;
};

/** 동행 카드 왼쪽 96×96 썸네일 — Cover Image 또는 지역 플레이스홀더 */
export function GatheringCoverThumbnail({ coverImageUrl, region, className }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = resolveGatheringCoverImageUrl(coverImageUrl, region);

  if (!src || imageFailed) {
    return (
      <span
        aria-hidden
        className={cn(
          'inline-flex size-24 shrink-0 items-center justify-center rounded-2xl bg-muted',
          className,
        )}
      >
        <Handshake className="size-8 text-muted-foreground/50" strokeWidth={1.5} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'relative inline-flex size-24 shrink-0 overflow-hidden rounded-2xl bg-muted',
        className,
      )}
    >
      <Image
        src={src}
        alt=""
        width={96}
        height={96}
        className="size-full object-cover"
        unoptimized
        onError={() => setImageFailed(true)}
      />
    </span>
  );
}
