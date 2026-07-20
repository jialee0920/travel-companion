const EARTH_RADIUS_KM = 6371;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Haversine 거리 (km) */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 출발점에서 방위각·거리만큼 이동한 좌표 */
export function destinationKm(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const brng = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lon1 = toRad(lng);
  const angDist = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angDist) + Math.cos(lat1) * Math.sin(angDist) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(lat1),
      Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lng: toDeg(lon2) };
}

/** 북쪽 기준 방위각 (0~360°) — 지도 핀 각도 표시용 */
export function bearingDegrees(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const dLng = toRad(toLng - fromLng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 위·경도 → 지도 핀 위치 (퍼센트, 0~100) */
export function latLngToMapPercent(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): { top: number; left: number } {
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos(toRad(centerLat));
  const dxKm = (lng - centerLng) * kmPerDegLng;
  const dyKm = (lat - centerLat) * kmPerDegLat;
  const left = 50 + (dxKm / radiusKm) * 35;
  const top = 44 - (dyKm / radiusKm) * 35;
  return {
    top: Math.max(8, Math.min(92, top)),
    left: Math.max(8, Math.min(92, left)),
  };
}

export function formatDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)}m`;
  return `${km.toFixed(1)}km`;
}

export function formatPrice(won: number): string {
  return new Intl.NumberFormat('ko-KR').format(won);
}

export function discountedPrice(regularPrice: number, discountRate: number): number {
  const rate = discountRate > 1 ? discountRate / 100 : discountRate;
  return Math.round(regularPrice * (1 - rate));
}

/** 1인 청구: Airtable Discounted Price ÷ 목표 물량 */
export function perPersonCharge(discountedPrice: number, targetCount: number): number {
  if (targetCount <= 0) return 0;
  return Math.round(discountedPrice / targetCount);
}

export function temperatureLabel(temp: number): { color: string; label: string } {
  if (temp >= 65) return { color: 'var(--success)', label: '따뜻해요' };
  if (temp >= 50) return { color: 'var(--primary)', label: '좋아요' };
  if (temp >= 40) return { color: 'var(--warning)', label: '보통이에요' };
  return { color: 'var(--muted-foreground)', label: '차가워요' };
}

export function generateOrderCode(): string {
  return `GB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
