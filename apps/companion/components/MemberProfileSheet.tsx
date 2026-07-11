'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MapPin,
  MessageCircle,
  Users,
  X,
} from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useStartChat } from '@/hooks/useStartChat';
import { interestToCategories } from '@/lib/companions/category-map';
import type {
  GatheringMemberProfile,
  UserGatheringListItem,
} from '@/lib/db/gathering-participants';
import { getCategoryBadgeClass } from '@/lib/design-system';
import { getRegionDisplayName } from '@/lib/regions';
import { CATEGORY_LABELS } from '@/lib/regions/types';
import { cn } from '@/lib/utils';

type Props = {
  member: GatheringMemberProfile | null;
  onClose: () => void;
};

type ContentProps = {
  member: GatheringMemberProfile;
  onClose: () => void;
};

type SheetView = 'profile' | 'gatherings';

function formatGatheringDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export function MemberProfileSheet({ member, onClose }: Props) {
  if (!member) return null;
  return <MemberProfileSheetContent member={member} onClose={onClose} />;
}

function MemberProfileSheetContent({ member, onClose }: ContentProps) {
  const { startChat, startingId, profileId } = useStartChat();
  const isSelf = !!profileId && profileId === member.user_id;
  const canChat = !isSelf && !!member.user_id;
  const busy = startingId === member.user_id;

  const [view, setView] = useState<SheetView>('profile');
  const [gatherings, setGatherings] = useState<UserGatheringListItem[] | null>(null);
  const [gatheringsLoading, setGatheringsLoading] = useState(false);
  const [gatheringsError, setGatheringsError] = useState('');

  const categories = interestToCategories(member.interest_categories);
  const regionLabel = member.region ? getRegionDisplayName(member.region) : null;
  const bio = member.bio?.trim() || '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleStartChat() {
    if (!canChat) return;
    const ok = await startChat({ peerProfileId: member.user_id });
    if (ok) onClose();
  }

  async function openGatherings() {
    setView('gatherings');
    setGatheringsError('');
    if (gatherings != null) return;

    setGatheringsLoading(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(member.user_id)}/gatherings`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '참여 동행 조회 실패');
      setGatherings(data.gatherings ?? []);
    } catch (err) {
      setGatheringsError(err instanceof Error ? err.message : '참여 동행 조회 실패');
      setGatherings([]);
    } finally {
      setGatheringsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />

      <div className="relative mx-auto w-full max-w-md max-h-[86%] overflow-y-auto rounded-t-[2rem] border-t border-border bg-background pb-8 shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-center bg-background/95 pt-3">
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </div>

        {view === 'profile' ? (
          <>
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
                <UserAvatar
                  name={member.name}
                  avatarUrl={member.avatar_url}
                  size="lg"
                />
                <h2 className="mt-3 text-xl font-bold">
                  {member.name}
                  {member.age != null && (
                    <span className="ml-1 text-base font-medium text-muted-foreground">
                      · {member.age}세
                    </span>
                  )}
                </h2>
                {(regionLabel || member.is_author) && (
                  <p className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    {regionLabel && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {regionLabel}
                      </span>
                    )}
                    {member.is_author && (
                      <span className="rounded-full bg-primary-muted px-2 py-0.5 text-micro font-semibold text-primary">
                        작성자
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="mx-5 mt-5">
              <h3 className="text-sm font-semibold">자기소개</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {bio || '아직 자기소개가 없어요.'}
              </p>
            </div>

            {categories.length > 0 && (
              <div className="mx-5 mt-4">
                <h3 className="text-sm font-semibold">관심 카테고리</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-semibold',
                        getCategoryBadgeClass(cat),
                      )}
                    >
                      {CATEGORY_LABELS[cat]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {categories.length === 0 && member.interest_categories.length > 0 && (
              <div className="mx-5 mt-4">
                <h3 className="text-sm font-semibold">관심 카테고리</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {member.interest_categories.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={cn('mx-5 mt-6 flex gap-2', !canChat && 'flex-col')}>
              {canChat && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStartChat}
                  className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                >
                  {busy ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <MessageCircle className="size-4 shrink-0" />
                  )}
                  채팅 시작하기
                </button>
              )}
              <button
                type="button"
                onClick={openGatherings}
                className={cn(
                  'flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-2 text-sm font-semibold text-foreground',
                  canChat ? 'min-w-0 flex-1' : 'w-full',
                )}
              >
                <Users className="size-4 shrink-0" />
                참여하는 동행 보기
              </button>
            </div>
          </>
        ) : (
          <div className="px-5 pt-1">
            <div className="relative mb-4 flex items-center justify-center">
              <button
                type="button"
                aria-label="프로필로 돌아가기"
                onClick={() => setView('profile')}
                className="absolute left-0 flex size-9 items-center justify-center rounded-full bg-secondary"
              >
                <ArrowLeft className="size-4" />
              </button>
              <h3 className="text-base font-bold">참여하는 동행</h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="absolute right-0 flex size-9 items-center justify-center rounded-full bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {gatheringsLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}

            {!gatheringsLoading && gatheringsError && (
              <p className="rounded-2xl border border-border bg-card py-8 text-center text-sm text-destructive">
                {gatheringsError}
              </p>
            )}

            {!gatheringsLoading && !gatheringsError && gatherings?.length === 0 && (
              <p className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
                참여 중인 동행이 없어요
              </p>
            )}

            {!gatheringsLoading && !gatheringsError && gatherings && gatherings.length > 0 && (
              <ul className="flex flex-col gap-2.5 pb-2">
                {gatherings.map((item) => {
                  const dateLabel = formatGatheringDate(item.gathering_date);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/gatherings/${item.id}`}
                        onClick={onClose}
                        className="block rounded-2xl border border-border bg-card p-3.5 transition-colors hover:bg-secondary/40"
                      >
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 line-clamp-2 text-sm font-bold text-foreground">
                            {item.title}
                          </p>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-micro font-semibold',
                              item.role === 'host'
                                ? 'bg-primary-muted text-primary'
                                : 'bg-secondary text-muted-foreground',
                            )}
                          >
                            {item.role === 'host' ? '주최자' : '참여중'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {getRegionDisplayName(item.region)}
                          </span>
                          {dateLabel && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3.5" />
                              {dateLabel}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 font-medium text-primary">
                            <Users className="size-3.5" />
                            {item.current_count}/{item.target_count}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
