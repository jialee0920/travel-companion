'use client';

import { useState } from 'react';
import { GroupBuyCard } from '@/components/GroupBuyCard';
import { ProductCategoryTabFilter } from '@/components/ProductCategoryTabFilter';
import { RegionTabFilter } from '@/components/RegionTabFilter';
import {
  DEFAULT_PRODUCT_CATEGORY_TAB,
  filterByProductCategory,
  type ProductCategoryTabId,
} from '@/lib/regions/product-categories';
import {
  DEFAULT_REGION_TAB,
  filterByRegionTab,
  type RegionTabId,
} from '@/lib/regions/product-tabs';
import type { RegionProduct } from '@/lib/regions/types';

type Props = {
  products: RegionProduct[];
};

export function GroupBuyProductList({ products }: Props) {
  const [regionTab, setRegionTab] = useState<RegionTabId>(DEFAULT_REGION_TAB);
  const [categoryTab, setCategoryTab] = useState<ProductCategoryTabId>(
    DEFAULT_PRODUCT_CATEGORY_TAB,
  );

  const byRegion = filterByRegionTab(products, regionTab);
  const filtered = filterByProductCategory(byRegion, categoryTab);
  const sorted = [...filtered].sort((a, b) => {
    const aPrep = a.groupBuyStatus === 'preparing' ? 1 : 0;
    const bPrep = b.groupBuyStatus === 'preparing' ? 1 : 0;
    return aPrep - bPrep;
  });

  return (
    <>
      <RegionTabFilter active={regionTab} onChange={setRegionTab} />
      <ProductCategoryTabFilter active={categoryTab} onChange={setCategoryTab} />

      <div className="flex flex-col gap-3.5 px-4 pb-4">
        {sorted.length === 0 ? (
          <p className="rounded-[1.25rem] border border-border/80 bg-card py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            이 조건에 맞는 공동구매가 없습니다.
          </p>
        ) : (
          sorted.map((product) => <GroupBuyCard key={product.id} product={product} />)
        )}
      </div>
    </>
  );
}
