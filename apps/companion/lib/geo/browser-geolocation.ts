export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

const USER_GESTURE_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

const REFRESH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 15_000,
};

export function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return '브라우저에서 위치 접근이 차단되었습니다. 주소창 자물쇠 → 위치 → 허용으로 변경해 주세요.';
    case err.POSITION_UNAVAILABLE:
      return '현재 위치를 가져올 수 없습니다. GPS 또는 Wi-Fi를 확인해 주세요.';
    case err.TIMEOUT:
      return '위치 조회 시간이 초과되었습니다. 다시 시도해 주세요.';
    default:
      return err.message || '위치 조회에 실패했습니다.';
  }
}

/** 클릭 직후 호출 — 브라우저 위치 팝업용 (Promise/async 없이 동기 시작) */
export function requestGeolocationFromUserGesture(
  onSuccess: (position: GeoPosition) => void,
  onError: (message: string) => void,
): void {
  if (typeof window === 'undefined') return;

  if (!window.isSecureContext) {
    onError('HTTPS 연결이 필요합니다.');
    return;
  }

  if (!navigator.geolocation) {
    onError('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onSuccess({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    (err) => onError(geolocationErrorMessage(err)),
    USER_GESTURE_OPTIONS,
  );
}

export function refreshGeolocation(
  onSuccess: (position: GeoPosition) => void,
  onError?: (message: string) => void,
): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onSuccess({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    (err) => onError?.(geolocationErrorMessage(err)),
    REFRESH_OPTIONS,
  );
}

export function getLocationEnvironmentMessage(): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.isSecureContext) return 'HTTPS 연결에서만 위치를 사용할 수 있습니다.';
  if (!navigator.geolocation) return '이 브라우저는 위치 서비스를 지원하지 않습니다.';

  const ua = navigator.userAgent;
  if (/KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(ua)) {
    return '카카오톡·인스타 등 앱 내 브라우저에서는 위치 팝업이 뜨지 않을 수 있습니다. Safari 또는 Chrome에서 직접 열어주세요.';
  }

  return null;
}
