'use client';

import { ShoppingBag, User, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type NavTab = 'gatherings' | 'group-buy' | 'profile';

type Props = {
  active?: NavTab;
  onChange?: (tab: NavTab) => void;
  /** BottomChrome 내부에서 사용 시 fixed 스타일 제거 */
  embedded?: boolean;
};

const TABS: {
  id: NavTab;
  label: string;
  icon: typeof ShoppingBag;
  href: string;
}[] = [
  { id: 'gatherings', label: '동행 모집', icon: UsersRound, href: '/gatherings' },
  { id: 'group-buy', label: '공동구매', icon: ShoppingBag, href: '/' },
  { id: 'profile', label: '내 프로필', icon: User, href: '/mypage' },
];

function isTabSelected(id: NavTab, href: string, pathname: string, active?: NavTab): boolean {
  if (active === id) return true;

  if (id === 'group-buy') {
    return (
      pathname === '/' ||
      pathname === '/group-buy' ||
      pathname.startsWith('/product/') ||
      pathname.startsWith('/orders')
    );
  }

  if (id === 'profile') {
    return pathname.startsWith('/mypage') || pathname.startsWith('/profile');
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ active, embedded }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        embedded
          ? 'px-1 pb-4 pt-1'
          : 'fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 px-1 pb-4 pt-2 backdrop-blur',
      )}
    >
      <div className="grid grid-cols-3 items-end">
        {TABS.map(({ id, label, icon: Icon, href }) => {
          const selected = isTabSelected(id, href, pathname, active);

          if (id === 'group-buy') {
            return (
              <Link
                key={id}
                href={href}
                className="relative -mt-5 flex flex-col items-center justify-end"
              >
                <span className="flex size-[3.25rem] items-center justify-center rounded-full bg-foreground shadow-[0_6px_16px_rgba(0,0,0,0.22)]">
                  <Icon className="size-6 text-background" strokeWidth={2} />
                </span>
                <span
                  className={cn(
                    'mt-1 whitespace-nowrap text-[10px] font-semibold leading-none',
                    selected ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={id}
              href={href}
              className="flex flex-col items-center justify-end gap-0.5 px-1 py-1"
            >
              <Icon
                className={cn('size-5', selected ? 'text-primary' : 'text-muted-foreground')}
                strokeWidth={selected ? 2.25 : 1.75}
              />
              <span
                className={cn(
                  'whitespace-nowrap text-[10px] font-medium leading-none',
                  selected ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
