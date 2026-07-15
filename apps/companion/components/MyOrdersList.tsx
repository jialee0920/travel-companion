'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { OrderRecord } from '@/lib/db/orders';
import type {
  MyProductReservationItem,
  ProductReservationStatus,
} from '@/lib/db/product-reservations';
import { formatPrice } from '@/lib/geo';
import { cn } from '@/lib/utils';

type ListItem =
  | {
      kind: 'order';
      id: string;
      product_id: string;
      product_name: string;
      date: string;
      payment_status: OrderRecord['payment_status'];
      amount: number;
    }
  | {
      kind: 'reservation';
      id: string;
      product_id: string;
      product_name: string;
      date: string;
      reservation_status: ProductReservationStatus;
    };

function formatItemDate(value: string): string {
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

function reservationLabel(status: ProductReservationStatus): string {
  if (status === 'notified') return '결제 안내됨';
  if (status === 'completed') return '예약 완료';
  return '예약중';
}

function reservationBadgeClass(status: ProductReservationStatus): string {
  if (status === 'notified') return 'bg-primary-muted text-primary';
  if (status === 'completed') return 'bg-success-muted text-success';
  return 'bg-secondary text-secondary-foreground';
}

function ItemBody({ item }: { item: ListItem }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-semibold leading-snug">{item.product_name}</p>
        {item.kind === 'order' ? (
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold',
              item.payment_status === 'paid'
                ? 'bg-success-muted text-success'
                : item.payment_status === 'failed'
                  ? 'bg-destructive-muted text-destructive'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {paymentLabel(item.payment_status)}
          </span>
        ) : (
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold',
              reservationBadgeClass(item.reservation_status),
            )}
          >
            {reservationLabel(item.reservation_status)}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-sm">
        <span className="text-xs text-muted-foreground">{formatItemDate(item.date)}</span>
        {item.kind === 'order' ? (
          <span className="font-bold">{formatPrice(item.amount)}원</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    </>
  );
}

export function MyOrdersList() {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [reservations, setReservations] = useState<MyProductReservationItem[]>([]);
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
        return {
          orders: (data.orders ?? []) as OrderRecord[],
          reservations: (data.reservations ?? []) as MyProductReservationItem[],
        };
      })
      .then((data) => {
        if (!cancelled) {
          setOrders(data.orders);
          setReservations(data.reservations);
        }
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

  const items = useMemo(() => {
    const merged: ListItem[] = [
      ...orders.map((order) => ({
        kind: 'order' as const,
        id: `order-${order.id}`,
        product_id: order.product_id,
        product_name: order.product_name,
        date: order.created_at,
        payment_status: order.payment_status,
        amount: order.amount,
      })),
      ...reservations.map((row) => ({
        kind: 'reservation' as const,
        id: `reservation-${row.id}`,
        product_id: row.product_id,
        product_name: row.product_name,
        date: row.reserved_at,
        reservation_status: row.status,
      })),
    ];
    return merged.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [orders, reservations]);

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

  if (items.length === 0) {
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
      {items.map((item) => {
        const isActiveReservation =
          item.kind === 'reservation' && item.reservation_status === 'reserved';
        const isPendingPayment =
          item.kind === 'order' && item.payment_status === 'pending';

        return (
          <li key={item.id}>
            {isActiveReservation ? (
              <Link
                href={`/orders/reservation/${encodeURIComponent(item.product_id)}`}
                className="block rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/30"
              >
                <ItemBody item={item} />
              </Link>
            ) : (
              <div className="rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]">
                <ItemBody item={item} />
                {isPendingPayment && (
                  <div className="mt-3 flex justify-end border-t border-border pt-3">
                    <Link
                      href={`/inquiry?returnUrl=${encodeURIComponent('/orders')}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                    >
                      문의하기
                    </Link>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
