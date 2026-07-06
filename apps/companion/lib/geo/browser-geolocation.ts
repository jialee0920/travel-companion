export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

const REFRESH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 15_000,
};

const GENERIC_ERROR = '위치를 가져올 수 없습니다. 다시 시도해 주세요.';

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
    case err.POSITION_UNAVAILABLE:
    case err.TIMEOUT:
    default:
      return GENERIC_ERROR;
  }
}

async function resolveGeolocationErrorMessage(err: GeolocationPositionError): Promise<string> {
  const permission = await queryGeolocationPermission();
  if (permission === 'granted') {
    return GENERIC_ERROR;
  }
  return geolocationErrorMessage(err);
}

function toGeoPosition(pos: GeolocationPosition): GeoPosition {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}

function tryGetCurrentPosition(
  options: PositionOptions,
  onSuccess: (position: GeoPosition) => void,
  onError: (err: GeolocationPositionError) => void,
): void {
  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess(toGeoPosition(pos)),
    onError,
    options,
  );
}

function getUserGestureOptions(): [PositionOptions, PositionOptions] {
  const lowAccuracy: PositionOptions = {
    enableHighAccuracy: false,
    maximumAge: 0,
    timeout: 25_000,
  };

  const highAccuracy: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 20_000,
  };

  return isIosDevice() ? [lowAccuracy, highAccuracy] : [highAccuracy, lowAccuracy];
}

function requestWithFallback(
  primary: PositionOptions,
  fallback: PositionOptions,
  onSuccess: (position: GeoPosition) => void,
  onError: (err: GeolocationPositionError) => void,
): void {
  tryGetCurrentPosition(primary, onSuccess, (err) => {
    if (
      err.code === err.TIMEOUT ||
      err.code === err.POSITION_UNAVAILABLE ||
      err.code === err.PERMISSION_DENIED
    ) {
      tryGetCurrentPosition(fallback, onSuccess, onError);
      return;
    }
    onError(err);
  });
}

/** 클릭 직후 호출 — iOS는 일반 GPS 우선, 실패 시 고정밀 재시도 */
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

  const [primary, fallback] = getUserGestureOptions();

  requestWithFallback(
    primary,
    fallback,
    onSuccess,
    (err) => {
      void resolveGeolocationErrorMessage(err).then(onError);
    },
  );
}

export function refreshGeolocation(
  onSuccess: (position: GeoPosition) => void,
  onError?: (message: string) => void,
): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;

  const lowAccuracy: PositionOptions = {
    enableHighAccuracy: false,
    maximumAge: 10_000,
    timeout: 20_000,
  };

  const [primary, fallback] = isIosDevice()
    ? [lowAccuracy, REFRESH_OPTIONS]
    : [REFRESH_OPTIONS, lowAccuracy];

  requestWithFallback(
    primary,
    fallback,
    onSuccess,
    (err) => {
      void resolveGeolocationErrorMessage(err).then((message) => onError?.(message));
    },
  );
}

export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state as GeolocationPermissionState;
  } catch {
    return 'unknown';
  }
}

/** Permissions API change 이벤트 — iOS Safari 등에서 설정 변경 감지 */
export function watchGeolocationPermission(
  onChange: (state: GeolocationPermissionState) => void,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return () => {};
  }

  let disposed = false;
  let statusRef: PermissionStatus | null = null;
  let handler: (() => void) | null = null;

  navigator.permissions.query({ name: 'geolocation' }).then((status) => {
    if (disposed) return;
    statusRef = status;
    handler = () => onChange(status.state as GeolocationPermissionState);
    status.addEventListener('change', handler);
    onChange(status.state as GeolocationPermissionState);
  });

  return () => {
    disposed = true;
    if (statusRef && handler) {
      statusRef.removeEventListener('change', handler);
    }
  };
}

export function getLocationEnvironmentMessage(): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.isSecureContext) return 'HTTPS 연결에서만 위치를 사용할 수 있습니다.';
  if (!navigator.geolocation) return '이 브라우저는 위치 서비스를 지원하지 않습니다.';

  const ua = navigator.userAgent;
  if (/KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(ua)) {
    return '카카오톡·인스타 등 앱 내 브라우저에서는 위치가 동작하지 않을 수 있습니다. Safari에서 열어주세요.';
  }

  return null;
}
