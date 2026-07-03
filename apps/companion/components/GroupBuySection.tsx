import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { RegionProduct } from '@/lib/regions/types';
import { GroupBuyCard } from './GroupBuyCard';

type Props = {
  products: RegionProduct[];
};

export function GroupBuySection({ products }: Props) {
  const active = products.filter((p) => p.groupBuyStatus === 'open');

  return (
    <section className="border-t border-border bg-background px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-primary">묵호 공동구매</p>
          <h2 className="text-base font-bold text-foreground">함께 구매하면 더 저렴해요</h2>
        </div>
        <Link
          href="/group-buy"
          className="flex items-center gap-0.5 text-xs font-semibold text-primary"
        >
          전체 보기
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {(active.length > 0 ? active : products).slice(0, 2).map((p) => (
          <GroupBuyCard key={p.id} product={p} compact />
        ))}
      </div>
    </section>
  );
}
