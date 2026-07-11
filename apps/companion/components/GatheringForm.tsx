'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { GatheringRecord, GatheringStatus } from '@/lib/db/gatherings';
import { GATHERING_REGION_OPTIONS, NATIONAL_REGION_CODE } from '@/lib/regions/product-tabs';
import { cn } from '@/lib/utils';

type Props =
  | { mode: 'create' }
  | {
      mode: 'edit';
      gathering: GatheringRecord;
      applicantCount: number;
    };

function toDateInputValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function GatheringForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const gathering = isEdit ? props.gathering : null;
  const applicantCount = isEdit ? props.applicantCount : 0;
  const minTarget = Math.max(2, gathering?.current_count ?? 2);

  const [title, setTitle] = useState(gathering?.title ?? '');
  const [description, setDescription] = useState(gathering?.description ?? '');
  const [region, setRegion] = useState(gathering?.region ?? NATIONAL_REGION_CODE);
  const [targetCount, setTargetCount] = useState(String(gathering?.target_count ?? 4));
  const [gatheringDate, setGatheringDate] = useState(
    toDateInputValue(gathering?.gathering_date ?? null),
  );
  const [status, setStatus] = useState<GatheringStatus>(gathering?.status ?? 'open');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const count = Number(targetCount);
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!description.trim()) {
      setError('설명을 입력해주세요.');
      return;
    }
    if (!Number.isInteger(count) || count < 2 || count > 50) {
      setError('모집 인원은 2~50명으로 입력해주세요.');
      return;
    }
    if (isEdit && gathering && count < gathering.current_count) {
      setError(
        `모집 인원은 현재 인원(${gathering.current_count}명)보다 작을 수 없습니다.`,
      );
      return;
    }

    setLoading(true);
    try {
      if (isEdit && gathering) {
        const res = await fetch(`/api/gatherings/${encodeURIComponent(gathering.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            region,
            target_count: count,
            gathering_date: gatheringDate || null,
            status,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '수정에 실패했습니다.');
        router.push(`/gatherings/${data.gathering.id}`);
        router.refresh();
      } else {
        const res = await fetch('/api/gatherings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            region,
            target_count: count,
            gathering_date: gatheringDate || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '작성에 실패했습니다.');
        router.push(`/gatherings/${data.gathering.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !gathering) return;
    setError('');

    const confirmMessage =
      applicantCount > 0
        ? `신청자 ${applicantCount}명이 있습니다. 정말 삭제하시겠어요?`
        : '정말 삭제하시겠어요?';
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/gatherings/${encodeURIComponent(gathering.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '삭제에 실패했습니다.');
      router.push('/gatherings');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-4">
      <label className="block">
        <span className="text-sm font-medium">제목</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 주말 묵호항 회 같이 먹어요"
          maxLength={80}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">설명</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="모집 내용, 만날 장소, 주의사항 등을 적어 주세요."
          rows={5}
          maxLength={1000}
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed"
        />
        <span className="mt-1 block text-right text-xs text-muted-foreground">
          {description.length}/1000
        </span>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">지역</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GATHERING_REGION_OPTIONS.map((option) => {
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
        <span className="text-sm font-medium">모집 인원</span>
        <input
          type="number"
          inputMode="numeric"
          min={minTarget}
          max={50}
          value={targetCount}
          onChange={(e) => setTargetCount(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          {isEdit && gathering
            ? `현재 ${gathering.current_count}명 · ${gathering.current_count}명 이상으로 설정`
            : '본인 포함 목표 인원'}
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">
          동행 날짜 <span className="font-normal text-muted-foreground">(선택)</span>
        </span>
        <input
          type="date"
          value={gatheringDate}
          onChange={(e) => setGatheringDate(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </label>

      {isEdit && (
        <fieldset>
          <legend className="text-sm font-medium">모집 상태</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                { id: 'open', label: '모집 중' },
                { id: 'closed', label: '모집 완료' },
              ] as const
            ).map((option) => {
              const selected = status === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStatus(option.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-secondary',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {error && (
        <p className="rounded-xl bg-destructive-muted px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || deleting}
        className="flex h-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : isEdit ? (
          '수정 저장'
        ) : (
          '모집글 등록'
        )}
      </button>

      {isEdit && (
        <button
          type="button"
          disabled={loading || deleting}
          onClick={handleDelete}
          className="flex h-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive-muted text-base font-semibold text-destructive disabled:opacity-70"
        >
          {deleting ? <Loader2 className="size-5 animate-spin" /> : '모집글 삭제'}
        </button>
      )}
    </form>
  );
}
