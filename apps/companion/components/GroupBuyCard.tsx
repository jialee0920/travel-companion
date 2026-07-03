import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Users } from 'lucide-react';
import type { RegionProduct } from '@/lib/regions/types';
import { formatPrice, perPersonCharge } from '@/lib/geo';
import { cn } from '@/lib/utils';

type Props = {
  product: RegionProduct;
  compact?: boolean;
};

export function GroupBuyCard({ product, compact }: Props) {
  const charge = perPersonCharge(product.regularPrice, product.discountRate, product.targetCount);
  const isComplete = product.groupBuyStatus === 'success' || product.currentCount >= product.targetCount;

  return (
    <Link
      href={`/product/${product.id}`}
      className={cn(
        'flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-secondary/40',
        compact && 'p-2.5',
      )}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {Math.round(product.discountRate * 100)}% 할인
          </span>
          {isComplete && (
            <span className="text-[10px] font-semibold text-muted-foreground">모집 완료</span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatPrice(charge)}원 / 1인 청구 · 총 {formatPrice(product.regularPrice)}원
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
          <Users className="size-3.5" />
          {product.currentCount} / {product.targetCount}명 모집
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </p>
      </div>
    </Link>
  );
}
