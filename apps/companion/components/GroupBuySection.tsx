import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { RegionProduct } from '@/lib/regions/types';
import { GroupBuyCard } from './GroupBuyCard';
import { cn } from '@/lib/utils';

type Props = {
  products: RegionProduct[];
  variant?: 'home' | 'page';
};

export function GroupBuySection({ products, variant = 'page' }: Props) {
  const active = products.filter((p) => p.groupBuyStatus === 'open');
  const items = (active.length > 0 ? active : products).slice(0, variant === 'home' ? 1 : 2);

  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        variant === 'home' ? 'px-4 pb-3' : 'border-t border-border bg-background px-4 py-4',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          variant === 'home' ? 'mb-2' : 'mb-3',
        )}
      >
        {variant === 'home' ? (
          <p className="text-sm font-semibold text-foreground">공동구매</p>
        ) : (
          <div>
            <h2 className="text-base font-bold text-foreground">함께 구매하면 더 저렴해요</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">목표 인원 달성 시 할인가로 이용</p>
          </div>
        )}
        <Link
          href="/group-buy"
          className="flex items-center gap-0.5 text-xs font-semibold text-primary"
        >
          {variant === 'home' ? '더보기' : '전체 보기'}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((p) => (
          <GroupBuyCard key={p.id} product={p} compact />
        ))}
      </div>
    </section>
  );
}
