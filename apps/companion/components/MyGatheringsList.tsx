'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, MapPin, Users } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { UserGatheringListItem } from '@/lib/db/gathering-participants';
import { formatGatheringDateShort } from '@/lib/gatherings/datetime';
import { getRegionDisplayName } from '@/lib/regions';
import { cn } from '@/lib/utils';

export function MyGatheringsList() {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [items, setItems] = useState<UserGatheringListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/mypage/gatherings')}`);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch('/api/gatherings/mine')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '목록 조회 실패');
        return data.gatherings as UserGatheringListItem[];
      })
      .then((gatherings) => {
        if (!cancelled) setItems(gatherings);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '목록 조회 실패');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, profile, router]);

  if (!ready || !profile || loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="px-4 py-12 text-center text-sm text-destructive">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-4 rounded-[1.25rem] border border-border/80 bg-card px-4 py-12 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm text-muted-foreground">아직 신청한 동행이 없어요</p>
        <Link
          href="/"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          동행 둘러보러 가기
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 px-4">
      {items.map((item) => {
        const dateLabel = formatGatheringDateShort(item.gathering_date);
        const closed =
          item.status === 'closed' || item.current_count >= item.target_count;

        return (
          <li key={item.id}>
            <Link
              href={`/gatherings/${item.id}`}
              className="block rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 font-semibold leading-snug">{item.title}</p>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {item.role === 'host' && (
                    <span className="rounded-md bg-primary-muted px-2 py-0.5 text-[10px] font-bold text-primary">
                      동행지기
                    </span>
                  )}
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-semibold',
                      closed
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-success-muted text-success',
                    )}
                  >
                    {closed ? '완료' : '모집중'}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex flex-col gap-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {getRegionDisplayName(item.region)}
                </p>
                {dateLabel && (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    {dateLabel}
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <Users className="size-3.5 shrink-0" />
                  참여자 {item.current_count} / {item.target_count}명
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
