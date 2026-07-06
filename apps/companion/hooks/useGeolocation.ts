'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  refreshGeolocation,
  type GeoPosition,
} from '@/lib/geo/browser-geolocation';

export type { GeoPosition };

export function useGeolocation(active: boolean, intervalMs = 90_000) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const applyPosition = useCallback((next: GeoPosition) => {
    setPosition(next);
    setError(null);
    setLoading(false);
  }, []);

  const reportError = useCallback((message: string) => {
    setError(message);
    setLoading(false);
  }, []);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const retrySilent = useCallback(() => {
    if (!active || position) return;
    setLoading(true);
    refreshGeolocation(
      (next) => applyPosition(next),
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [active, position, applyPosition]);

  useEffect(() => {
    if (!active || !position) return;

    const id = window.setInterval(() => {
      refreshGeolocation(applyPosition);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, position, intervalMs, applyPosition]);

  // 설정 앱에서 돌아온 뒤 자동 재시도 (iOS Safari)
  useEffect(() => {
    if (!active || position) return;

    function onVisible() {
      if (document.visibilityState === 'visible') {
        retrySilent();
      }
    }

    function onPageShow() {
      retrySilent();
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [active, position, retrySilent]);

  return { position, error, loading, applyPosition, reportError, startLoading, retrySilent };
}
