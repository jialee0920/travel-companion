import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Receipt } from 'lucide-react';
import { listProducts } from '@/lib/db/products';
import { GroupBuyCard } from '@/components/GroupBuyCard';
import { PageShell } from '@/components/PageShell';

export default async function GroupBuyPage() {
  const products = await listProducts();

  return (
    <PageShell active="group-buy">
      <header className="flex items-center gap-3 px-4 pb-3 pt-12">
        <Link
          href="/"
          aria-label="뒤로"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">공동구매</h1>
          <p className="text-xs text-muted-foreground">함께 모이면 더 저렴하게</p>
        </div>
        <Link
          href="/orders"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card"
          aria-label="주문 내역"
        >
          <Receipt className="size-5" />
        </Link>
      </header>

      <div className="relative mx-4 mb-5 overflow-hidden rounded-2xl">
        <div className="relative h-36">
          <Image src="/map-bg.png" alt="" fill className="object-cover" sizes="400px" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-sm font-bold text-foreground">목표 인원 모집 · 할인 자동 적용</p>
            <p className="text-xs text-muted-foreground">
              함께 모이면 더 저렴하게, 달성 시 이용권이 발급돼요.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {products.map((product) => (
          <GroupBuyCard key={product.id} product={product} />
        ))}
      </div>
    </PageShell>
  );
}
