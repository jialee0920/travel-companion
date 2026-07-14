/** Kakao Maps JS SDK 로더 (브라우저 전용) */

const SCRIPT_ID = 'kakao-maps-sdk';

declare global {
  interface Window {
    kakao?: KakaoMapsNamespace;
  }
}

export type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

export type KakaoMap = {
  setCenter: (latlng: KakaoLatLng) => void;
  panTo: (latlng: KakaoLatLng) => void;
  setLevel: (level: number, options?: { animate?: boolean }) => void;
  getLevel: () => number;
  relayout: () => void;
  addControl: (control: unknown, position: unknown) => void;
};

export type KakaoCustomOverlay = {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (latlng: KakaoLatLng) => void;
  setZIndex: (zIndex: number) => void;
};

export type KakaoMapsNamespace = {
  maps: {
    load: (callback: () => void) => void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Map: new (
      container: HTMLElement,
      options: { center: KakaoLatLng; level: number },
    ) => KakaoMap;
    CustomOverlay: new (options: {
      map?: KakaoMap | null;
      position: KakaoLatLng;
      content: HTMLElement | string;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
    }) => KakaoCustomOverlay;
    ZoomControl: new () => unknown;
    ControlPosition: { TOPRIGHT: unknown; RIGHT: unknown; BOTTOMRIGHT: unknown };
    event: {
      addListener: (target: unknown, type: string, handler: (...args: unknown[]) => void) => void;
    };
  };
};

function getAppKey(): string | null {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim();
  return key || null;
}

export function isKakaoMapKeyConfigured(): boolean {
  return !!getAppKey();
}

let loadPromise: Promise<KakaoMapsNamespace> | null = null;

/** SDK 스크립트 1회 로드 후 kakao.maps 사용 가능 */
export function loadKakaoMaps(): Promise<KakaoMapsNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Kakao Maps는 브라우저에서만 로드할 수 있습니다.'));
  }

  const appKey = getAppKey();
  if (!appKey) {
    return Promise.reject(
      new Error('NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.'),
    );
  }

  if (window.kakao?.maps?.LatLng) {
    return Promise.resolve(window.kakao);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      const kakao = window.kakao;
      if (!kakao?.maps?.load) {
        reject(new Error('카카오맵 SDK를 초기화하지 못했습니다.'));
        return;
      }
      kakao.maps.load(() => {
        if (!window.kakao?.maps?.LatLng) {
          reject(new Error('카카오맵 SDK 로드에 실패했습니다.'));
          return;
        }
        resolve(window.kakao);
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps) {
        finish();
      } else {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('카카오맵 스크립트 로드 실패')),
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = finish;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('카카오맵 스크립트 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
