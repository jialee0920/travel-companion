import { haversineDistanceKm } from '@/lib/geo';

/** 지도 핀 배치 기준 — GPS 있으면 내 위치 중심 */
export function getMapViewCenter(
  userLat: number | undefined,
  userLng: number | undefined,
  regionCenter: { lat: number; lng: number },
): { lat: number; lng: number } {
  if (userLat != null && userLng != null) {
    return { lat: userLat, lng: userLng };
  }
  return regionCenter;
}

/** 서비스 지역(묵호) 근처인지 — 랜드마크 라벨 표시 여부 */
export function isNearRegionCenter(
  userLat: number,
  userLng: number,
  regionCenter: { lat: number; lng: number },
  thresholdKm = 10,
): boolean {
  return haversineDistanceKm(userLat, userLng, regionCenter.lat, regionCenter.lng) <= thresholdKm;
}
