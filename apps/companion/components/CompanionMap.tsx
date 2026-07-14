'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Navigation, Plus } from 'lucide-react';
import type { CompanionListItem } from '@/lib/companions/types';
import {
  isKakaoMapKeyConfigured,
  loadKakaoMaps,
  type KakaoCustomOverlay,
  type KakaoMap,
  type KakaoMapsNamespace,
} from '@/lib/kakao/maps-loader';
import { cn } from '@/lib/utils';

const DEFAULT_LEVEL = 5;
const MIN_LEVEL = 1;
const MAX_LEVEL = 10;

type Props = {
  companions: CompanionListItem[];
  userLat: number;
  userLng: number;
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

function categoryBorderColor(category: string): string {
  switch (category) {
    case 'meal':
      return '#c47a3a';
    case 'exercise':
      return '#4a7ab5';
    case 'travel':
      return '#3d9a78';
    default:
      return '#e8793a';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createUserMarkerEl(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;';
  wrap.innerHTML = `
    <span style="position:absolute;inset:-10px;border-radius:9999px;background:rgba(59,130,246,0.25);animation:pulse 1.6s ease-out infinite;"></span>
    <span style="position:relative;display:flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:9999px;border:2px solid #fff;background:#2563eb;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 20l8-4 8 4L12 2z" fill="#fff"/>
      </svg>
    </span>
  `;
  return wrap;
}

function createCompanionMarkerEl(
  companion: CompanionListItem,
  active: boolean,
  onSelect: (id: string) => void,
): HTMLElement {
  const border = categoryBorderColor(companion.primaryCategory);
  const size = active ? 44 : 36;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', companion.name);
  btn.style.cssText = [
    'display:block',
    'padding:0',
    'border:0',
    'background:transparent',
    'cursor:pointer',
    'transform:translateY(0)',
  ].join(';');

  const avatar = companion.avatar
    ? `<img src="${escapeHtml(companion.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;display:block;" />`
    : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#1c1410;background:#f4f1ea;">${escapeHtml(companion.name.slice(0, 1))}</span>`;

  btn.innerHTML = `
    <span style="
      display:block;
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      overflow:hidden;
      border:3px solid ${border};
      box-shadow:0 2px 10px rgba(0,0,0,0.22);
      background:#fff;
      ${active ? 'outline:2px solid #fff; outline-offset:1px;' : ''}
    ">${avatar}</span>
  `;

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(companion.id);
  });

  return btn;
}

/** 카카오맵 + 내 위치 / 동행 프로필 핀 */
export function CompanionMap({
  companions,
  userLat,
  userLng,
  activeId,
  onSelect,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const kakaoRef = useRef<KakaoMapsNamespace | null>(null);
  const userOverlayRef = useRef<KakaoCustomOverlay | null>(null);
  const companionOverlaysRef = useRef<Map<string, KakaoCustomOverlay>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToMyLocation = useCallback(() => {
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!map || !kakao) return;
    const center = new kakao.maps.LatLng(userLat, userLng);
    map.panTo(center);
  }, [userLat, userLng]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const next = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, map.getLevel() + delta));
    map.setLevel(next, { animate: true });
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isKakaoMapKeyConfigured()) {
      setError('지도 키가 아직 설정되지 않았어요.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const kakao = await loadKakaoMaps();
        if (cancelled || !containerRef.current) return;

        kakaoRef.current = kakao;
        const center = new kakao.maps.LatLng(userLat, userLng);
        const map = new kakao.maps.Map(containerRef.current, {
          center,
          level: DEFAULT_LEVEL,
        });

        map.addControl(
          new kakao.maps.ZoomControl(),
          kakao.maps.ControlPosition.RIGHT,
        );

        mapRef.current = map;
        setReady(true);
        setError(null);

        // 레이아웃 확정 후 리사이즈
        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(center);
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '지도를 불러오지 못했어요.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      userOverlayRef.current?.setMap(null);
      userOverlayRef.current = null;
      for (const overlay of companionOverlaysRef.current.values()) {
        overlay.setMap(null);
      }
      companionOverlaysRef.current.clear();
      mapRef.current = null;
    };
    // 최초 마운트·키 로드만 — 위치 변경은 아래 effect에서 pan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 내 위치 마커 + 중심 이동
  useEffect(() => {
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!ready || !map || !kakao) return;

    const position = new kakao.maps.LatLng(userLat, userLng);
    map.panTo(position);

    if (!userOverlayRef.current) {
      userOverlayRef.current = new kakao.maps.CustomOverlay({
        map,
        position,
        content: createUserMarkerEl(),
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 5,
      });
    } else {
      userOverlayRef.current.setPosition(position);
      userOverlayRef.current.setMap(map);
    }
  }, [ready, userLat, userLng]);

  // 동행 핀 동기화
  useEffect(() => {
    const map = mapRef.current;
    const kakao = kakaoRef.current;
    if (!ready || !map || !kakao) return;

    const nextIds = new Set(companions.map((c) => c.id));
    for (const [id, overlay] of companionOverlaysRef.current) {
      if (!nextIds.has(id)) {
        overlay.setMap(null);
        companionOverlaysRef.current.delete(id);
      }
    }

    for (const companion of companions) {
      const position = new kakao.maps.LatLng(companion.lat, companion.lng);
      const active = companion.id === activeId;
      const content = createCompanionMarkerEl(companion, active, (id) =>
        onSelectRef.current(id),
      );

      const existing = companionOverlaysRef.current.get(companion.id);
      if (existing) {
        existing.setMap(null);
      }

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: active ? 30 : 10,
      });
      companionOverlaysRef.current.set(companion.id, overlay);
    }
  }, [ready, companions, activeId]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={containerRef} className="absolute inset-0" />

      {!ready && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-secondary/60">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">지도를 불러오는 중…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-secondary/80 px-6 text-center">
          <p className="text-sm font-semibold text-foreground">지도를 표시할 수 없어요</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{error}</p>
        </div>
      )}

      <div className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-md backdrop-blur">
        <button
          type="button"
          aria-label="지도 확대"
          onClick={() => zoomBy(-1)}
          className="flex size-9 items-center justify-center text-foreground"
        >
          <Plus className="size-4" />
        </button>
        <div className="border-y border-border" />
        <button
          type="button"
          aria-label="지도 축소"
          onClick={() => zoomBy(1)}
          className="flex size-9 items-center justify-center text-foreground"
        >
          <Minus className="size-4" />
        </button>
      </div>

      <button
        type="button"
        aria-label="내 위치로 이동"
        onClick={goToMyLocation}
        className="absolute bottom-3 right-3 z-20 flex size-10 items-center justify-center rounded-xl border border-border bg-card/95 text-primary shadow-md backdrop-blur"
      >
        <Navigation className="size-4 fill-primary" />
      </button>
    </div>
  );
}
