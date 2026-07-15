'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Users } from 'lucide-react';
import type { RegionProduct } from '@/lib/regions/types';
import { formatPrice, perPersonCharge } from '@/lib/geo';
import { formatDiscountPercent } from '@/lib/products/format';
import { openPaymentWindow } from '@/lib/payments/client-sdk';
import type { ClientCheckoutConfig } from '@/lib/payments/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';

type Props = {
  product: RegionProduct;
  /** sticky CTA 아래에 이어질 콘텐츠(상세이미지 등). sticky 유지 구간에 포함됨 */
  children?: React.ReactNode;
};

const PAYMENT_NOT_CONFIGURED_MSG =
  '결제 연동 설정 중입니다. PG 키 등록 후 다시 시도해 주세요.';

const RESERVE_SUCCESS_MSG = '예약 완료! 결제 준비되면 알림으로 알려드릴게요!';

/** 상품 상세는 고정 헤더가 없어 safe-area만 사용 (헤더 도입 시 이 값 조정) */
const STICKY_TOP_CLASS = 'top-[env(safe-area-inset-top,0px)]';

function StickyActionPanel({ children }: { children: React.ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px 0px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <div
        className={cn(
          'sticky z-20 px-5 py-3 transition-[box-shadow,background-color,border-color]',
          STICKY_TOP_CLASS,
          stuck
            ? 'border-b border-border/70 bg-background shadow-[0_6px_18px_rgba(0,0,0,0.08)]'
            : 'border-b border-transparent bg-transparent shadow-none',
        )}
      >
        {children}
      </div>
    </>
  );
}

export function GroupBuyWidget({ product, children }: Props) {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [status, setStatus] = useState<'idle' | 'loading' | 'paid' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [alreadyReserved, setAlreadyReserved] = useState(false);
  const [reservationChecked, setReservationChecked] = useState(false);
  const [displayCount, setDisplayCount] = useState(product.currentCount);

  const isKakaoChannel = product.actionType === 'kakao_channel';
  const isReservation = product.actionType === 'reservation';
  const isPreparing = product.groupBuyStatus === 'preparing';
  const isComplete =
    !isKakaoChannel &&
    !isReservation &&
    !isPreparing &&
    (product.groupBuyStatus === 'success' || product.currentCount >= product.targetCount);
  const isReservationFull =
    isReservation &&
    !isPreparing &&
    product.targetCount > 0 &&
    displayCount >= product.targetCount;
  const charge = perPersonCharge(product.discountedPrice, product.targetCount);

  useEffect(() => {
    setDisplayCount(product.currentCount);
  }, [product.currentCount]);

  useEffect(() => {
    if (!isReservation || !ready) return;

    if (!profile?.id) {
      setAlreadyReserved(false);
      setReservationChecked(true);
      return;
    }

    let cancelled = false;
    setReservationChecked(false);

    (async () => {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/reservation`);
        const data = await res.json();
        if (!cancelled) {
          setAlreadyReserved(Boolean(data.reserved));
        }
      } catch {
        if (!cancelled) setAlreadyReserved(false);
      } finally {
        if (!cancelled) setReservationChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReservation, ready, profile?.id, product.id]);

  async function handleParticipate() {
    if (!ready || isPreparing) return;

    if (!profile) {
      const returnUrl = encodeURIComponent(
        typeof window !== 'undefined' ? window.location.pathname : `/product/${product.id}`,
      );
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const prepareRes = await fetch('/api/payments/confirm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          name: profile.name,
          phone: profile.phone,
          region: product.region,
          profileId: profile.id,
        }),
      });
      const prepare = await prepareRes.json();
      if (!prepareRes.ok) throw new Error(prepare.error ?? '주문 생성 실패');

      const checkout = prepare.checkout as ClientCheckoutConfig | undefined;
      if (!checkout?.configured) {
        setStatus('error');
        setMessage(PAYMENT_NOT_CONFIGURED_MSG);
        return;
      }

      await openPaymentWindow({
        sdkUrl: checkout.sdkUrl,
        clientId: checkout.clientId,
        orderId: prepare.merchantUid,
        amount: prepare.amount,
        goodsName: product.name,
        returnUrl: checkout.returnUrl,
        buyerName: profile.name,
        buyerTel: profile.phone,
        onError: (errMsg) => {
          setStatus('error');
          setMessage(errMsg || '결제가 취소되었습니다.');
        },
      });

      setStatus('loading');
      setMessage('결제창으로 이동합니다…');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  }

  async function handleReserve() {
    if (!ready || isPreparing || alreadyReserved || isReservationFull) return;

    if (!profile) {
      const returnUrl = encodeURIComponent(
        typeof window !== 'undefined' ? window.location.pathname : `/product/${product.id}`,
      );
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/reservation`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '사전 예약 실패');

      setAlreadyReserved(true);
      setStatus('paid');
      setMessage(data.message || RESERVE_SUCCESS_MSG);
      if (typeof data.currentCount === 'number') {
        setDisplayCount(data.currentCount);
      } else if (!data.alreadyReserved) {
        setDisplayCount((prev) => prev + 1);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  }

  if (isKakaoChannel) {
    return (
      <div className="px-5">
        {isPreparing ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="rounded-lg bg-secondary px-2 py-1 text-sm font-bold text-muted-foreground">
              준비중
            </span>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>정가</span>
                <span className="line-through">{formatPrice(product.regularPrice)}원</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>얼리버드 할인가</span>
                <span className="text-primary">{formatPrice(product.discountedPrice)}원</span>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-secondary px-3 py-3 text-center text-sm font-medium text-secondary-foreground">
              곧 만나요! 준비중인 상품이에요
            </p>
            <button
              type="button"
              disabled
              className="mt-4 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl bg-muted text-base font-semibold text-muted-foreground opacity-70"
            >
              동행 모집글 보러가기
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center">
              <span className="rounded-lg bg-primary-muted px-2 py-1 text-sm font-bold text-primary">
                얼리버드
              </span>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>정가</span>
                <span className="line-through">{formatPrice(product.regularPrice)}원</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>얼리버드 할인가</span>
                <span className="text-primary">{formatPrice(product.discountedPrice)}원</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              묵호 시그널 동행 모집글을 확인하고 신청해보세요
            </p>
            <Link
              href="/gatherings"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground"
            >
              동행 모집글 보러가기
              <ArrowRight className="size-5" />
            </Link>
          </div>
        )}
        {children}
      </div>
    );
  }

  const summaryCount = isReservation ? displayCount : product.currentCount;

  const summaryCard = (
    <div className="rounded-2xl border border-border bg-card p-4">
      {isPreparing ? (
        <span className="rounded-lg bg-secondary px-2 py-1 text-sm font-bold text-muted-foreground">
          준비중
        </span>
      ) : (
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-primary-muted px-2 py-1 text-sm font-bold text-primary">
            {formatDiscountPercent(product.discountRate)}% 할인
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold">
            <Users className="size-4 text-primary" />
            목표 {product.targetCount}명 · 현재 {summaryCount}명
          </span>
        </div>
      )}

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>정가</span>
          <span className="line-through">{formatPrice(product.regularPrice)}원</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>공동구매가</span>
          <span className="text-primary">{formatPrice(product.discountedPrice)}원</span>
        </div>
      </div>

      {isPreparing ? (
        <p className="mt-4 rounded-xl bg-secondary px-3 py-3 text-center text-sm font-medium text-secondary-foreground">
          곧 만나요! 준비중인 상품이에요
        </p>
      ) : isReservation ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            지금은 사전 예약 기간이에요. 결제 준비되면 알림으로 알려드릴게요!
          </p>
          {isReservationFull && (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-center text-sm font-medium text-secondary-foreground">
              목표 달성! 곧 결제 안내드려요
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            1인 금액이 아니라, 공동구매 달성 시 목표 인원으로 나눈 금액을 청구해요.
          </p>
          {isComplete && status !== 'paid' && (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-center text-sm font-medium text-secondary-foreground">
              목표 인원 달성! 공동구매가 완료되었습니다.
            </p>
          )}
        </>
      )}
    </div>
  );

  let actionPanel: React.ReactNode = null;

  if (isPreparing) {
    actionPanel = (
      <StickyActionPanel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between text-base font-bold">
            <span>1인 청구 금액</span>
            <span>{formatPrice(charge)}원</span>
          </div>
          <button
            type="button"
            disabled
            className="mt-3 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl bg-muted text-base font-semibold text-muted-foreground opacity-70"
          >
            {isReservation ? '사전 예약하기' : '함께 구매하기 (결제)'}
          </button>
        </div>
      </StickyActionPanel>
    );
  } else if (isReservation) {
    const reserved = alreadyReserved;
    const checking = Boolean(profile?.id) && !reservationChecked;
    const canReserve = !reserved && !isReservationFull;
    const busy = status === 'loading' || !ready || checking;

    actionPanel = (
      <StickyActionPanel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between text-base font-bold">
            <span>1인 청구 금액</span>
            <span>{formatPrice(charge)}원</span>
          </div>
          {profile ? (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              <span className="font-medium">{profile.name}</span> · {profile.phone}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              사전 예약하려면 로그인이 필요합니다.
            </p>
          )}
          <button
            type="button"
            disabled={reserved || !canReserve || busy}
            onClick={handleReserve}
            className={cn(
              'mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold',
              reserved || isReservationFull
                ? 'cursor-not-allowed bg-muted text-muted-foreground opacity-80'
                : 'bg-primary text-primary-foreground',
              busy && canReserve && 'opacity-70',
            )}
          >
            {status === 'loading' || checking ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                {checking ? '확인 중…' : '예약 중…'}
              </>
            ) : reserved ? (
              '예약 완료'
            ) : isReservationFull ? (
              '예약 마감'
            ) : profile ? (
              '사전 예약하기'
            ) : (
              '로그인하고 사전 예약하기'
            )}
          </button>
          {reserved && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              취소는{' '}
              <Link
                href="/orders"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                내 공동구매
              </Link>
              에서 할 수 있어요
            </p>
          )}
          {message && (
            <p
              className={cn(
                'mt-2 rounded-xl px-3 py-2 text-sm',
                status === 'error'
                  ? 'bg-destructive-muted text-destructive'
                  : 'bg-success-muted text-success',
              )}
            >
              {message}
            </p>
          )}
        </div>
      </StickyActionPanel>
    );
  } else {
    actionPanel = (
      <StickyActionPanel>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between text-base font-bold">
            <span>1인 청구 금액</span>
            <span>{formatPrice(charge)}원</span>
          </div>
          {!isComplete && status !== 'paid' ? (
            <>
              {profile ? (
                <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                  <span className="font-medium">{profile.name}</span> · {profile.phone}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  결제하려면 휴대폰 인증 로그인이 필요합니다.
                </p>
              )}
              <button
                type="button"
                disabled={status === 'loading' || !ready}
                onClick={handleParticipate}
                className={cn(
                  'mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground',
                  (status === 'loading' || !ready) && 'opacity-70',
                )}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="size-5 animate-spin" /> 결제 진행 중…
                  </>
                ) : profile ? (
                  '함께 구매하기 (결제)'
                ) : (
                  '로그인하고 구매하기'
                )}
              </button>
            </>
          ) : null}
          {message && (
            <p
              className={cn(
                'mt-2 rounded-xl px-3 py-2 text-sm',
                status === 'paid'
                  ? 'bg-success-muted text-success'
                  : 'bg-destructive-muted text-destructive',
              )}
            >
              {message}
            </p>
          )}
        </div>
      </StickyActionPanel>
    );
  }

  return (
    <div>
      <div className="px-5">{summaryCard}</div>
      <div className="mt-3">{actionPanel}</div>
      {children}
    </div>
  );
}
