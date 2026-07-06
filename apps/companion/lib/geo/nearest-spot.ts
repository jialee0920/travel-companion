import type { RegionSpot } from '@/lib/regions/types';
import { haversineDistanceKm } from '@/lib/geo';

const FALLBACK_AREA = '내 주변';
const MAX_SPOT_KM = 1.5;

/** 좌표에서 가장 가까운 region spot 이름 (역지오코딩 대체) */
export function nearestSpotName(lat: number, lng: number, spots: RegionSpot[]): string {
  if (spots.length === 0) return FALLBACK_AREA;

  let best = spots[0];
  let bestKm = haversineDistanceKm(lat, lng, best.lat, best.lng);

  for (const spot of spots.slice(1)) {
    const km = haversineDistanceKm(lat, lng, spot.lat, spot.lng);
    if (km < bestKm) {
      best = spot;
      bestKm = km;
    }
  }

  return bestKm <= MAX_SPOT_KM ? best.name : FALLBACK_AREA;
}
