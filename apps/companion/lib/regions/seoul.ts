import type { RegionConfig } from './types';

/** 서울 서비스 지역 설정 (콘텐츠는 추후 확장) */
export const seoulRegion: RegionConfig = {
  code: 'seoul',
  name: '서울',
  tagline: '서울에서 함께하는 동행 · 공동구매',
  bannerTitle: '동행 · 함께할 사람을 찾다',
  bannerSubtitle: '내 주변 5km',
  mapCenter: { lat: 37.5665, lng: 126.978 },
  searchRadiusKm: 5,
  spots: [],
  companions: [],
  products: [],
};
