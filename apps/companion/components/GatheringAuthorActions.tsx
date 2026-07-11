'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

type Props = {
  gatheringId: string;
  applicantCount: number;
};

export function GatheringAuthorActions({ gatheringId, applicantCount }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmMessage =
      applicantCount > 0
        ? `신청자 ${applicantCount}명이 있습니다. 정말 삭제하시겠어요?`
        : '정말 삭제하시겠어요?';
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/gatherings/${encodeURIComponent(gatheringId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '삭제에 실패했습니다.');
      router.push('/gatherings');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-4 flex gap-2">
      <Link
        href={`/gatherings/${gatheringId}/edit`}
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground"
      >
        <Pencil className="size-3.5" />
        수정
      </Link>
      <button
        type="button"
        disabled={deleting}
        onClick={handleDelete}
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive-muted text-sm font-semibold text-destructive disabled:opacity-70"
      >
        {deleting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
        삭제
      </button>
    </div>
  );
}
