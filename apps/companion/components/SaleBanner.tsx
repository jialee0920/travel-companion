'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/** 세일 배너 클릭 시 이동 경로 — 나중에 특정 상품 URL로 교체 */
export const SALE_BANNER_HREF = '/';

/** public/sale-banner.png — 파일만 교체하면 반영 */
export const SALE_BANNER_SRC = '/sale-banner.png';

type Props = {
  href?: string;
  className?: string;
};

export function SaleBanner({ href = SALE_BANNER_HREF, className }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <Link
      href={href}
      aria-label="세일 배너"
      className={cn(
        'relative block w-full overflow-hidden bg-primary-muted',
        'aspect-[3/1]',
        className,
      )}
    >
      {failed ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/70 px-6 text-center">
          <p className="text-sm font-bold text-primary-foreground">공동구매 세일</p>
        </div>
      ) : (
        <Image
          src={SALE_BANNER_SRC}
          alt="세일 배너"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 448px) 100vw, 448px"
          onError={() => setFailed(true)}
        />
      )}
    </Link>
  );
}
