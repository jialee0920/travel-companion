'use client';

import { useMemo, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { getRegion } from '@/lib/regions';
import type { CategoryFilter, RegionCompanion, RegionProduct } from '@/lib/regions/types';
import {
  bearingDegrees,
  haversineDistanceKm,
} from '@/lib/geo';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocationConsent } from '@/hooks/useLocationConsent';
import { CategoryFilter as CategoryFilterBar } from '@/components/CategoryFilter';
import { CompanionMap } from '@/components/CompanionMap';
import { CompanionCard } from '@/components/CompanionCard';
import { CompanionDetailSheet } from '@/components/CompanionDetailSheet';
import { GroupBuySection } from '@/components/GroupBuySection';
import { BottomNav, type NavTab } from '@/components/BottomNav';
import { LocationConsentBanner } from '@/components/LocationConsentBanner';

const region = getRegion();

type Props = {
  products: RegionProduct[];
};

function enrichCompanion(
  c: RegionCompanion,
  userLat?: number,
  userLng?: number,
): { distanceKm?: number; angle?: number } {
  if (userLat == null || userLng == null) return {};
  return {
    distanceKm: haversineDistanceKm(userLat, userLng, c.lat, c.lng),
    angle: bearingDegrees(userLat, userLng, c.lat, c.lng),
  };
}

export function HomeClient({ products }: Props) {
  const { consented, accept, decline, ready } = useLocationConsent();
  const geoEnabled = consented === true;
  const { position } = useGeolocation(geoEnabled);

  const [tab, setTab] = useState<NavTab>('map');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const companions = useMemo(() => {
    const list =
      category === 'all'
        ? region.companions
        : region.companions.filter((c) => c.category === category);
    return [...list].sort((a, b) => {
      const da = enrichCompanion(a, position?.lat, position?.lng).distanceKm ?? a.distanceKm;
      const db = enrichCompanion(b, position?.lat, position?.lng).distanceKm ?? b.distanceKm;
      return da - db;
    });
  }, [category, position]);

  const activeCompanion = companions.find((c) => c.id === activeId) ?? null;

  return (
    <main className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-background">
      <header className="z-30 flex items-center gap-3 px-5 pb-1 pt-12">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-primary">{region.bannerSubtitle}</p>
          <h1 className="text-xl font-bold tracking-tight">{region.bannerTitle}</h1>
        </div>
        <button
          type="button"
          aria-label="알림"
          className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary" />
        </button>
      </header>

      <div className="z-30 px-5 pb-1 pt-2">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
          <Search className="size-4" />
          어떤 동행을 찾고 있나요?
        </div>
      </div>

      {(tab === 'map' || tab === 'explore') && (
        <CategoryFilterBar active={category} onChange={setCategory} />
      )}

      {tab === 'map' && <GroupBuySection products={products} variant="home" />}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {tab === 'map' && (
          <div className="flex h-full flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="relative h-52 shrink-0">
              <CompanionMap
                companions={companions}
                spots={region.spots}
                centerLat={region.mapCenter.lat}
                centerLng={region.mapCenter.lng}
                radiusKm={region.searchRadiusKm}
                userLat={position?.lat}
                userLng={position?.lng}
                activeId={activeId}
                onSelect={setActiveId}
              />
            </div>

            <div className="shrink-0 rounded-t-3xl border-t border-border bg-background pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between px-5 pb-2">
                <p className="text-sm font-semibold">내 주변 동행 {companions.length}명</p>
                <span className="text-xs text-muted-foreground">가까운 순</span>
              </div>
              <div className="flex flex-col gap-3 px-4 pb-4">
                {companions.map((c) => {
                  const live = enrichCompanion(c, position?.lat, position?.lng);
                  return (
                    <CompanionCard
                      key={c.id}
                      companion={c}
                      active={c.id === activeId}
                      liveDistanceKm={live.distanceKm}
                      liveAngle={live.angle}
                      onClick={() => setActiveId(c.id)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'explore' && (
          <div className="h-full overflow-y-auto px-4 pb-24 pt-1">
            <div className="flex flex-col gap-3">
              {companions.map((c) => {
                const live = enrichCompanion(c, position?.lat, position?.lng);
                return (
                  <CompanionCard
                    key={c.id}
                    companion={c}
                    active={c.id === activeId}
                    liveDistanceKm={live.distanceKm}
                    liveAngle={live.angle}
                    onClick={() => setActiveId(c.id)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <CompanionDetailSheet
        companion={activeCompanion}
        liveDistanceKm={
          activeCompanion
            ? enrichCompanion(activeCompanion, position?.lat, position?.lng).distanceKm
            : undefined
        }
        onClose={() => setActiveId(null)}
      />

      {ready && consented === null && (
        <LocationConsentBanner onAccept={accept} onDecline={decline} />
      )}

      {geoEnabled && !position && (
        <p className="absolute bottom-24 left-0 right-0 text-center text-[10px] text-muted-foreground">
          위치 조회 중… (화면 사용 중에만 갱신)
        </p>
      )}
    </main>
  );
}
