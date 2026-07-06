'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeoPosition } from '@/hooks/useGeolocation';

const RETRY_MS = 30_000;

export function useLocationReporter(
  position: GeoPosition | null,
  enabled: boolean,
  onReported?: () => void,
) {
  const lastSent = useRef<string | null>(null);
  const onReportedRef = useRef(onReported);
  onReportedRef.current = onReported;
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !position) {
      setSaveError(null);
      return;
    }

    let cancelled = false;

    const send = async () => {
      const key = `${position.lat.toFixed(5)},${position.lng.toFixed(5)}`;
      if (lastSent.current === key) return;

      try {
        const res = await fetch('/api/profile/location', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: position.lat, lng: position.lng }),
        });

        if (cancelled) return;

        if (res.ok) {
          lastSent.current = key;
          setSaveError(null);
          setSavedAt(new Date().toISOString());
          onReportedRef.current?.();
          return;
        }

        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        lastSent.current = null;
        setSaveError(body?.error ?? `위치 저장 실패 (${res.status})`);
      } catch {
        if (!cancelled) {
          lastSent.current = null;
          setSaveError('위치 저장 요청에 실패했습니다.');
        }
      }
    };

    void send();
    const id = window.setInterval(() => {
      void send();
    }, RETRY_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, position?.lat, position?.lng]);

  return { saveError, savedAt };
}
