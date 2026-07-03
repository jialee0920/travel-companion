'use client';

import { Compass, Home, MessageCircle, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type NavTab = 'map' | 'explore' | 'group-buy' | 'chat' | 'profile';

type Props = {
  active: NavTab;
  onChange?: (tab: NavTab) => void;
};

const TABS: { id: NavTab; label: string; icon: typeof Home; href?: string; disabled?: boolean }[] = [
  { id: 'map', label: '동행', icon: Home },
  { id: 'group-buy', label: '공동구매', icon: ShoppingBag, href: '/group-buy' },
  { id: 'explore', label: '탐색', icon: Compass },
  { id: 'chat', label: '채팅', icon: MessageCircle, disabled: true },
  { id: 'profile', label: 'MY', icon: User, disabled: true },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-5 pt-2 backdrop-blur">
      <div className="flex items-center justify-around">
        {TABS.map(({ id, label, icon: Icon, href, disabled }) => {
          const selected = active === id;
          const content = (
            <>
              <Icon className={cn('size-5', selected && 'text-primary')} />
              <span className={cn('text-[10px] font-medium', selected ? 'text-primary' : 'text-muted-foreground')}>
                {label}
              </span>
              {disabled && (
                <span className="absolute -top-0.5 right-1 rounded bg-muted px-1 text-[8px] text-muted-foreground">
                  준비중
                </span>
              )}
            </>
          );

          if (href) {
            return (
              <Link
                key={id}
                href={href}
                className="relative flex flex-col items-center gap-0.5 px-2 py-1"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange?.(id)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-2 py-1',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
