'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dumbbell, Loader2, Plane, Utensils } from 'lucide-react';
import {
  INTEREST_CATEGORIES,
  type InterestCategory,
} from '@/lib/profile/constants';
import {
  DEFAULT_REGION_CODE,
  isKnownRegionCode,
  REGION_OPTIONS,
} from '@/lib/regions';
import { cn } from '@/lib/utils';

const CATEGORY_META: Record<
  InterestCategory,
  { label: InterestCategory; Icon: typeof Utensils }
> = {
  식사: { label: '식사', Icon: Utensils },
  운동: { label: '운동', Icon: Dumbbell },
  여행: { label: '여행', Icon: Plane },
};

function safeReturnUrl(url: string | null): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

function resolveInitialRegion(code?: string | null): string {
  if (code && isKnownRegionCode(code)) return code;
  return DEFAULT_REGION_CODE;
}

type Props = {
  returnUrl: string;
  initialBio?: string | null;
  initialCategories?: string[];
  initialAge?: number | null;
  initialRegion?: string | null;
  showSkip?: boolean;
  title?: string;
  subtitle?: string;
};

export function ProfileSetupForm({
  returnUrl,
  initialBio = '',
  initialCategories = [],
  initialAge = null,
  initialRegion = null,
  showSkip = true,
  title = '프로필 작성',
  subtitle = '동행자에게 나를 소개해 보세요.',
}: Props) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio ?? '');
  const [age, setAge] = useState(initialAge != null ? String(initialAge) : '');
  const [region, setRegion] = useState(resolveInitialRegion(initialRegion));
  const [categories, setCategories] = useState<InterestCategory[]>(
    initialCategories.filter((c): c is InterestCategory =>
      (INTEREST_CATEGORIES as readonly string[]).includes(c),
    ),
  );
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState('');

  function toggleCategory(category: InterestCategory) {
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }

  async function saveProfile(profileCompleted: boolean, includeAge: boolean) {
    const payload: Record<string, unknown> = {
      bio: bio.trim() || null,
      interest_categories: categories,
      profile_completed: profileCompleted,
      region,
    };
    if (includeAge && age.trim()) {
      payload.age = Number(age);
    }
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? '프로필 저장 실패');
    return data.user;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isKnownRegionCode(region)) {
      setError('활동 지역을 선택해주세요.');
      return;
    }
    const ageNum = Number(age);
    if (!age.trim() || !Number.isInteger(ageNum) || ageNum < 14 || ageNum > 99) {
      setError('만 나이는 14~99 사이로 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await saveProfile(true, true);
      router.push(safeReturnUrl(returnUrl));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setError('');
    setSkipping(true);
    try {
      await saveProfile(true, false);
      router.push(safeReturnUrl(returnUrl));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '건너뛰기에 실패했습니다.');
    } finally {
      setSkipping(false);
    }
  }

  const busy = loading || skipping;

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 pt-2">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset>
          <legend className="text-sm font-medium">활동 지역</legend>
          <p className="mt-0.5 text-xs text-muted-foreground">하나만 선택</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REGION_OPTIONS.map((option) => {
              const selected = region === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setRegion(option.code)}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-secondary',
                  )}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium">나이 (만)</span>
          <input
            type="number"
            inputMode="numeric"
            min={14}
            max={99}
            placeholder="26"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <span className="mt-1 block text-xs text-muted-foreground">만 나이를 입력해 주세요.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">자기소개</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="예) 맛집 탐방과 등산을 좋아해요."
            rows={4}
            maxLength={300}
            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed"
          />
          <span className="mt-1 block text-right text-xs text-muted-foreground">{bio.length}/300</span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">관심 카테고리</legend>
          <p className="mt-0.5 text-xs text-muted-foreground">복수 선택 가능</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_CATEGORIES.map((category) => {
              const { Icon, label } = CATEGORY_META[category];
              const selected = categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-secondary',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : '완료'}
        </button>
      </form>

      {showSkip && (
        <button
          type="button"
          onClick={handleSkip}
          disabled={busy}
          className="text-center text-sm font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-60"
        >
          {skipping ? '처리 중…' : '건너뛰기 · 나중에 마이페이지에서 작성'}
        </button>
      )}

      {error && (
        <p className="rounded-xl bg-destructive-muted px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
