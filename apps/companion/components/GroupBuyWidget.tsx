'use client';

import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import type { RegionProduct } from '@/lib/regions/types';
import {
  discountedPrice,
  formatPrice,
  perPersonCharge,
} from '@/lib/geo';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    IMP?: {
      init: (code: string) => void;
      request_pay: (
        params: Record<string, unknown>,
        callback: (response: {
          success: boolean;
          imp_uid?: string;
          merchant_uid?: string;
          error_msg?: string;
        }) => void,
      ) => void;
    };
  }
}

type Props = {
  product: RegionProduct;
};

function loadPortOneScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.IMP) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.iamport.kr/v1/iamport.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('결제 모듈 로드 실패'));
    document.head.appendChild(script);
  });
}

export function GroupBuyWidget({ product }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'paid' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isComplete =
    product.groupBuyStatus === 'success' || product.currentCount >= product.targetCount;
  const charge = perPersonCharge(product.regularPrice, product.discountRate, product.targetCount);
  const totalDiscounted = discountedPrice(product.regularPrice, product.discountRate);

  async function handleParticipate() {
    if (!name.trim() || !phone.trim()) {
      setMessage('이름과 연락처를 입력해주세요.');
      setStatus('error');
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
          name: name.trim(),
          phone: phone.trim(),
          region: product.region,
        }),
      });
      const prepare = await prepareRes.json();
      if (!prepareRes.ok) throw new Error(prepare.error ?? '주문 생성 실패');

      await loadPortOneScript();
      const storeId =
        process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? 'imp00000000';

      window.IMP!.init(storeId);
      window.IMP!.request_pay(
        {
          pg: 'html5_inicis.INIpayTest',
          pay_method: 'card',
          merchant_uid: prepare.merchantUid,
          name: product.name,
          amount: prepare.amount,
          buyer_name: name.trim(),
          buyer_tel: phone.trim(),
        },
        async (response) => {
          if (!response.success) {
            setStatus('error');
            setMessage(response.error_msg ?? '결제가 취소되었습니다.');
            return;
          }

          setStatus('loading');
          const confirmRes = await fetch('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchantUid: prepare.merchantUid,
              impUid: response.imp_uid,
              amount: prepare.amount,
              name: name.trim(),
              phone: phone.trim(),
              productId: product.id,
              productName: product.name,
              region: product.region,
            }),
          });
          const confirm = await confirmRes.json();
          if (!confirmRes.ok) {
            setStatus('error');
            setMessage(confirm.error ?? '결제 확인 실패');
            return;
          }
          setStatus('paid');
          setMessage('결제가 완료되었습니다. 이용권이 발급됩니다.');
        },
      );
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
          {Math.round(product.discountRate * 100)}% 할인
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
          <span className="text-primary">{formatPrice(totalDiscounted)}원</span>
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
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <input
            type="tel"
            placeholder="연락처"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={status === 'loading'}
            onClick={handleParticipate}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground',
              status === 'loading' && 'opacity-70',
            )}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="size-5 animate-spin" /> 결제 진행 중…
              </>
            ) : (
              '함께 구매하기 (결제)'
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
            status === 'paid' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
