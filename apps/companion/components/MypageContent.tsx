'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Phone, User } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatPrice } from '@/lib/geo';
import { DEFAULT_REGION_CODE, getRegion } from '@/lib/regions';
import type { OrderRecord } from '@/lib/db/orders';

type Props = {
  initialOrders?: OrderRecord[];
};

export function MypageContent({ initialOrders = [] }: Props) {
  const { profile, ready, loading, login } = useUserProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const region = getRegion();

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;

    setLoadingOrders(true);
    fetch(`/api/orders/mine?profileId=${encodeURIComponent(profile.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      })
      .finally(() => setLoadingOrders(false));
  }, [profile?.id]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    await login(name.trim(), phone.trim(), DEFAULT_REGION_CODE);
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <form onSubmit={handleLogin} className="flex flex-col gap-4 px-4 pb-28 pt-2">
        <p className="text-sm text-muted-foreground">
          이름과 연락처로 간단히 확인합니다. (별도 비밀번호 없음)
        </p>
        <label className="block">
          <span className="text-sm font-medium">이름</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">연락처</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : '확인하기'}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-2">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-primary">내 정보</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-6" />
          </span>
          <div>
            <p className="text-lg font-bold">{profile.name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              {profile.phone}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">지역 · {region.name}</p>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">공동구매 참여 내역</h2>
          <Link href="/orders" className="text-xs font-medium text-primary">
            전체 주문 보기
          </Link>
        </div>

        {loadingOrders ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            참여한 공동구매가 없습니다.
            <br />
            <Link href="/group-buy" className="mt-1 inline-block text-primary">
              공동구매 둘러보기
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{order.product_name}</p>
                  <span
                    className={
                      order.payment_status === 'paid'
                        ? 'shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary'
                        : 'shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {order.payment_status === 'paid' ? '결제완료' : order.payment_status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-primary">{order.order_code}</span>
                  <span className="font-bold">{formatPrice(order.amount)}원</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
