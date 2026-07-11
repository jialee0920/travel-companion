'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Handshake,
  Loader2,
  MapPin,
  MessageCircle,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { TemperatureRing } from '@/components/TemperatureRing';
import { useStartChat } from '@/hooks/useStartChat';
import { interestToCategories } from '@/lib/companions/category-map';
import type { CompanionListItem } from '@/lib/companions/types';
import type {
  GatheringMemberProfile,
  UserGatheringListItem,
} from '@/lib/db/gathering-participants';
import { getCategoryBadgeClass } from '@/lib/design-system';
import { formatDistance, temperatureLabel } from '@/lib/geo';
import { getRegionDisplayName } from '@/lib/regions';
import { CATEGORY_LABELS, type CompanionCategory } from '@/lib/regions/types';
import { cn } from '@/lib/utils';

/** 지도·모집글 공통 프로필 시트 데이터 */
export type ProfileSheetPerson = {
  /** 참여 동행 조회·채팅에 쓰는 실제 유저 ID (mock이면 null) */
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  locationLabel: string | null;
  bio: string;
  interestCategories: string[];
  badgeLabel?: string | null;
  companionSeedId?: string | null;
  temperature?: number | null;
  matches?: number | null;
  responseRate?: number | null;
  headline?: string | null;
  tags?: string[];
  primaryCategory?: CompanionCategory | null;
};

type SheetView = 'profile' | 'gatherings';

type Props = {
  person: ProfileSheetPerson | null;
  onClose: () => void;
  /** 이미 채팅 중인 상대 — 채팅 버튼 대신 "대화 중" 표시 */
  chatActive?: boolean;
};

type ContentProps = {
  person: ProfileSheetPerson;
  onClose: () => void;
  chatActive?: boolean;
};

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

export function companionToProfilePerson(
  companion: CompanionListItem,
  options?: { showDistance?: boolean },
): ProfileSheetPerson {
  const showDistance = options?.showDistance !== false;
  const locationLabel = showDistance
    ? `${companion.area} · 약 ${formatDistance(companion.distanceKm)}`
    : companion.area;

  return {
    userId: companion.peerProfileId ?? null,
    name: companion.name,
    avatarUrl: companion.avatar,
    age: companion.age,
    locationLabel,
    bio: companion.bio?.trim() || companion.headline || '',
    interestCategories: companion.tags,
    companionSeedId: companion.companionSeedId ?? null,
    temperature: companion.temperature,
    matches: companion.matches ?? null,
    responseRate: companion.responseRate ?? null,
    headline: companion.headline,
    tags: companion.tags,
    primaryCategory: companion.primaryCategory,
  };
}

export function memberToProfilePerson(
  member: GatheringMemberProfile,
): ProfileSheetPerson {
  return {
    userId: member.user_id,
    name: member.name,
    avatarUrl: member.avatar_url,
    age: member.age,
    locationLabel: member.region ? getRegionDisplayName(member.region) : null,
    bio: member.bio?.trim() || '',
    interestCategories: member.interest_categories,
    badgeLabel: member.is_author ? '작성자' : null,
  };
}

export type PublicUserProfile = {
  id: string;
  name: string;
  avatar_url: string | null;
  age: number | null;
  region: string | null;
  bio: string | null;
  interest_categories: string[];
  companion_seed_id?: string | null;
};

export function publicUserToProfilePerson(user: PublicUserProfile): ProfileSheetPerson {
  return {
    userId: user.id,
    name: user.name,
    avatarUrl: user.avatar_url,
    age: user.age,
    locationLabel: user.region ? getRegionDisplayName(user.region) : null,
    bio: user.bio?.trim() || '',
    interestCategories: user.interest_categories ?? [],
    companionSeedId: user.companion_seed_id ?? null,
  };
}

export function UserProfileSheet({ person, onClose, chatActive = false }: Props) {
  if (!person) return null;
  return (
    <UserProfileSheetContent
      person={person}
      onClose={onClose}
      chatActive={chatActive}
    />
  );
}

function UserProfileSheetContent({ person, onClose, chatActive = false }: ContentProps) {
  const { startChat, startingId, profileId } = useStartChat();
  const isSelf = !!profileId && !!person.userId && profileId === person.userId;
  const canChat =
    !chatActive &&
    !isSelf &&
    ((!!person.userId && person.userId !== profileId) ||
      !!person.companionSeedId?.trim());
  const busyKey = person.userId || person.companionSeedId || '';
  const busy = startingId != null && startingId === busyKey;
  const canViewGatherings = !!person.userId;
  const showChatAction = canChat || chatActive;

  const [view, setView] = useState<SheetView>('profile');
  const [gatherings, setGatherings] = useState<UserGatheringListItem[] | null>(null);
  const [gatheringsLoading, setGatheringsLoading] = useState(false);
  const [gatheringsError, setGatheringsError] = useState('');

  const categories = interestToCategories(person.interestCategories);
  const hasTemperature = person.temperature != null;
  const tone = hasTemperature ? temperatureLabel(person.temperature!) : null;
  const bio = person.bio.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleStartChat() {
    if (!canChat) return;
    const ok = await startChat({
      peerProfileId: person.userId ?? undefined,
      companionSeedId: person.companionSeedId ?? undefined,
    });
    if (ok) onClose();
  }

  async function openGatherings() {
    if (!person.userId) return;
    setView('gatherings');
    setGatheringsError('');
    if (gatherings != null) return;

    setGatheringsLoading(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(person.userId)}/gatherings`,
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
                  name={person.name}
                  avatarUrl={person.avatarUrl}
                  size="lg"
                />
                <h2 className="mt-3 text-xl font-bold">
                  {person.name}
                  {person.age != null && (
                    <span className="ml-1 text-base font-medium text-muted-foreground">
                      · {person.age}세
                    </span>
                  )}
                </h2>
                {(person.locationLabel || person.badgeLabel) && (
                  <p className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    {person.locationLabel && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {person.locationLabel}
                      </span>
                    )}
                    {person.badgeLabel && (
                      <span className="rounded-full bg-primary-muted px-2 py-0.5 text-micro font-semibold text-primary">
                        {person.badgeLabel}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {person.temperature !== undefined && (
                <div className="mx-5 mt-5 flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
                  {hasTemperature ? (
                    <TemperatureRing
                      temperature={person.temperature!}
                      size={84}
                      stroke={8}
                    />
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
                        ? '함께할 때의 케미 지표예요.'
                        : '동행 온도는 추후 제공될 예정이에요.'}
                    </p>
                  </div>
                </div>
              )}

            {person.matches != null && person.responseRate != null && (
              <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Handshake className="size-3.5" /> 동행 성공
                  </p>
                  <p className="mt-1 text-lg font-bold">{person.matches}회</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="size-3.5" /> 응답률
                  </p>
                  <p className="mt-1 text-lg font-bold">{person.responseRate}%</p>
                </div>
              </div>
            )}

            <div className="mx-5 mt-5">
              <h3 className="text-sm font-semibold">
                {person.primaryCategory && person.headline ? (
                  <>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-xs font-semibold',
                        getCategoryBadgeClass(person.primaryCategory),
                      )}
                    >
                      {CATEGORY_LABELS[person.primaryCategory]}
                    </span>{' '}
                    {person.headline}
                  </>
                ) : (
                  '자기소개'
                )}
              </h3>
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

            {categories.length === 0 && person.interestCategories.length > 0 && (
              <div className="mx-5 mt-4">
                <h3 className="text-sm font-semibold">관심 카테고리</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {person.interestCategories.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-foreground"
                    >
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              className={cn(
                'mx-5 mt-6 flex gap-2',
                !showChatAction && !canViewGatherings && 'hidden',
                !showChatAction && canViewGatherings && 'flex-col',
              )}
            >
              {chatActive && (
                <button
                  type="button"
                  disabled
                  className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-secondary px-2 text-sm font-semibold text-muted-foreground"
                >
                  <MessageCircle className="size-4 shrink-0" />
                  대화 중
                </button>
              )}
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
              {canViewGatherings && (
                <button
                  type="button"
                  onClick={openGatherings}
                  className={cn(
                    'flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-2 text-sm font-semibold text-foreground',
                    showChatAction ? 'min-w-0 flex-1' : 'w-full',
                  )}
                >
                  <Users className="size-4 shrink-0" />
                  참여하는 동행 보기
                </button>
              )}
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
