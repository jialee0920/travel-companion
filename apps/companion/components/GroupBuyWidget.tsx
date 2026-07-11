'use client';

import { useState } from 'react';
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
};

const PAYMENT_NOT_CONFIGURED_MSG =
  '결제 연동 설정 중입니다. PG 키 등록 후 다시 시도해 주세요.';

export function GroupBuyWidget({ product }: Props) {
  const router = useRouter();
  const { profile, ready } = useUserProfile();
  const [status, setStatus] = useState<'idle' | 'loading' | 'paid' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isKakaoChannel = product.actionType === 'kakao_channel';
  const isComplete =
    !isKakaoChannel &&
    (product.groupBuyStatus === 'success' || product.currentCount >= product.targetCount);
  const charge = perPersonCharge(product.discountedPrice, product.targetCount);

  async function handleParticipate() {
    if (!ready) return;

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

  if (isKakaoChannel) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          동행찾기에서 묵호 시그널 모집글을 확인하고 신청해보세요
        </p>
        <Link
          href="/gatherings"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground"
        >
          동행 모집글 보러가기
          <ArrowRight className="size-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-primary-muted px-2 py-1 text-sm font-bold text-primary">
          {formatDiscountPercent(product.discountRate)}% 할인
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold">
          <Users className="size-4 text-primary" />
          목표 {product.targetCount}명 · 현재 {product.currentCount}명
        </span>
      </div>

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

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        1인 금액이 아니라, 공동구매 달성 시 목표 인원으로 나눈 금액을 청구해요.
      </p>

      {!isComplete && status !== 'paid' && (
        <div className="mt-4 space-y-2">
          {profile ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              <span className="font-medium">{profile.name}</span> · {profile.phone}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              결제하려면 휴대폰 인증 로그인이 필요합니다.
            </p>
          )}
          <button
            type="button"
            disabled={status === 'loading' || !ready}
            onClick={handleParticipate}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground',
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
        </div>
      )}

      {isComplete && status !== 'paid' && (
        <p className="mt-4 rounded-xl bg-secondary px-3 py-2 text-center text-sm font-medium text-secondary-foreground">
          목표 인원 달성! 공동구매가 완료되었습니다.
        </p>
      )}

      {message && (
        <p
          className={cn(
            'mt-3 rounded-xl px-3 py-2 text-sm',
            status === 'paid' ? 'bg-success-muted text-success' : 'bg-destructive-muted text-destructive',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
