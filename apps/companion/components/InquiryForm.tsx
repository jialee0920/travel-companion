'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';

export function InquiryForm() {
  const { profile } = useUserProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.nickname || '');
      setPhone(profile.phone);
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      setErrorMsg('모든 항목을 입력해주세요.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '저장 실패');

      setStatus('done');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4 pt-2">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4 text-primary" />
          실시간 채팅이 아닌 문의 접수입니다. 운영팀 확인 후 연락드립니다.
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">이름</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          placeholder="홍길동"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">연락처</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          placeholder="010-0000-0000"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">문의 내용</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          placeholder="동행, 공동구매, 기타 문의 내용을 적어주세요."
        />
      </label>

      <button
        type="submit"
        disabled={status === 'loading' || status === 'done'}
        className={cn(
          'flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground',
          (status === 'loading' || status === 'done') && 'opacity-70',
        )}
      >
        {status === 'loading' && <Loader2 className="size-5 animate-spin" />}
        {status === 'done' ? '접수 완료' : '문의하기'}
      </button>

      {status === 'done' && (
        <p className="flex items-center gap-2 rounded-xl bg-success-muted px-3 py-2 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          문의가 접수되었습니다.
        </p>
      )}

      {status === 'error' && errorMsg && (
        <p className="rounded-xl bg-destructive-muted px-3 py-2 text-sm text-destructive">{errorMsg}</p>
      )}
    </form>
  );
}
