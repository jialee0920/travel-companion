'use client';

import { useEffect, useRef } from 'react';
import type { GeoPosition } from '@/hooks/useGeolocation';

export function useLocationReporter(
  position: GeoPosition | null,
  enabled: boolean,
  onReported?: () => void,
) {
  const lastSent = useRef<string | null>(null);
  const onReportedRef = useRef(onReported);
  onReportedRef.current = onReported;

  useEffect(() => {
    if (!enabled || !position) return;

    const key = `${position.lat.toFixed(5)},${position.lng.toFixed(5)}`;
    if (lastSent.current === key) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch('/api/profile/location', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: position.lat, lng: position.lng }),
        });

        if (cancelled) return;

        if (res.ok) {
          lastSent.current = key;
          onReportedRef.current?.();
        } else {
          lastSent.current = null;
        }
      } catch {
        if (!cancelled) lastSent.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, position]);
}
