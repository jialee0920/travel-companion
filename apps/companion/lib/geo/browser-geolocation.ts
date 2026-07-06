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
      return '위치 접근이 거부되었습니다. 브라우저 설정 → 사이트 설정에서 위치를 허용해 주세요.';
    case err.TIMEOUT:
      return 'GPS 신호 수신 중입니다. 잠시 후 다시 시도해 주세요.';
    case err.POSITION_UNAVAILABLE:
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

// iOS GPS first-fix can take 30-60s. Use generous timeouts so we don't give up prematurely.
function getUserGestureOptions(): [PositionOptions, PositionOptions] {
  const lowAccuracy: PositionOptions = {
    enableHighAccuracy: false,
    maximumAge: 0,
    timeout: 40_000, // 40s — iOS network-based location (fast but less accurate)
  };

  const highAccuracy: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 55_000, // 55s — GPS hardware fix
  };

  // iOS: try low (network) first for a quick win, then high (GPS) as fallback
  // Desktop/Android: try high first, low as fallback
  return isIosDevice() ? [lowAccuracy, highAccuracy] : [highAccuracy, lowAccuracy];
}

/**
 * watchPosition until first fix, then stop.
 * Returns a cancel function. On iOS, GPS hardware continues searching even after
 * getCurrentPosition times out — watchPosition captures the delayed fix.
 */
function watchPositionUntilFix(
  onSuccess: (pos: GeoPosition) => void,
  onGiveUp: () => void,
  maxMs = 90_000,
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onGiveUp();
    return () => {};
  }

  let watchId: number | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  function cleanup() {
    if (done) return;
    done = true;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  // No timeout on watchPosition itself — the outer timer manages the deadline.
  // Errors from watchPosition (e.g. transient UNAVAILABLE) are silently ignored.
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      cleanup();
      onSuccess(toGeoPosition(pos));
    },
    () => {
      // Transient errors during watch are normal; ignore until maxMs.
    },
    { enableHighAccuracy: true, maximumAge: 0 },
  );

  timerId = setTimeout(() => {
    cleanup();
    onGiveUp();
  }, maxMs);

  return cleanup;
}

/**
 * 클릭 직후 호출 — iOS는 저정밀 우선, 실패 시 watchPosition(90s)으로 패치.
 * Returns a cancel function — call it on unmount or when superseded by a new request.
 */
export function requestGeolocationFromUserGesture(
  onSuccess: (position: GeoPosition) => void,
  onError: (message: string) => void,
  onWatchStart?: (message: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (!window.isSecureContext) {
    onError('HTTPS 연결이 필요합니다.');
    return () => {};
  }

  if (!navigator.geolocation) {
    onError('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.');
    return () => {};
  }

  const [primary, fallbackOptions] = getUserGestureOptions();
  let watchCancel: (() => void) | null = null;

  function cancel() {
    watchCancel?.();
    watchCancel = null;
  }

  function finalError(err: GeolocationPositionError) {
    void resolveGeolocationErrorMessage(err).then(onError);
  }

  function handlePrimaryError(err: GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) {
      finalError(err);
      return;
    }

    if (isIosDevice()) {
      // GPS hardware is still searching. Switch to watchPosition so we capture
      // the fix whenever it arrives rather than immediately giving up.
      onWatchStart?.('GPS 신호를 잡고 있어요…');
      watchCancel = watchPositionUntilFix(
        onSuccess,
        () => {
          // 90s watch expired with no fix. One final attempt with cached/low-accuracy.
          tryGetCurrentPosition(
            { enableHighAccuracy: false, maximumAge: 30_000, timeout: 20_000 },
            onSuccess,
            finalError,
          );
        },
        90_000,
      );
    } else {
      // Non-iOS: standard two-step fallback
      tryGetCurrentPosition(fallbackOptions, onSuccess, finalError);
    }
  }

  tryGetCurrentPosition(primary, onSuccess, handlePrimaryError);

  return cancel;
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

  tryGetCurrentPosition(primary, onSuccess, (err) => {
    if (err.code === err.PERMISSION_DENIED) {
      void resolveGeolocationErrorMessage(err).then((message) => onError?.(message));
      return;
    }
    tryGetCurrentPosition(fallback, onSuccess, (fallbackErr) => {
      void resolveGeolocationErrorMessage(fallbackErr).then((message) => onError?.(message));
    });
  });
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
