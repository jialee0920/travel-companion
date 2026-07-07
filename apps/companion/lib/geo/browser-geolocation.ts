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

export const IOS_LOCATION_DENIED_HELP =
  '위치가 거부되어 있습니다. Safari 주소창 왼쪽 aA → 웹사이트 설정 → 위치 → 허용으로 바꾼 뒤 「위치 허용하기」를 다시 눌러 주세요.';

export const IOS_LOCATION_BLOCKED_HELP =
  '브라우저에서 위치 접근이 차단되었습니다. Safari 설정 → Safari → 위치에서 「물어보기」 또는 「허용」을 선택한 뒤, 이 페이지에서 다시 시도해 주세요.';

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return isIosDevice()
        ? IOS_LOCATION_DENIED_HELP
        : '브라우저에서 위치 접근이 차단되었습니다. 주소창 자물쇠(ⓘ) → 사이트 설정에서 위치를 허용해 주세요.';
    case err.TIMEOUT:
      return 'GPS 신호 수신 중입니다. 잠시 후 다시 시도해 주세요.';
    case err.POSITION_UNAVAILABLE:
    default:
      return GENERIC_ERROR;
  }
}

async function resolveGeolocationErrorMessage(err: GeolocationPositionError): Promise<string> {
  if (err.code === err.PERMISSION_DENIED) {
    return geolocationErrorMessage(err);
  }

  const permission = await queryGeolocationPermission();
  if (permission === 'granted') {
    if (err.code === err.TIMEOUT) {
      return 'GPS 신호 수신 중입니다. 잠시 후 다시 시도해 주세요.';
    }
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
    timeout: 40_000,
  };

  const highAccuracy: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 55_000,
  };

  return isIosDevice() ? [lowAccuracy, highAccuracy] : [highAccuracy, lowAccuracy];
}

/**
 * watchPosition until first fix, then stop.
 * On iOS must be started synchronously inside the user-gesture handler.
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

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      cleanup();
      onSuccess(toGeoPosition(pos));
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        cleanup();
        onGiveUp();
      }
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
 * 클릭 직후 동기 호출 — iOS는 getCurrentPosition + watchPosition을 같은 제스처 턴에서 시작.
 * Returns a cancel function.
 */
export function requestGeolocationFromUserGesture(
  onSuccess: (position: GeoPosition) => void,
  onError: (message: string) => void,
  onWatchStart?: (message: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (!window.isSecureContext) {
    onError('HTTPS 연결에서만 위치를 사용할 수 있습니다.');
    return () => {};
  }

  if (!navigator.geolocation) {
    onError('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.');
    return () => {};
  }

  const envMessage = getLocationEnvironmentMessage();
  if (envMessage) {
    onError(envMessage);
    return () => {};
  }

  const [primary, fallbackOptions] = getUserGestureOptions();
  let watchCancel: (() => void) | null = null;
  let settled = false;

  function cancel() {
    watchCancel?.();
    watchCancel = null;
  }

  function settleSuccess(pos: GeoPosition) {
    if (settled) return;
    settled = true;
    cancel();
    onSuccess(pos);
  }

  function settleError(message: string) {
    if (settled) return;
    settled = true;
    cancel();
    onError(message);
  }

  function handlePrimaryError(err: GeolocationPositionError) {
    if (settled) return;

    if (err.code === err.PERMISSION_DENIED) {
      settleError(isIosDevice() ? IOS_LOCATION_DENIED_HELP : geolocationErrorMessage(err));
      return;
    }

    if (isIosDevice()) {
      // watchPosition already running from the same gesture — wait for fix or outer timeout
      return;
    }

    tryGetCurrentPosition(fallbackOptions, settleSuccess, (fallbackErr) => {
      if (settled) return;
      settled = true;
      cancel();
      void resolveGeolocationErrorMessage(fallbackErr).then(onError);
    });
  }

  // iOS: watchPosition must start in the same user-gesture turn (not in async callback)
  if (isIosDevice()) {
    onWatchStart?.('GPS 신호를 잡고 있어요…');
    watchCancel = watchPositionUntilFix(
      settleSuccess,
      () => {
        if (settled) return;
        settleError(
          'GPS 신호를 받지 못했습니다. Safari에서 위치를 허용한 뒤 「위치 허용하기」를 다시 눌러 주세요.',
        );
      },
      90_000,
    );
  }

  tryGetCurrentPosition(primary, settleSuccess, handlePrimaryError);

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
      onError?.(geolocationErrorMessage(err));
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

  if (isIosDevice() && !/Safari/i.test(ua) && /AppleWebKit/i.test(ua)) {
    return 'iPhone에서는 Safari에서 열어야 위치 권한 팝업이 정상적으로 표시됩니다.';
  }

  return null;
}

export function isIosLocationDeniedMessage(message: string): boolean {
  return (
    message.includes('거부') ||
    message.includes('차단') ||
    message.includes('aA') ||
    message.includes('Safari 설정')
  );
}
