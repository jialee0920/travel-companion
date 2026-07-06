'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  geolocationErrorMessage,
  queryGeolocationPermission,
  requestBrowserGeolocation,
  type GeoPosition,
  type GeolocationPermissionState,
} from '@/lib/geo/browser-geolocation';

export type { GeoPosition };

export function useGeolocation(enabled: boolean, intervalMs = 90_000) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<GeolocationPermissionState>('unknown');
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  const requestNow = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const message = '이 브라우저에서는 위치 서비스를 사용할 수 없습니다.';
      setError(message);
      setNeedsUserGesture(true);
      throw new Error(message);
    }

    setLoading(true);
    try {
      const next = await requestBrowserGeolocation();
      setPosition(next);
      setError(null);
      setPermission('granted');
      setNeedsUserGesture(false);
      return next;
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError(geolocationErrorMessage(err));
        if (err.code === err.PERMISSION_DENIED) setPermission('denied');
        setNeedsUserGesture(true);
      } else if (err instanceof Error) {
        setError(err.message);
        setNeedsUserGesture(true);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let intervalId: number | undefined;
    let cancelled = false;

    void queryGeolocationPermission().then((state) => {
      if (cancelled) return;
      setPermission(state);

      if (state === 'granted') {
        void requestNow();
        intervalId = window.setInterval(() => {
          void requestNow();
        }, intervalMs);
        return;
      }

      setNeedsUserGesture(true);
      if (state === 'denied') {
        setError(
          '브라우저에서 위치 접근이 차단되었습니다. 주소창 자물쇠 → 위치 → 허용으로 변경해 주세요.',
        );
      }
    });

    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs, requestNow]);

  return { position, error, loading, permission, needsUserGesture, requestNow };
}
