import { destinationKm, haversineDistanceKm } from '@/lib/geo';
import type { RegionCompanion } from '@/lib/regions/types';

const MOCK_BEARINGS = [35, 155, 275];

/**
 * GPS 기준 반경 밖 mock은 내 주변으로 재배치 (묵호 밖에서도 mock+실사용자 테스트 가능).
 * 묵호 안에서는 원래 좌표 유지.
 */
export function prepareMocksForDisplay(
  mocks: RegionCompanion[],
  userLat: number | undefined,
  userLng: number | undefined,
  radiusKm: number,
): RegionCompanion[] {
  if (userLat == null || userLng == null) return mocks;

  return mocks.map((mock, index) => {
    const distance = haversineDistanceKm(userLat, userLng, mock.lat, mock.lng);
    if (distance <= radiusKm) return mock;

    const bearing = MOCK_BEARINGS[index] ?? index * 120;
    const point = destinationKm(userLat, userLng, mock.distanceKm, bearing);
    return {
      ...mock,
      lat: point.lat,
      lng: point.lng,
      area: '내 주변',
    };
  });
}
