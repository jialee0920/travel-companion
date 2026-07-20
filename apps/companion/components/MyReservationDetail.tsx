'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { RegionProduct } from '@/lib/regions/types';
import { formatPrice, perPersonCharge } from '@/lib/geo';
import { formatDiscountPercent } from '@/lib/products/format';
import { formatGroupBuySummary } from '@/lib/group-buy/quantity';
import { cn } from '@/lib/utils';

type Props = {
  product: RegionProduct;
};

export function MyReservationDetail({ product }: Props) {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const charge = perPersonCharge(product.discountedPrice, product.targetCount);

  useEffect(() => {
    if (!ready) return;
    if (!profile) {
      router.replace(
        `/login?returnUrl=${encodeURIComponent(`/orders/reservation/${product.id}`)}`,
      );
      return;
    }

    let cancelled = false;
    setChecking(true);
    fetch(`/api/products/${encodeURIComponent(product.id)}/reservation`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '예약 조회 실패');
        return Boolean(data.reserved) && data.reservation?.status === 'reserved';
      })
      .then((ok) => {
        if (cancelled) return;
        setAllowed(ok);
        if (!ok) {
          router.replace('/orders');
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/orders');
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, profile, product.id, router]);

  async function confirmCancel() {
    setCancelling(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/reservation`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '예약 취소 실패');
      setConfirmOpen(false);
      router.replace('/orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '예약 취소 실패');
      setCancelling(false);
    }
  }

  if (!ready || !profile || checking || !allowed) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-8">
      <div className="rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-lg bg-primary-muted px-2 py-1 text-sm font-bold text-primary">
            {formatDiscountPercent(product.discountRate)}% 할인
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold">
            <Users className="size-4 text-primary" />
            {formatGroupBuySummary(product.targetCount, product.currentCount)}
          </span>
        </div>

        <h1 className="mt-4 text-lg font-bold leading-snug">{product.name}</h1>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>정가</span>
            <span className="line-through">{formatPrice(product.regularPrice)}원</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>공동구매가</span>
            <span className="text-primary">{formatPrice(product.discountedPrice)}원</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>1인 청구 금액</span>
            <span>{formatPrice(charge)}원</span>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          지금은 사전 예약 기간이에요. 결제 준비되면 알림으로 알려드릴게요!
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError('');
            setConfirmOpen(true);
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          예약 취소
        </button>
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-reservation-title"
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg"
          >
            <p id="cancel-reservation-title" className="text-center text-base font-semibold">
              예약을 취소하시겠어요?
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirmOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm font-semibold"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={confirmCancel}
                className={cn(
                  'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground',
                  cancelling && 'opacity-70',
                )}
              >
                {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
