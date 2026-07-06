'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Minus, Navigation, Plus } from 'lucide-react';
import type { CompanionListItem } from '@/lib/companions/types';
import type { RegionSpot } from '@/lib/regions/types';
import { bearingDegrees, latLngToMapPercent, temperatureLabel, toRad } from '@/lib/geo';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

type Props = {
  companions: CompanionListItem[];
  spots: RegionSpot[];
  showSpots?: boolean;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  userLat?: number;
  userLng?: number;
  activeId: string | null;
  onSelect: (id: string) => void;
};

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function CompanionMap({
  companions,
  spots,
  showSpots = true,
  centerLat,
  centerLng,
  radiusKm,
  userLat,
  userLng,
  activeId,
  onSelect,
}: Props) {
  const originLat = userLat ?? centerLat;
  const originLng = userLng ?? centerLng;

  const [zoom, setZoom] = useState(1);
  const [panKm, setPanKm] = useState({ east: 0, north: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; east: number; north: number } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const viewRadiusKm = radiusKm / zoom;
  const kmPerDegLng = 111 * Math.cos(toRad(centerLat));
  const viewCenterLat = centerLat + panKm.north / 111;
  const viewCenterLng = centerLng + panKm.east / kmPerDegLng;

  const resetView = useCallback(() => {
    setZoom(1);
    setPanKm({ east: 0, north: 0 });
  }, []);

  const adjustZoom = useCallback((delta: number) => {
    setZoom((prev) => {
      const next = clampZoom(Number((prev + delta).toFixed(1)));
      if (next <= 1) setPanKm({ east: 0, north: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    resetView();
  }, [centerLat, centerLng, resetView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      adjustZoom(e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [adjustZoom]);

  function onPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    if (e.pointerType === 'touch') return;
    dragRef.current = { x: e.clientX, y: e.clientY, east: panKm.east, north: panKm.north };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;

    const dxPx = e.clientX - drag.x;
    const dyPx = e.clientY - drag.y;
    const pxPerKm = rect.width / (viewRadiusKm * 2);
    setPanKm({
      east: drag.east - dxPx / pxPerKm,
      north: drag.north + dyPx / pxPerKm,
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { distance, zoom };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / pinchRef.current.distance;
    const next = clampZoom(Number((pinchRef.current.zoom * ratio).toFixed(1)));
    setZoom(next);
    if (next <= 1) setPanKm({ east: 0, north: 0 });
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  function posFor(lat: number, lng: number) {
    return latLngToMapPercent(lat, lng, viewCenterLat, viewCenterLng, viewRadiusKm);
  }

  const userPos = userLat != null && userLng != null ? posFor(userLat, userLng) : { top: 44, left: 50 };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Image
        src="/map-bg.png"
        alt="내 주변 지도"
        fill
        priority
        className="object-cover"
        sizes="430px"
        draggable={false}
      />
      <div className="absolute inset-0 bg-background/10" />

      {showSpots &&
        spots.map((spot) => {
          const pos = posFor(spot.lat, spot.lng);
          return (
            <span
              key={spot.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              {spot.name}
            </span>
          );
        })}

      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${userPos.top}%`, left: `${userPos.left}%` }}
      >
        <span className="absolute inset-0 -m-4 animate-ping rounded-full bg-primary/30" />
        <span className="relative flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary shadow-lg">
          <Navigation className="size-2.5 fill-primary-foreground text-primary-foreground" />
        </span>
      </div>

      {companions.map((c) => {
        const pos = posFor(c.lat, c.lng);
        const active = c.id === activeId;

        if (c.kind === 'real') {
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              aria-label={`${c.name}${c.activityActive ? ', 지금 활동 중' : ''}`}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-full transition-transform duration-200 hover:scale-105',
                active ? 'z-20 scale-110' : 'z-10',
              )}
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <span
                className={cn(
                  'relative flex size-8 items-center justify-center rounded-full border-2 border-background text-[11px] font-bold shadow-md',
                  c.activityActive ? 'bg-emerald-500 text-white' : 'bg-card text-foreground',
                )}
              >
                {c.name.slice(0, 1)}
                {c.activityActive && (
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-background bg-emerald-400" />
                )}
              </span>
            </button>
          );
        }

        const angle = bearingDegrees(originLat, originLng, c.lat, c.lng);
        const tone = temperatureLabel(c.temperature ?? 0);

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-label={`${c.name}, 방향 ${angle.toFixed(1)}°`}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-full transition-transform duration-200 hover:scale-105',
              active ? 'z-20 scale-110' : 'z-10',
            )}
            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
          >
            <span
              className="block rounded-full border-2 border-background px-2 py-1 text-[10px] font-bold shadow-md"
              style={{ backgroundColor: tone.color, color: 'white' }}
            >
              {angle.toFixed(1)}°
            </span>
          </button>
        );
      })}

      <div className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-md backdrop-blur">
        <button
          type="button"
          aria-label="지도 확대"
          onClick={() => adjustZoom(ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          className="flex size-9 items-center justify-center text-foreground disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
        <div className="border-t border-border px-2 py-1 text-center text-[10px] font-medium text-muted-foreground">
          {zoom.toFixed(1)}x
        </div>
        <button
          type="button"
          aria-label="지도 축소"
          onClick={() => adjustZoom(-ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          className="flex size-9 items-center justify-center text-foreground disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
      </div>

      {zoom > 1 && (
        <button
          type="button"
          onClick={resetView}
          className="absolute bottom-3 right-3 z-30 rounded-lg border border-border bg-card/95 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-md backdrop-blur"
        >
          전체 보기
        </button>
      )}
    </div>
  );
}
