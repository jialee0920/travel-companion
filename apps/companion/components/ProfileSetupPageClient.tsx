'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ProfileSetupForm } from '@/components/ProfileSetupForm';
import { useUserProfile } from '@/hooks/useUserProfile';

function safeReturnUrl(url: string | null): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

export function ProfileSetupPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'));
  const fromMypage = searchParams.get('edit') === '1';
  const { profile, ready } = useUserProfile();

  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/profile/setup')}`);
      return;
    }
    if (profile.profile_completed && !fromMypage) {
      router.replace(returnUrl);
    }
  }, [ready, profile, router, returnUrl, fromMypage]);

  if (!ready || !profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profile.profile_completed && !fromMypage) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ProfileSetupForm
      returnUrl={returnUrl}
      initialBio={profile.bio}
      initialCategories={profile.interest_categories}
      initialAge={profile.age}
      initialRegion={profile.region}
      showSkip={!fromMypage && !profile.profile_completed}
      title={fromMypage ? '프로필 수정' : '프로필 작성'}
      subtitle={
        fromMypage
          ? '활동 지역, 자기소개와 관심 카테고리를 수정할 수 있어요.'
          : '동행자에게 나를 소개해 보세요. (프로필 사진은 추후 추가 예정)'
      }
    />
  );
}
