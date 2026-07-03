'use client';

import { Compass, Home, MessageCircle, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type NavTab = 'map' | 'explore' | 'group-buy' | 'chat' | 'profile';

type Props = {
  active?: NavTab;
  onChange?: (tab: NavTab) => void;
};

const TABS: {
  id: NavTab;
  label: string;
  icon: typeof Home;
  href?: string;
  homeOnly?: boolean;
}[] = [
  { id: 'map', label: '동행', icon: Home, href: '/' },
  { id: 'group-buy', label: '공동구매', icon: ShoppingBag, href: '/group-buy' },
  { id: 'explore', label: '탐색', icon: Compass, homeOnly: true },
  { id: 'chat', label: '채팅', icon: MessageCircle, href: '/chat' },
  { id: 'profile', label: 'MY', icon: User, href: '/mypage' },
];

export function BottomNav({ active, onChange }: Props) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 px-2 pb-5 pt-2 backdrop-blur">
      <div className="flex items-center justify-around">
        {TABS.map(({ id, label, icon: Icon, href, homeOnly }) => {
          const selected =
            isHome && homeOnly
              ? active === id
              : href
                ? pathname === href || pathname.startsWith(`${href}/`)
                : active === id;
          const content = (
            <>
              <Icon className={cn('size-5', selected && 'text-primary')} />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  selected ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </>
          );

          if (homeOnly && isHome) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange?.(id)}
                className="flex flex-col items-center gap-0.5 px-2 py-1"
              >
                {content}
              </button>
            );
          }

          if (href) {
            return (
              <Link key={id} href={href} className="flex flex-col items-center gap-0.5 px-2 py-1">
                {content}
              </Link>
            );
          }

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange?.(id)}
              className="flex flex-col items-center gap-0.5 px-2 py-1"
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
