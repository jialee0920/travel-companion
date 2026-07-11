'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Loader2,
  LogOut,
  Pencil,
  Phone,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getRegionDisplayName } from '@/lib/regions';

const CATEGORY_EMOJI: Record<string, string> = {
  식사: '🍴',
  운동: '🏃',
  여행: '✈️',
};

export function MypageContent() {
  const router = useRouter();
  const { profile, ready, loading, logout } = useUserProfile();

  useEffect(() => {
    if (!ready || !profile) return;
    if (!profile.profile_completed) {
      router.replace(
        `/profile/setup?returnUrl=${encodeURIComponent('/mypage')}`,
      );
    }
  }, [ready, profile, router]);

  async function handleLogout() {
    await logout();
    router.push('/');
    router.refresh();
  }

  if (!ready || !profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 pt-1">
      <div className="rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              name={profile.nickname || '사용자'}
              avatarUrl={profile.avatar_url}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">
                {profile.nickname || '사용자'}
                {profile.age != null ? (
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    · 만 {profile.age}세
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="size-3.5" />
                {profile.phone}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                활동 지역 · {getRegionDisplayName(profile.region)}
              </p>
            </div>
          </div>
          <Link
            href="/profile/setup?returnUrl=%2Fmypage&edit=1"
            className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-primary"
          >
            <Pencil className="size-3.5" />
            프로필 편집
          </Link>
        </div>

        {(profile.bio || (profile.interest_categories?.length ?? 0) > 0) && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {profile.bio && (
              <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
            )}
            {(profile.interest_categories?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.interest_categories!.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-primary-muted px-2.5 py-0.5 text-xs font-semibold text-primary"
                  >
                    {CATEGORY_EMOJI[category] ? `${CATEGORY_EMOJI[category]} ` : ''}
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {!profile.bio && (profile.interest_categories?.length ?? 0) === 0 && (
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            아직 자기소개가 없어요.{' '}
            <Link href="/profile/setup?returnUrl=%2Fmypage&edit=1" className="font-medium text-primary">
              프로필 작성하기
            </Link>
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-[var(--shadow-card)]">
        <Link
          href="/mypage/gatherings"
          className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Search className="size-4" />
          </span>
          <span className="flex-1 text-sm font-medium">내 동행</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <div className="mx-4 border-t border-border" />
        <Link
          href="/orders"
          className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-muted text-primary">
            <ShoppingBag className="size-4" />
          </span>
          <span className="flex-1 text-sm font-medium">내 공동구매</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <div className="mx-4 border-t border-border" />
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/40 disabled:opacity-60"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
          </span>
          <span className="flex-1 text-sm font-medium">로그아웃</span>
        </button>
      </div>
    </div>
  );
}
