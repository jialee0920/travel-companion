'use client';

import { Dumbbell, Plane, Sparkles, Utensils } from 'lucide-react';
import type { CategoryFilter } from '@/lib/regions/types';
import { CATEGORY_OPTIONS } from '@/lib/regions/types';
import { cn } from '@/lib/utils';

const ICONS = {
  all: Sparkles,
  meal: Utensils,
  exercise: Dumbbell,
  travel: Plane,
} as const;

type Props = {
  active: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
};

export function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CATEGORY_OPTIONS.map(({ id, label }) => {
        const Icon = ICONS[id];
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-secondary',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
