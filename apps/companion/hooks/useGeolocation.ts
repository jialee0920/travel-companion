'use client';

import { useCallback, useEffect, useState } from 'react';

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export function useGeolocation(enabled: boolean) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    const id = window.setInterval(refresh, 15000);
    return () => window.clearInterval(id);
  }, [enabled, refresh]);

  return { position, error, loading, refresh };
}
