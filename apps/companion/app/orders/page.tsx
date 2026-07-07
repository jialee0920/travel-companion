import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { BottomChrome } from '@/components/BottomChrome';
import { bottomChromePaddingClass } from '@/lib/bottom-chrome';
import { listOrders } from '@/lib/db/orders';
import { formatPrice } from '@/lib/geo';

export default async function OrdersPage() {
  const orders = await listOrders();

  return (
    <main className={`mx-auto min-h-screen max-w-md bg-background ${bottomChromePaddingClass(true)}`}>
      <header className="flex items-center gap-3 px-4 pt-12 pb-4">
        <Link
          href="/group-buy"
          aria-label="뒤로"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">참여 / 주문 현황</h1>
          <p className="text-xs text-muted-foreground">발급된 이용권 · 결제 내역</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4">
        {orders.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            아직 참여·주문 내역이 없습니다.
          </p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.product_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {order.participant_name} · {order.region}
                  </p>
                </div>
                <span
                  className={
                    order.payment_status === 'paid'
                      ? 'rounded-md bg-success-muted px-2 py-0.5 text-xs font-semibold text-success'
                      : 'rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                  }
                >
                  {order.payment_status === 'paid' ? '결제완료' : order.payment_status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-primary">{order.order_code}</span>
                <span className="font-bold">{formatPrice(order.amount)}원</span>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomChrome hideNav />
    </main>
  );
}
