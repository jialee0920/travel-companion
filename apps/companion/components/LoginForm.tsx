'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Phone, User } from 'lucide-react';

function safeReturnUrl(url: string | null): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'));
  const oauthError = searchParams.get('error');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (oauthError) setError(oauthError);
  }, [oauthError]);

  const kakaoLoginUrl = `/api/auth/kakao?returnUrl=${encodeURIComponent(returnUrl)}`;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '로그인 실패');

      const destination = data.user?.profile_completed
        ? returnUrl
        : `/profile/setup?returnUrl=${encodeURIComponent(returnUrl)}`;
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 pt-2">
      <p className="text-sm leading-relaxed text-muted-foreground">
        이름과 연락처만 입력하면 바로 이용할 수 있어요. (별도 비밀번호 없음)
      </p>

      <a
        href={kakaoLoginUrl}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-kakao text-base font-semibold text-kakao-foreground"
      >
        <span aria-hidden className="text-lg leading-none">
          💬
        </span>
        카카오로 로그인하기
      </a>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        또는
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <User className="size-4 text-primary" />
            이름
          </span>
          <input
            type="text"
            autoComplete="name"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Phone className="size-4 text-primary" />
            연락처
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading || !name.trim() || !phone.trim()}
          className="flex h-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : '시작하기'}
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-destructive-muted px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
