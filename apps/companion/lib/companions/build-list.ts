import type { AirtableUser } from '@/lib/airtable/users';
import { getActivityStatus } from '@/lib/companions/activity';
import { prepareMocksForDisplay } from '@/lib/companions/mock-placement';
import { interestToCategories, primaryCategory } from '@/lib/companions/category-map';
import type { CompanionListItem } from '@/lib/companions/types';
import { haversineDistanceKm } from '@/lib/geo';
import { nearestSpotName } from '@/lib/geo/nearest-spot';
import type { CategoryFilter, RegionCompanion, RegionSpot } from '@/lib/regions/types';
import { CATEGORY_LABELS } from '@/lib/regions/types';

export type NearbyUserDto = {
  id: string;
  name: string;
  age: number | null;
  bio: string | null;
  interest_categories: string[];
  latitude: number;
  longitude: number;
  location_updated_at: string;
};

function matchesCategory(item: CompanionListItem, filter: CategoryFilter): boolean {
  if (filter === 'all') return true;
  return item.categories.includes(filter);
}

export function mockToListItem(
  c: RegionCompanion,
  userLat?: number,
  userLng?: number,
): CompanionListItem {
  const distanceKm =
    userLat != null && userLng != null
      ? haversineDistanceKm(userLat, userLng, c.lat, c.lng)
      : c.distanceKm;

  return {
    id: c.id,
    kind: 'mock',
    name: c.name,
    age: c.age,
    categories: [c.category],
    primaryCategory: c.category,
    avatar: c.avatar,
    temperature: c.temperature,
    headline: c.headline,
    bio: c.bio,
    tags: c.tags,
    lat: c.lat,
    lng: c.lng,
    area: c.area,
    distanceKm,
    matches: c.matches,
    responseRate: c.responseRate,
    companionSeedId: c.id,
  };
}

export function realUserToListItem(
  user: NearbyUserDto,
  spots: RegionSpot[],
  userLat: number,
  userLng: number,
): CompanionListItem | null {
  const activity = getActivityStatus(user.location_updated_at);
  if (!activity) return null;

  const categories = interestToCategories(user.interest_categories);
  const cat = primaryCategory(categories);
  const bio = user.bio?.trim() || '';
  const headline = bio.length > 40 ? `${bio.slice(0, 40)}…` : bio || `${user.name}님과 동행해요`;

  return {
    id: `real:${user.id}`,
    kind: 'real',
    name: user.name,
    age: user.age,
    categories,
    primaryCategory: cat,
    avatar: null,
    temperature: null,
    headline,
    bio: bio || headline,
    tags: user.interest_categories,
    lat: user.latitude,
    lng: user.longitude,
    area: nearestSpotName(user.latitude, user.longitude, spots),
    distanceKm: haversineDistanceKm(userLat, userLng, user.latitude, user.longitude),
    activityLabel: activity.label,
    activityActive: activity.active,
    peerProfileId: user.id,
  };
}

export function buildCompanionList(options: {
  mocks: RegionCompanion[];
  realUsers: NearbyUserDto[];
  spots: RegionSpot[];
  category: CategoryFilter;
  radiusKm: number;
  userLat?: number;
  userLng?: number;
}): CompanionListItem[] {
  const { mocks, realUsers, spots, category, radiusKm, userLat, userLng } = options;

  const displayMocks = prepareMocksForDisplay(mocks, userLat, userLng, radiusKm);
  const mockItems = displayMocks.map((c) => mockToListItem(c, userLat, userLng));
  const realItems: CompanionListItem[] = [];

  if (userLat != null && userLng != null) {
    for (const user of realUsers) {
      const item = realUserToListItem(user, spots, userLat, userLng);
      if (!item) continue;
      if (item.distanceKm > radiusKm) continue;
      realItems.push(item);
    }
  }

  return [...mockItems, ...realItems]
    .filter((item) => matchesCategory(item, category))
    .filter((item) => {
      if (userLat == null || userLng == null) return item.kind === 'mock';
      return item.distanceKm <= radiusKm;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function categoryLabel(item: CompanionListItem): string {
  return CATEGORY_LABELS[item.primaryCategory];
}
