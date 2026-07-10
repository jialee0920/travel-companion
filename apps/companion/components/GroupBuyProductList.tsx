'use client';

import { useState } from 'react';
import { GroupBuyCard } from '@/components/GroupBuyCard';
import { GroupBuyRegionFilter } from '@/components/GroupBuyRegionFilter';
import {
  DEFAULT_PRODUCT_REGION_TAB,
  filterProductsByRegionTab,
  type ProductRegionTabId,
} from '@/lib/regions/product-tabs';
import type { RegionProduct } from '@/lib/regions/types';

type Props = {
  products: RegionProduct[];
};

export function GroupBuyProductList({ products }: Props) {
  const [tab, setTab] = useState<ProductRegionTabId>(DEFAULT_PRODUCT_REGION_TAB);
  const filtered = filterProductsByRegionTab(products, tab);

  return (
    <>
      <GroupBuyRegionFilter active={tab} onChange={setTab} />

      <div className="flex flex-col gap-3 px-4 pb-4">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
            이 지역에 진행 중인 공동구매가 없습니다.
          </p>
        ) : (
          filtered.map((product) => <GroupBuyCard key={product.id} product={product} />)
        )}
      </div>
    </>
  );
}
