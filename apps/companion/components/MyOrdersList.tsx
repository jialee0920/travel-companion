'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { OrderRecord } from '@/lib/db/orders';
import { formatPrice } from '@/lib/geo';
import { cn } from '@/lib/utils';

function formatOrderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function paymentLabel(status: OrderRecord['payment_status']): string {
  if (status === 'paid') return '결제완료';
  if (status === 'failed') return '결제실패';
  return '결제대기';
}

export function MyOrdersList() {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/orders')}`);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/orders/mine?profileId=${encodeURIComponent(profile.id)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '목록 조회 실패');
        return (data.orders ?? []) as OrderRecord[];
      })
      .then((rows) => {
        if (!cancelled) setOrders(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '목록 조회 실패');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, profile, router]);

  if (!ready || !profile || loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="px-4 py-12 text-center text-sm text-destructive">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="mx-4 rounded-[1.25rem] border border-border/80 bg-card px-4 py-12 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm text-muted-foreground">아직 신청한 공동구매가 없어요</p>
        <Link
          href="/group-buy"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          공동구매 둘러보러 가기
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 px-4">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/product/${encodeURIComponent(order.product_id)}`}
            className="block rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/30"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 font-semibold leading-snug">{order.product_name}</p>
              <span
                className={cn(
                  'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold',
                  order.payment_status === 'paid'
                    ? 'bg-success-muted text-success'
                    : order.payment_status === 'failed'
                      ? 'bg-destructive-muted text-destructive'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {paymentLabel(order.payment_status)}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">
                {formatOrderDate(order.created_at)}
              </span>
              <span className="font-bold">{formatPrice(order.amount)}원</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
