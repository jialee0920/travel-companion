import { getAirtableConfig } from '@/lib/airtable/config';
import {
  getProductById as getAirtableProductById,
  listProducts as listAirtableProducts,
  seedProductsIfEmpty,
} from '@/lib/airtable/products';
import { DEFAULT_REGION_CODE, getRegion } from '@/lib/regions';
import type { RegionProduct } from '@/lib/regions/types';

export async function listProducts(region = DEFAULT_REGION_CODE): Promise<RegionProduct[]> {
  if (getAirtableConfig()) {
    await seedProductsIfEmpty(region);
    return listAirtableProducts(region);
  }
  return getRegion(region).products;
}

export async function getProductById(
  productId: string,
  region = DEFAULT_REGION_CODE,
): Promise<RegionProduct | null> {
  if (getAirtableConfig()) {
    await seedProductsIfEmpty(region);
    const product = await getAirtableProductById(productId, region);
    if (product) return product;
  }
  return getRegion(region).products.find((p) => p.id === productId) ?? null;
}

export { seedProductsIfEmpty } from '@/lib/airtable/products';
