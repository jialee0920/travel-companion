'use client';

import {
  DEFAULT_PRODUCT_REGION_TAB,
  PRODUCT_REGION_TABS,
  type ProductRegionTabId,
} from '@/lib/regions/product-tabs';
import { cn } from '@/lib/utils';

type Props = {
  active: ProductRegionTabId;
  onChange: (value: ProductRegionTabId) => void;
};

export function GroupBuyRegionFilter({
  active = DEFAULT_PRODUCT_REGION_TAB,
  onChange,
}: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PRODUCT_REGION_TABS.map(({ id, label }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex shrink-0 items-center rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-secondary',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
