import type { NavTab } from '@/components/BottomNav';
import { BottomChrome } from '@/components/BottomChrome';
import { bottomChromePaddingClass } from '@/lib/bottom-chrome';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  active: NavTab;
  hideNav?: boolean;
};

export function PageShell({ children, active, hideNav }: Props) {
  return (
    <div
      className={cn(
        'relative mx-auto min-h-[100dvh] max-w-md bg-background',
        bottomChromePaddingClass(hideNav),
      )}
    >
      {children}
      <BottomChrome active={active} hideNav={hideNav} />
    </div>
  );
}
