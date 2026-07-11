'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

  async function handleCancel() {
    setError('');
    setMessage('');
    if (!ready || !profile || isAuthor || !applied || loading) return;
    if (!window.confirm('참여를 취소하시겠어요?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/gatherings/${encodeURIComponent(gatheringId)}/apply`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '참여 취소 실패');

      if (data.gathering) {
        setGathering(data.gathering);
        onApplied?.(data.gathering);
      }
      setApplied(false);
      setMessage('참여를 취소했습니다.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '참여 취소 실패');
    } finally {
      setLoading(false);
    }
  }

  // 작성자는 이 버튼을 쓰지 않음(페이지에서 AuthorActions 분기). 방어용.
  if (isAuthor) {
    return (
      <div className="mt-5">
        <button
          type="button"
          disabled
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-secondary text-base font-semibold text-muted-foreground"
        >
          내가 작성한 모집글
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {gathering.current_count} / {gathering.target_count}명 모집 중
        </p>
      </div>
    );
  }

  const canCancel = applied;
  const canApply = !applied && !isFull;
  const disabled = loading || !ready || (!canCancel && !canApply);

  let label = '동행 신청하기';
  if (canCancel) label = '참여 취소하기';
  else if (isFull) label = '모집 완료';

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={canCancel ? handleCancel : handleApply}
        disabled={disabled}
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-colors',
          disabled
            ? 'bg-secondary text-muted-foreground'
            : canCancel
              ? 'border border-destructive/30 bg-destructive-muted text-destructive'
              : 'bg-primary text-primary-foreground',
        )}
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : null}
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
