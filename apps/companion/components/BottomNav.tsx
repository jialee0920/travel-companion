'use client';

import { Map, MessageCircle, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { cn } from '@/lib/utils';

export type NavTab = 'map' | 'explore' | 'group-buy' | 'chat' | 'profile';

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
  { id: 'map', label: '지도', icon: Map, href: '/map' },
  { id: 'group-buy', label: '공동구매', icon: ShoppingBag, href: '/group-buy' },
  { id: 'explore', label: '동행찾기', icon: Search, href: '/' },
  { id: 'chat', label: '대화하기', icon: MessageCircle, href: '/chat' },
  { id: 'profile', label: '내프로필', icon: User, href: '/mypage' },
];

function isTabSelected(id: NavTab, href: string, pathname: string, active?: NavTab): boolean {
  if (active === id) return true;

  if (id === 'map') {
    return pathname === '/map' || pathname.startsWith('/map/');
  }

  if (id === 'explore') {
    return (
      pathname === '/' ||
      pathname === '/gatherings' ||
      pathname.startsWith('/gatherings/')
    );
  }

  if (id === 'group-buy') {
    return (
      pathname === '/group-buy' ||
      pathname.startsWith('/group-buy/') ||
      pathname.startsWith('/product/')
    );
  }

  if (id === 'chat') {
    return pathname === '/chat' || pathname.startsWith('/chat/');
  }

  if (id === 'profile') {
    return (
      pathname.startsWith('/mypage') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/orders')
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">
      {label}
    </span>
  );
}

export function BottomNav({ active, embedded }: Props) {
  const pathname = usePathname();
  const { count: unreadCount } = useChatUnreadCount();

  return (
    <nav
      className={cn(
        embedded
          ? 'px-1 pb-4 pt-1'
          : 'fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 px-1 pb-4 pt-2 backdrop-blur',
      )}
    >
      <div className="grid grid-cols-5 items-end">
        {TABS.map(({ id, label, icon: Icon, href }) => {
          const selected = isTabSelected(id, href, pathname, active);

          // 가운데 동행찾기 탭에 검정 원형 강조
          if (id === 'explore') {
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
              className="flex flex-col items-center justify-end gap-0.5 px-0.5 py-1"
            >
              <span className="relative">
                <Icon
                  className={cn('size-5', selected ? 'text-primary' : 'text-muted-foreground')}
                  strokeWidth={selected ? 2.25 : 1.75}
                />
                {id === 'chat' && <UnreadBadge count={unreadCount} />}
              </span>
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
