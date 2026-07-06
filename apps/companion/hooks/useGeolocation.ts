'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  queryGeolocationPermission,
  refreshGeolocation,
  watchGeolocationPermission,
  type GeoPosition,
  type GeolocationPermissionState,
} from '@/lib/geo/browser-geolocation';

export type { GeoPosition };

const AUTO_RETRY_MESSAGE = '위치 확인 중…';
const PERMISSION_POLL_MS = 2_000;
const FALLBACK_AFTER_FAILURES = 2;

export function useGeolocation(active: boolean, intervalMs = 90_000) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [useRegionFallback, setUseRegionFallback] = useState(false);
  const loadingRef = useRef(false);
  const failureCountRef = useRef(0);

  const applyPosition = useCallback((next: GeoPosition) => {
    setPosition(next);
    setError(null);
    setLoading(false);
    setLoadingMessage(null);
    setUseRegionFallback(false);
    loadingRef.current = false;
    failureCountRef.current = 0;
  }, []);

  const reportError = useCallback((message: string) => {
    failureCountRef.current += 1;
    setError(message);
    setLoading(false);
    setLoadingMessage(null);
    loadingRef.current = false;

    if (failureCountRef.current >= FALLBACK_AFTER_FAILURES) {
      setUseRegionFallback(true);
    }
  }, []);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
    setLoadingMessage(null);
    loadingRef.current = true;
  }, []);

  const retryWithFeedback = useCallback(
    (options?: { auto?: boolean; force?: boolean }) => {
      if (!active || position) return;
      if (loadingRef.current && !options?.force) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);
      setLoadingMessage(options?.auto ? AUTO_RETRY_MESSAGE : null);

      refreshGeolocation(
        (next) => applyPosition(next),
        (message) => reportError(message),
      );
    },
    [active, position, applyPosition, reportError],
  );

  const retrySilent = useCallback(() => {
    retryWithFeedback({ auto: true, force: true });
  }, [retryWithFeedback]);

  useEffect(() => {
    if (!active || !position) return;

    const id = window.setInterval(() => {
      refreshGeolocation(applyPosition);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, position, intervalMs, applyPosition]);

  // 설정 앱·Safari에서 돌아온 뒤 자동 재시도
  useEffect(() => {
    if (!active || position) return;

    function retryOnReturn() {
      retryWithFeedback({ auto: true, force: true });
    }

    function onVisible() {
      if (document.visibilityState === 'visible') {
        retryOnReturn();
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', retryOnReturn);
    window.addEventListener('focus', retryOnReturn);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', retryOnReturn);
      window.removeEventListener('focus', retryOnReturn);
    };
  }, [active, position, retryWithFeedback]);

  // Permissions API change — per-site 허용 시 즉시 재시도
  useEffect(() => {
    if (!active || position) return;

    return watchGeolocationPermission((state: GeolocationPermissionState) => {
      if (state === 'granted') {
        retryWithFeedback({ auto: true, force: true });
      }
    });
  }, [active, position, retryWithFeedback]);

  // 오버레이 표시 중 permission 폴링 (change 이벤트 미지원 환경 대비)
  useEffect(() => {
    if (!active || position) return;

    let lastState: GeolocationPermissionState | null = null;

    const id = window.setInterval(async () => {
      const state = await queryGeolocationPermission();
      if (state === 'granted' && lastState !== 'granted') {
        retryWithFeedback({ auto: true, force: true });
      }
      lastState = state;
    }, PERMISSION_POLL_MS);

    return () => window.clearInterval(id);
  }, [active, position, retryWithFeedback]);

  // permission granted인데 GPS 실패 — 1회 실패 후 지역 기준 폴백
  useEffect(() => {
    if (!active || position || !error || useRegionFallback) return;

    void queryGeolocationPermission().then((state) => {
      if (state === 'granted' && failureCountRef.current >= 1) {
        setUseRegionFallback(true);
      }
    });
  }, [active, position, error, useRegionFallback]);

  return {
    position,
    error,
    loading,
    loadingMessage,
    useRegionFallback,
    applyPosition,
    reportError,
    startLoading,
    retrySilent,
  };
}
