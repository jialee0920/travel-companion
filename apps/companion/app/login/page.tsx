import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { PageShell } from '@/components/PageShell';

export default function LoginPage() {
  return (
    <PageShell active="profile" hideNav>
      <header className="flex items-center gap-2 px-4 pb-2 pt-12">
        <Link
          href="/"
          aria-label="홈으로"
          className="flex size-9 items-center justify-center rounded-full bg-secondary"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">로그인</h1>
          <p className="text-xs text-muted-foreground">이름 · 연락처로 간편 로그인</p>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </PageShell>
  );
}
