'use client';

import type { NavTab } from '@/components/BottomNav';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/SiteFooter';

type Props = {
  active?: NavTab;
  hideNav?: boolean;
  onNavChange?: (tab: NavTab) => void;
};

export function BottomChrome({ active, hideNav, onNavChange }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <SiteFooter />
      {!hideNav && <BottomNav active={active} onChange={onNavChange} embedded />}
    </div>
  );
}
