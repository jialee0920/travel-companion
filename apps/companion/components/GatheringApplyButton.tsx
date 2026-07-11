'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { GatheringRecord } from '@/lib/db/gatherings';
import { cn } from '@/lib/utils';

type Props = {
  gatheringId: string;
  authorId: string;
  initialGathering: GatheringRecord;
  initiallyApplied: boolean;
  loginReturnUrl: string;
  onApplied?: (gathering: GatheringRecord) => void;
};

export function GatheringApplyButton({
  gatheringId,
  authorId,
  initialGathering,
  initiallyApplied,
  loginReturnUrl,
  onApplied,
}: Props) {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [gathering, setGathering] = useState(initialGathering);
  const [applied, setApplied] = useState(initiallyApplied);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAuthor = !!profile?.id && profile.id === authorId;
  const isFull =
    gathering.status === 'closed' ||
    gathering.current_count >= gathering.target_count;

  async function handleApply() {
    setError('');
    setMessage('');

    if (!ready) return;
    if (!profile) {
      router.push(`/login?returnUrl=${encodeURIComponent(loginReturnUrl)}`);
      return;
    }
    if (isAuthor || applied || isFull || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/gatherings/${encodeURIComponent(gatheringId)}/apply`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '동행 신청 실패');

      if (data.gathering) {
        setGathering(data.gathering);
        onApplied?.(data.gathering);
      }
      setApplied(true);
      setMessage(data.alreadyApplied ? '이미 신청한 모집글입니다.' : '신청 완료!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '동행 신청 실패');
    } finally {
      setLoading(false);
    }
  }

  let label = '동행 신청하기';
  let disabled = loading || !ready;

  if (isFull) {
    label = '모집 완료';
    disabled = true;
  } else if (isAuthor) {
    label = '내가 작성한 모집글';
    disabled = true;
  } else if (applied) {
    label = '신청 완료';
    disabled = true;
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleApply}
        disabled={disabled}
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-colors',
          disabled
            ? 'bg-secondary text-muted-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : applied && !isFull ? (
          <Check className="size-5" />
        ) : null}
        {label}
      </button>
      {message && (
        <p className="mt-2 text-center text-sm font-medium text-primary">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-center text-sm text-destructive">{error}</p>
      )}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {gathering.current_count} / {gathering.target_count}명 모집 중
      </p>
    </div>
  );
}
