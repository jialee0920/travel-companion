import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { GroupBuyProductList } from '@/components/GroupBuyProductList';
import { PageShell } from '@/components/PageShell';
import { SaleBanner } from '@/components/SaleBanner';
import { listAllProducts } from '@/lib/db/products';

/** 앱 첫 화면 = 공동구매 목록 */
export default async function HomePage() {
  const products = await listAllProducts();

  return (
    <PageShell active="group-buy">
      <AppHeader
        variant="brand"
        action={
          <Link
            href="/orders"
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card shadow-sm"
            aria-label="주문 내역"
          >
            <Receipt className="size-5" />
          </Link>
        }
      />

      <SaleBanner />

      <div className="mx-4 mb-3 mt-3 overflow-hidden rounded-[1.25rem] border border-primary/20 bg-primary-muted/60 px-4 py-3">
        <p className="text-sm font-bold text-foreground">공동구매 · 목표 인원 모집</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          함께 모이면 더 저렴하게, 달성 시 이용권이 발급돼요.
        </p>
      </div>

      <GroupBuyProductList products={products} />
    </PageShell>
  );
}
