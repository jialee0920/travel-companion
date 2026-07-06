'use client';

import { useMemo, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { getRegion } from '@/lib/regions';
import type { CategoryFilter, RegionProduct } from '@/lib/regions/types';
import { buildCompanionList } from '@/lib/companions/build-list';
import { bearingDegrees } from '@/lib/geo';
import { getMapViewCenter, isNearRegionCenter } from '@/lib/geo/map-view';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocationConsent } from '@/hooks/useLocationConsent';
import { useLocationReporter } from '@/hooks/useLocationReporter';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
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

export function HomeClient({ products }: Props) {
  const { consented, accept, decline, ready } = useLocationConsent();
  const { profile } = useUserProfile();
  const [tab, setTab] = useState<NavTab>('map');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const mapOrExplore = tab === 'map' || tab === 'explore';
  const geoEnabled = consented === true && mapOrExplore;
  const {
    position,
    error: geoError,
    loading: geoLoading,
    needsUserGesture,
    requestNow,
  } = useGeolocation(geoEnabled);
  const { users: nearbyUsers } = useNearbyUsers(geoEnabled && !!profile?.id);
  useLocationReporter(position, geoEnabled && !!profile?.id);

  const companions = useMemo(
    () =>
      buildCompanionList({
        mocks: region.companions,
        realUsers: nearbyUsers,
        spots: region.spots,
        category,
        radiusKm: region.searchRadiusKm,
        userLat: position?.lat,
        userLng: position?.lng,
      }),
    [category, position, nearbyUsers],
  );

  const activeCompanion = companions.find((c) => c.id === activeId) ?? null;

  const mapCenter = getMapViewCenter(position?.lat, position?.lng, region.mapCenter);
  const showRegionSpots =
    position != null
      ? isNearRegionCenter(position.lat, position.lng, region.mapCenter)
      : true;

  function handleLocationAccept() {
    void requestNow();
    accept();
  }

  const showConsentBanner =
    ready && mapOrExplore && (consented === null || consented === false);
  const showLocationPrompt =
    geoEnabled && needsUserGesture && !position && tab === 'map';

  function liveAngle(companionId: string, lat: number, lng: number) {
    if (position == null) return undefined;
    const item = companions.find((c) => c.id === companionId);
    if (item?.kind !== 'mock') return undefined;
    return bearingDegrees(position.lat, position.lng, lat, lng);
  }

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

      {mapOrExplore && <CategoryFilterBar active={category} onChange={setCategory} />}

      {tab === 'map' && <GroupBuySection products={products} variant="home" />}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === 'map' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative h-64 shrink-0">
              <CompanionMap
                companions={companions}
                spots={region.spots}
                showSpots={showRegionSpots}
                centerLat={mapCenter.lat}
                centerLng={mapCenter.lng}
                radiusKm={region.searchRadiusKm}
                userLat={position?.lat}
                userLng={position?.lng}
                activeId={activeId}
                onSelect={setActiveId}
              />
              {showLocationPrompt && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/70 px-6 backdrop-blur-[2px]">
                  <p className="text-center text-sm font-medium text-foreground">
                    내 주변 동행을 보려면 위치 허용이 필요합니다
                  </p>
                  {geoError && (
                    <p className="text-center text-xs text-muted-foreground">{geoError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void requestNow()}
                    disabled={geoLoading}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {geoLoading ? '요청 중…' : '위치 허용하기'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl border-t border-border bg-background pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)]">
              <div className="flex shrink-0 items-center justify-between px-5 pb-2">
                <p className="text-sm font-semibold">내 주변 동행 {companions.length}명</p>
                <span className="text-xs text-muted-foreground">가까운 순</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex flex-col gap-3">
                  {companions.map((c) => (
                    <CompanionCard
                      key={c.id}
                      companion={c}
                      active={c.id === activeId}
                      liveAngle={liveAngle(c.id, c.lat, c.lng)}
                      onClick={() => setActiveId(c.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'explore' && (
          <div className="h-full overflow-y-auto px-4 pb-24 pt-1">
            {geoEnabled && needsUserGesture && !position && (
              <div className="mb-3 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-medium">위치 허용이 필요합니다</p>
                {geoError && (
                  <p className="mt-1 text-xs text-muted-foreground">{geoError}</p>
                )}
                <button
                  type="button"
                  onClick={() => void requestNow()}
                  disabled={geoLoading}
                  className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {geoLoading ? '요청 중…' : '위치 허용하기'}
                </button>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {companions.map((c) => (
                <CompanionCard
                  key={c.id}
                  companion={c}
                  active={c.id === activeId}
                  liveAngle={liveAngle(c.id, c.lat, c.lng)}
                  onClick={() => setActiveId(c.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <CompanionDetailSheet companion={activeCompanion} onClose={() => setActiveId(null)} />

      {showConsentBanner && (
        <LocationConsentBanner
          onAccept={handleLocationAccept}
          onDecline={decline}
          declinedBefore={consented === false}
        />
      )}

      {geoEnabled && geoLoading && !position && !showLocationPrompt && (
        <p className="absolute bottom-24 left-0 right-0 text-center text-[10px] text-muted-foreground">
          위치 조회 중… (화면 사용 중에만 갱신)
        </p>
      )}
    </main>
  );
}
