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

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function getPermissionDeniedHelp(): string {
  if (isIosDevice()) {
    return [
      '① Safari 주소창 왼쪽 「aA」→ 「웹사이트 설정」→ 「위치」→ 「허용」',
      '② 설정 → Safari → 위치 → 「묻기」 또는 「허용」',
      '③ 한 번 「허용 안 함」을 눌렀다면: 설정 → Safari → 고급 → 웹사이트 데이터 → 이 사이트 삭제 후 다시 시도',
      '설정 변경 후 이 페이지로 돌아오면 자동으로 다시 시도합니다.',
    ].join(' ');
  }

  return '브라우저에서 위치 접근이 차단되었습니다. 주소창 자물쇠 → 위치 → 허용으로 변경해 주세요.';
}

export function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return getPermissionDeniedHelp();
    case err.POSITION_UNAVAILABLE:
      return '현재 위치를 가져올 수 없습니다. GPS 또는 Wi-Fi를 확인해 주세요.';
    case err.TIMEOUT:
      return '위치 조회 시간이 초과되었습니다. 다시 시도해 주세요.';
    default:
      return err.message || '위치 조회에 실패했습니다.';
  }
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

/** 클릭 직후 호출 — iOS는 고정밀 실패 시 일반 GPS로 재시도 */
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

  const highAccuracy: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 20_000,
  };

  const lowAccuracy: PositionOptions = {
    enableHighAccuracy: false,
    maximumAge: 0,
    timeout: 25_000,
  };

  tryGetCurrentPosition(
    highAccuracy,
    onSuccess,
    (err) => {
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        tryGetCurrentPosition(
          lowAccuracy,
          onSuccess,
          (retryErr) => onError(geolocationErrorMessage(retryErr)),
        );
        return;
      }
      onError(geolocationErrorMessage(err));
    },
  );
}

export function refreshGeolocation(
  onSuccess: (position: GeoPosition) => void,
  onError?: (message: string) => void,
): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;

  tryGetCurrentPosition(
    REFRESH_OPTIONS,
    onSuccess,
    (err) => {
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        tryGetCurrentPosition(
          { enableHighAccuracy: false, maximumAge: 10_000, timeout: 20_000 },
          onSuccess,
          (retryErr) => onError?.(geolocationErrorMessage(retryErr)),
        );
        return;
      }
      onError?.(geolocationErrorMessage(err));
    },
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
