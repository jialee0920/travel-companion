'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
};

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled,
  onChange,
  className,
}: Props) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <span className="text-sm font-medium">수량</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || atMin}
          aria-label="수량 줄이기"
          onClick={() => onChange(Math.max(min, value - 1))}
          className={cn(
            'flex size-9 items-center justify-center rounded-xl border border-border bg-background',
            (disabled || atMin) && 'cursor-not-allowed opacity-40',
          )}
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-[2rem] text-center text-base font-bold tabular-nums">{value}</span>
        <button
          type="button"
          disabled={disabled || atMax}
          aria-label="수량 늘리기"
          onClick={() => onChange(Math.min(max, value + 1))}
          className={cn(
            'flex size-9 items-center justify-center rounded-xl border border-border bg-background',
            (disabled || atMax) && 'cursor-not-allowed opacity-40',
          )}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
