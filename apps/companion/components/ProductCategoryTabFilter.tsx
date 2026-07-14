'use client';

import {
  DEFAULT_PRODUCT_CATEGORY_TAB,
  PRODUCT_CATEGORY_TABS,
  type ProductCategoryTabId,
} from '@/lib/regions/product-categories';
import { cn } from '@/lib/utils';

type Props = {
  active: ProductCategoryTabId;
  onChange: (value: ProductCategoryTabId) => void;
};

export function ProductCategoryTabFilter({
  active = DEFAULT_PRODUCT_CATEGORY_TAB,
  onChange,
}: Props) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PRODUCT_CATEGORY_TABS.map(({ id, label }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
