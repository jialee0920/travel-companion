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

  useEffect(() => {
    if (!active || !position) return;

    const id = window.setInterval(() => {
      refreshGeolocation(applyPosition);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, position, intervalMs, applyPosition]);

  return { position, error, loading, applyPosition, reportError, startLoading };
}
