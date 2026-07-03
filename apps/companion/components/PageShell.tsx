import type { NavTab } from '@/components/BottomNav';
import { BottomNav } from '@/components/BottomNav';

type Props = {
  children: React.ReactNode;
  active: NavTab;
  hideNav?: boolean;
};

export function PageShell({ children, active, hideNav }: Props) {
  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-md bg-background">
      {children}
      {!hideNav && <BottomNav active={active} />}
    </div>
  );
}
