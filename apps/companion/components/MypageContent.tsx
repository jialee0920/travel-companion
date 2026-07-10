'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Pencil, Phone, User } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatPrice } from '@/lib/geo';
import type { OrderRecord } from '@/lib/db/orders';
import { getRegionDisplayName } from '@/lib/regions';

type Props = {
  initialOrders?: OrderRecord[];
};

export function MypageContent({ initialOrders = [] }: Props) {
  const router = useRouter();
  const { profile, ready, loading, logout } = useUserProfile();
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!ready || !profile) return;
    if (!profile.profile_completed) {
      router.replace(
        `/profile/setup?returnUrl=${encodeURIComponent('/mypage')}`,
      );
    }
  }, [ready, profile, router]);

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

  async function handleLogout() {
    await logout();
    router.push('/');
    router.refresh();
  }

  if (!ready || !profile) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 pt-2">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-primary">내 정보</p>
          <div className="flex items-center gap-1">
            <Link
              href="/profile/setup?returnUrl=%2Fmypage&edit=1"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              <Pencil className="size-3.5" />
              프로필 수정
            </Link>
            <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
            로그아웃
          </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-6" />
          </span>
          <div>
            <p className="text-lg font-bold">{profile.name}{profile.age != null ? ` · 만 ${profile.age}세` : ''}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              {profile.phone}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              활동 지역 · {getRegionDisplayName(profile.region)}
            </p>
          </div>
        </div>
        {(profile.bio || (profile.interest_categories?.length ?? 0) > 0) && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {profile.bio && (
              <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
            )}
            {(profile.interest_categories?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.interest_categories!.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-primary-muted px-2.5 py-0.5 text-xs font-semibold text-primary"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {!profile.bio && (profile.interest_categories?.length ?? 0) === 0 && (
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            아직 자기소개가 없어요.{' '}
            <Link href="/profile/setup?returnUrl=%2Fmypage&edit=1" className="font-medium text-primary">
              프로필 작성하기
            </Link>
          </p>
        )}
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
                        ? 'shrink-0 rounded-md bg-success-muted px-2 py-0.5 text-xs font-semibold text-success'
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
