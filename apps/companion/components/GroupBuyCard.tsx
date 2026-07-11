import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Users } from 'lucide-react';
import type { RegionProduct } from '@/lib/regions/types';
import { formatPrice, perPersonCharge } from '@/lib/geo';
import { formatDiscountPercent, resolveProductImageUrl } from '@/lib/products/format';
import { cn } from '@/lib/utils';

type Props = {
  product: RegionProduct;
  compact?: boolean;
};

export function GroupBuyCard({ product, compact }: Props) {
  const isKakaoChannel = product.actionType === 'kakao_channel';
  const charge = perPersonCharge(product.discountedPrice, product.targetCount);
  const isComplete =
    !isKakaoChannel &&
    (product.groupBuyStatus === 'success' ||
      product.currentCount >= product.targetCount);
  const imageUrl = resolveProductImageUrl(product.imageUrl);
  const progress =
    product.targetCount > 0
      ? Math.min(100, Math.round((product.currentCount / product.targetCount) * 100))
      : 0;

  return (
    <Link
      href={`/product/${product.id}`}
      className={cn(
        'flex gap-3 rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/30',
        compact && 'p-3',
      )}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isKakaoChannel ? (
            <>
              <span className="rounded-md bg-primary-muted px-1.5 py-0.5 text-micro font-bold text-primary">
                얼리버드
              </span>
              <span className="text-micro font-semibold text-muted-foreground">
                카카오채널에서 신청
              </span>
            </>
          ) : (
            <>
              <span className="rounded-md bg-primary-muted px-1.5 py-0.5 text-micro font-bold text-primary">
                {formatDiscountPercent(product.discountRate)}% 할인
              </span>
              {isComplete && (
                <span className="text-micro font-semibold text-muted-foreground">
                  모집 완료
                </span>
              )}
            </>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-foreground">
          {product.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isKakaoChannel
            ? `${formatPrice(product.discountedPrice)}원`
            : `${formatPrice(charge)}원 / 1인 청구 · 총 ${formatPrice(product.discountedPrice)}원`}
        </p>
        {isKakaoChannel ? (
          <div className="mt-2.5 flex items-center justify-end">
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
              <Users className="size-3.5" />
              {product.currentCount} / {product.targetCount}명
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        )}
      </div>
    </Link>
  );
}
