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

const GENERIC_ERROR = '위치를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.';

/** iOS Safari 사용자 제스처 흐름용 (코드별 고정 문구) */
export const USER_GESTURE_GEO_ERRORS = {
  PERMISSION_DENIED: '설정 앱 → Safari → 위치 → 이 웹사이트 허용으로 변경해주세요',
  POSITION_UNAVAILABLE: '위치를 가져올 수 없습니다. 잠시 후 다시 시도해주세요',
  TIMEOUT: '위치 요청 시간이 초과됐습니다. 다시 시도해주세요',
} as const;

export const IOS_LOCATION_DENIED_HELP = USER_GESTURE_GEO_ERRORS.PERMISSION_DENIED;

export const IOS_LOCATION_BLOCKED_HELP =
  '브라우저에서 위치 접근이 차단되었습니다. Safari 설정 → Safari → 위치에서 「물어보기」 또는 「허용」을 선택한 뒤, 이 페이지에서 다시 시도해 주세요.';

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ 는 MacIntel + 터치로 보고되는 경우가 있음
  if (
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }
  return false;
}

export function userGestureGeolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return USER_GESTURE_GEO_ERRORS.PERMISSION_DENIED;
    case err.POSITION_UNAVAILABLE:
      return USER_GESTURE_GEO_ERRORS.POSITION_UNAVAILABLE;
    case err.TIMEOUT:
      return USER_GESTURE_GEO_ERRORS.TIMEOUT;
    default:
      return USER_GESTURE_GEO_ERRORS.POSITION_UNAVAILABLE;
  }
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

/**
 * 사용자 클릭 핸들러에서 React setState 없이 즉시 getCurrentPosition 호출.
 * iOS Safari는 이 동기 호출이 제스처와 직접 연결되어야 권한 팝업이 뜸.
 */
export function invokeGeolocationOnUserClick(
  onSuccess: (position: GeoPosition) => void,
  onError: (message: string) => void,
): boolean {
  if (typeof window === 'undefined') return false;

  if (!window.isSecureContext) {
    onError('HTTPS 연결에서만 위치를 사용할 수 있습니다.');
    return false;
  }

  if (!navigator.geolocation) {
    onError('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.');
    return false;
  }

  const envMessage = getLocationEnvironmentMessage();
  if (envMessage) {
    onError(envMessage);
    return false;
  }

  const highAccuracy: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 55_000,
  };

  const lowAccuracy: PositionOptions = {
    enableHighAccuracy: false,
    maximumAge: 0,
    timeout: 40_000,
  };

  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess(toGeoPosition(pos)),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        onError(userGestureGeolocationErrorMessage(err));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => onSuccess(toGeoPosition(pos)),
        (fallbackErr) => onError(userGestureGeolocationErrorMessage(fallbackErr)),
        lowAccuracy,
      );
    },
    highAccuracy,
  );
  return true;
}

/**
 * @deprecated invokeGeolocationOnUserClick 사용. 하위 호환 cancel 함수 반환.
 */
export function requestGeolocationFromUserGesture(
  onSuccess: (position: GeoPosition) => void,
  onError: (message: string) => void,
  _onWatchStart?: (message: string) => void,
): () => void {
  invokeGeolocationOnUserClick(onSuccess, onError);
  return () => {};
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
    message.includes('설정 앱') ||
    message.includes('거부') ||
    message.includes('차단') ||
    message.includes('aA') ||
    message.includes('Safari')
  );
}
