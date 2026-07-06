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
import { LocationAllowPrompt } from '@/components/LocationAllowPrompt';

const region = getRegion();

type Props = {
  products: RegionProduct[];
};

export function HomeClient({ products }: Props) {
  const { accept } = useLocationConsent();
  const { profile } = useUserProfile();
  const [tab, setTab] = useState<NavTab>('map');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const mapOrExplore = tab === 'map' || tab === 'explore';
  const {
    position,
    error: geoError,
    loading: geoLoading,
    loadingMessage: geoLoadingMessage,
    useRegionFallback,
    applyPosition,
    reportError,
    retryFromUserGesture,
  } = useGeolocation(mapOrExplore);

  const fallbackPosition = useRegionFallback
    ? { lat: region.mapCenter.lat, lng: region.mapCenter.lng, accuracy: 9999 }
    : null;
  const displayPosition = position ?? fallbackPosition;

  const nearbyEnabled = mapOrExplore && !!profile?.id && !!position;
  const { users: nearbyUsers, refresh: refreshNearby } = useNearbyUsers(nearbyEnabled);
  const { saveError: locationSaveError } = useLocationReporter(
    position,
    nearbyEnabled,
    refreshNearby,
  );

  const companions = useMemo(
    () =>
      buildCompanionList({
        mocks: region.companions,
        realUsers: nearbyUsers,
        spots: region.spots,
        category,
        radiusKm: region.searchRadiusKm,
        userLat: displayPosition?.lat,
        userLng: displayPosition?.lng,
      }),
    [category, displayPosition, nearbyUsers],
  );

  const activeCompanion = companions.find((c) => c.id === activeId) ?? null;

  const mapCenter = getMapViewCenter(displayPosition?.lat, displayPosition?.lng, region.mapCenter);
  const showRegionSpots =
    displayPosition != null
      ? isNearRegionCenter(displayPosition.lat, displayPosition.lng, region.mapCenter)
      : true;
  const showLocationOverlay = !position;

  function handleLocationSuccess(pos: Parameters<typeof applyPosition>[0]) {
    accept();
    applyPosition(pos);
  }

  function liveAngle(companionId: string, lat: number, lng: number) {
    if (displayPosition == null) return undefined;
    const item = companions.find((c) => c.id === companionId);
    if (item?.kind !== 'mock') return undefined;
    return bearingDegrees(displayPosition.lat, displayPosition.lng, lat, lng);
  }

  const locationPromptProps = {
    loading: geoLoading,
    loadingMessage: geoLoadingMessage,
    error: geoError,
    onStart: retryFromUserGesture,
    onSuccess: handleLocationSuccess,
    onError: reportError,
  };

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
                userLat={displayPosition?.lat}
                userLng={displayPosition?.lng}
                activeId={activeId}
                onSelect={setActiveId}
              />
              {useRegionFallback && (
                <div className="absolute left-3 right-3 top-3 z-40 rounded-lg bg-background/90 px-3 py-2 text-center shadow-sm backdrop-blur-sm">
                  <p className="text-[11px] text-muted-foreground">
                    위치 없음 · {region.name} 기준 표시
                  </p>
                  {profile?.id && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      위치 허용 시 동행 찾기에 반영됩니다
                    </p>
                  )}
                </div>
              )}
              {!profile?.id && position && (
                <div className="absolute left-3 right-3 top-3 z-40 rounded-lg bg-background/90 px-3 py-1.5 text-center text-[11px] text-amber-700 shadow-sm backdrop-blur-sm">
                  로그인하면 내 위치가 동행 찾기에 반영됩니다
                </div>
              )}
              {profile?.id && position && locationSaveError && (
                <div className="absolute bottom-3 left-3 right-3 z-40 rounded-lg bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive shadow-sm backdrop-blur-sm">
                  {locationSaveError}
                </div>
              )}
              {showLocationOverlay && <LocationAllowPrompt {...locationPromptProps} />}
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
            {useRegionFallback && (
              <p className="mb-3 text-center text-xs text-muted-foreground">
                위치 없음 · {region.name} 기준 표시
              </p>
            )}
            {showLocationOverlay && (
              <div className="mb-3">
                <LocationAllowPrompt {...locationPromptProps} compact />
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
    </main>
  );
}
