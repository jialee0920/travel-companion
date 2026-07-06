export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

const OPTIONS: PositionOptions = {
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

export function requestBrowserGeolocation(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(err),
      OPTIONS,
    );
  });
}

export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state as GeolocationPermissionState;
  } catch {
    return 'unknown';
  }
}
