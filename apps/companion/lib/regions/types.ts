import type { ProductActionType } from '@/lib/products/action-type';

export type CompanionCategory = 'meal' | 'exercise' | 'travel';

export type RegionSpot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type RegionCompanion = {
  id: string;
  name: string;
  age: number;
  category: CompanionCategory;
  avatar: string;
  temperature: number;
  distanceKm: number;
  area: string;
  headline: string;
  bio: string;
  tags: string[];
  lat: number;
  lng: number;
  matches: number;
  responseRate: number;
};

export type GroupBuyStatus = 'open' | 'success' | 'closed' | 'preparing';

export type { ProductActionType } from '@/lib/products/action-type';

export type RegionProduct = {
  id: string;
  region: string;
  name: string;
  description: string;
  imageUrl: string;
  /** 세로로 긴 상세 이미지 URL들 (순서대로). 없으면 빈 배열 */
  detailImageUrls: string[];
  sellerName: string;
  category: string;
  ticketLabel: string;
  regularPrice: number;
  discountedPrice: number;
  discountRate: number;
  targetCount: number;
  currentCount: number;
  groupBuyStatus: GroupBuyStatus;
  actionType: ProductActionType;
  externalLink: string | null;
};

export type RegionConfig = {
  code: string;
  name: string;
  tagline: string;
  bannerTitle: string;
  bannerSubtitle: string;
  mapCenter: { lat: number; lng: number };
  searchRadiusKm: number;
  spots: RegionSpot[];
  companions: RegionCompanion[];
  products: RegionProduct[];
};

export type CategoryFilter = CompanionCategory | 'all';

export const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'meal', label: '식사' },
  { id: 'exercise', label: '운동' },
  { id: 'travel', label: '여행' },
];

export const CATEGORY_LABELS: Record<CompanionCategory, string> = {
  meal: '식사',
  exercise: '운동',
  travel: '여행',
};
