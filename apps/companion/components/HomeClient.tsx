'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, MapPin, Search } from 'lucide-react';
import { getRegion } from '@/lib/regions';
import type { CategoryFilter } from '@/lib/regions/types';
import { buildCompanionList } from '@/lib/companions/build-list';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocationConsent } from '@/hooks/useLocationConsent';
import { useLocationReporter } from '@/hooks/useLocationReporter';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppHeader } from '@/components/AppHeader';
import { CategoryFilter as CategoryFilterBar } from '@/components/CategoryFilter';
import { CompanionCard } from '@/components/CompanionCard';
import { CompanionDetailSheet } from '@/components/CompanionDetailSheet';
import { BottomChrome } from '@/components/BottomChrome';
import { LocationAllowPrompt } from '@/components/LocationAllowPrompt';
import { LocationConsentBanner } from '@/components/LocationConsentBanner';
import { bottomChromePaddingClass } from '@/lib/bottom-chrome';
import { isIosDevice } from '@/lib/geo/browser-geolocation';

const region = getRegion();

type Platform = 'unknown' | 'ios' | 'other';

/** 위치 기반 동행 찾기 화면 (지도는 추후 카카오맵 연동) */
export function HomeClient() {
  const { accept, decline, consented, ready: consentReady } = useLocationConsent();
  const { profile } = useUserProfile();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    setPlatform(isIosDevice() ? 'ios' : 'other');
  }, []);

  const isIos = platform === 'ios';
  // iOS·감지 전에는 geolocation을 켜지 않음 (권한 팝업/실패 루프 방지)
  const locationEnabled = platform === 'other';

  const {
    position,
    error: geoError,
    loading: geoLoading,
    loadingMessage: geoLoadingMessage,
    useRegionFallback,
    applyPosition,
    reportError,
    startLoading,
    retryFromUserGesture,
  } = useGeolocation(locationEnabled);

  const hasLocation = position != null;

  const nearbyEnabled = !!profile?.id && hasLocation;
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
        // 실제 GPS가 있을 때만 거리 계산·반경 필터 적용
        userLat: position?.lat,
        userLng: position?.lng,
        // mock 동행자(지우·도현·하늘 등) 목록 비표시 — 데이터/로직은 유지
        includeMocks: false,
      }),
    [category, position, nearbyUsers],
  );

  const activeCompanion = companions.find((c) => c.id === activeId) ?? null;

  const needsLocation = locationEnabled && !hasLocation && !useRegionFallback;
  const showConsentBanner = consentReady && consented === null && needsLocation;
  const showLocationOverlay = needsLocation && consented !== null;
  const locationFailed =
    locationEnabled && !hasLocation && (useRegionFallback || !!geoError);
  const locationPending =
    locationEnabled && !hasLocation && geoLoading && !locationFailed;
  // iOS(또는 감지 전): 권한 UI 없이 카카오맵 준비중 안내만
  const showMapComingSoon = isIos || platform === 'unknown';

  function handleConsentGranted(pos: Parameters<typeof applyPosition>[0]) {
    accept();
    applyPosition(pos);
  }

  function handleRetryGPS() {
    retryFromUserGesture();
  }

  const locationPromptProps = {
    loading: geoLoading,
    loadingMessage: geoLoadingMessage,
    error: geoError,
    onStart: startLoading,
    onSuccess: handleConsentGranted,
    onError: reportError,
  };

  return (
    <main
      className={`relative mx-auto min-h-[100dvh] max-w-md bg-background ${bottomChromePaddingClass()}`}
    >
      <AppHeader
        variant="brand"
        className="px-5 pb-1"
        action={
          <button
            type="button"
            aria-label="알림"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card"
          >
            <Bell className="size-5" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary" />
          </button>
        }
      />

      <div className="px-5 pb-1 pt-3">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
          <Search className="size-4" />
          어떤 동행을 찾고 있나요?
        </div>
      </div>

      <CategoryFilterBar active={category} onChange={setCategory} />

      <section className="relative mx-4 mt-1 overflow-hidden rounded-[1.25rem] border border-border bg-secondary/40">
        {showMapComingSoon ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
            <MapPin className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-muted-foreground">지도 준비중입니다</p>
            <p className="text-xs text-muted-foreground/80">
              곧 카카오맵으로 주변 동행을 볼 수 있어요
            </p>
          </div>
        ) : locationPending ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {geoLoadingMessage || '위치를 확인하는 중…'}
            </p>
            <p className="text-xs text-muted-foreground">잠시만 기다려 주세요</p>
          </div>
        ) : locationFailed || (!hasLocation && !showLocationOverlay) ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
            <MapPin className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-muted-foreground">지도 준비중입니다</p>
            <p className="text-xs leading-relaxed text-muted-foreground/80">
              위치 권한을 허용하면 내 주변 동행을 확인할 수 있어요
            </p>
            <button
              type="button"
              onClick={handleRetryGPS}
              disabled={geoLoading}
              className="mt-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {geoLoading ? '요청 중…' : '위치 다시 요청하기'}
            </button>
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center gap-2 px-6 text-center">
            <MapPin className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-muted-foreground">지도 준비중입니다</p>
            <p className="text-xs text-muted-foreground/80">
              곧 카카오맵으로 주변 동행을 볼 수 있어요
            </p>
          </div>
        )}

        {!profile?.id && hasLocation && (
          <div className="absolute left-3 right-3 top-3 z-10 rounded-lg bg-background/90 px-3 py-1.5 text-center text-micro text-warning shadow-sm backdrop-blur-sm">
            로그인하면 5km 반경 내 주변 동행을 확인할 수 있어요
          </div>
        )}
        {profile?.id && hasLocation && locationSaveError && (
          <div className="absolute bottom-3 left-3 right-3 z-10 rounded-lg bg-destructive-muted px-3 py-2 text-center text-micro text-destructive shadow-sm backdrop-blur-sm">
            {locationSaveError}
          </div>
        )}
        {showLocationOverlay && (
          <div className="absolute inset-0 z-10 flex items-center bg-background/90 p-3 backdrop-blur-[2px]">
            <LocationAllowPrompt {...locationPromptProps} compact />
          </div>
        )}
      </section>

      <section className="mt-4">
        <div className="flex items-center justify-between px-5 pb-2">
          <p className="text-sm font-semibold">
            {hasLocation ? `내 주변 동행 ${companions.length}명` : `동행 ${companions.length}명`}
          </p>
          <span className="text-xs text-muted-foreground">
            {hasLocation ? '가까운 순' : '지역 기준'}
          </span>
        </div>
        <div className="flex flex-col gap-3 px-4">
          {companions.length === 0 ? (
            <p className="rounded-[1.25rem] border border-border bg-card py-10 text-center text-sm text-muted-foreground">
              {hasLocation
                ? '주변에 표시할 동행이 없습니다.'
                : isIos
                  ? '표시할 동행이 없습니다.'
                  : '표시할 동행이 없습니다. 위치를 허용하면 주변 동행을 볼 수 있어요.'}
            </p>
          ) : (
            companions.map((c) => (
              <CompanionCard
                key={c.id}
                companion={c}
                active={c.id === activeId}
                showDistance={hasLocation}
                onClick={() => setActiveId(c.id)}
              />
            ))
          )}
        </div>
      </section>

      <BottomChrome active="map" />

      {showConsentBanner && (
        <LocationConsentBanner onGranted={handleConsentGranted} onDecline={decline} />
      )}

      <CompanionDetailSheet
        companion={activeCompanion}
        onClose={() => setActiveId(null)}
        showDistance={hasLocation}
      />
    </main>
  );
}
