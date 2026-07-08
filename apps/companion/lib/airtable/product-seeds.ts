import type { GroupBuyStatus, RegionProduct } from '@/lib/regions/types';
import { DEFAULT_REGION_CODE } from '@/lib/regions';
import { PRODUCT_PLACEHOLDER_IMAGE } from '@/lib/products/format';

export type AirtableProductFields = {
  'Product ID': string;
  Region: string;
  Name: string;
  Description: string;
  'Image URL'?: string;
  'Seller Name': string;
  Category: string;
  'Ticket Label': string;
  'Regular Price': number;
  'Discounted Price': number;
  'Discount Rate': number;
  'Target Count': number;
  'Current Count': number;
  'Group Buy Status': GroupBuyStatus;
};

export const MUKHO_PRODUCT_SEEDS: Omit<RegionProduct, 'region'>[] = [
  {
    id: 'a47bc3f0-cbe8-4664-86f8-cc88c81f3804',
    name: '묵호항 싱싱 회센터 세트',
    description: '당일 입항 대구·광어 회 2~3인분 + 해물탕. 묵호항에서 바로 픽업.',
    imageUrl: PRODUCT_PLACEHOLDER_IMAGE,
    sellerName: '묵호수산',
    category: 'food',
    ticketLabel: '2~3인분',
    regularPrice: 96000,
    discountedPrice: 57600,
    discountRate: 40,
    targetCount: 4,
    currentCount: 1,
    groupBuyStatus: 'open',
  },
  {
    id: 'ca84cb14-564e-445b-98b4-b439db7f6a55',
    name: '논골담길·묵호등대 가이드 투어',
    description: '현지 가이드와 함께하는 3시간 도보 투어. 논골담길 + 묵호등대 코스.',
    imageUrl: PRODUCT_PLACEHOLDER_IMAGE,
    sellerName: '묵호로컬',
    category: 'tour',
    ticketLabel: '1인',
    regularPrice: 52000,
    discountedPrice: 33800,
    discountRate: 35,
    targetCount: 6,
    currentCount: 3,
    groupBuyStatus: 'open',
  },
  {
    id: '703c8a96-2322-4cf6-bd5d-c7846f7b2f7a',
    name: '동해 특산품 선물세트',
    description: '오징어채·멸치젓·망고빙수 재료 등 묵호·동해 특산품 모음. 택배 발송.',
    imageUrl: PRODUCT_PLACEHOLDER_IMAGE,
    sellerName: '동해장터',
    category: 'gift',
    ticketLabel: '1세트',
    regularPrice: 48000,
    discountedPrice: 24000,
    discountRate: 50,
    targetCount: 5,
    currentCount: 5,
    groupBuyStatus: 'success',
  },
];

export function regionProductToAirtableFields(
  product: RegionProduct,
): AirtableProductFields {
  return {
    'Product ID': product.id,
    Region: product.region,
    Name: product.name,
    Description: product.description,
    'Image URL': product.imageUrl,
    'Seller Name': product.sellerName,
    Category: product.category,
    'Ticket Label': product.ticketLabel,
    'Regular Price': product.regularPrice,
    'Discounted Price': product.discountedPrice,
    'Discount Rate': product.discountRate,
    'Target Count': product.targetCount,
    'Current Count': product.currentCount,
    'Group Buy Status': product.groupBuyStatus,
  };
}

export function mukhoSeedToAirtableFields(
  product: Omit<RegionProduct, 'region'>,
): AirtableProductFields {
  return regionProductToAirtableFields({ ...product, region: DEFAULT_REGION_CODE });
}
