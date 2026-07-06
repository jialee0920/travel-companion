import { DEFAULT_REGION_CODE } from '@/lib/regions';
import type { GroupBuyStatus, RegionProduct } from '@/lib/regions/types';
import { createRecord, escapeAirtableFormula, listRecords, updateRecord } from './client';
import { requireAirtableConfig } from './config';
import {
  MUKHO_PRODUCT_SEEDS,
  type AirtableProductFields,
  mukhoSeedToAirtableFields,
} from './product-seeds';

function mapProduct(record: { id: string; fields: AirtableProductFields }): RegionProduct {
  return {
    id: record.fields['Product ID'],
    region: record.fields.Region,
    name: record.fields.Name,
    description: record.fields.Description,
    imageUrl: record.fields['Image URL'] ?? '/product-pt.png',
    sellerName: record.fields['Seller Name'],
    category: record.fields.Category,
    ticketLabel: record.fields['Ticket Label'],
    regularPrice: record.fields['Regular Price'],
    discountRate: record.fields['Discount Rate'],
    targetCount: record.fields['Target Count'],
    currentCount: record.fields['Current Count'],
    groupBuyStatus: record.fields['Group Buy Status'],
  };
}

export async function findProductRecordByProductId(
  productId: string,
): Promise<{ id: string; product: RegionProduct } | null> {
  const config = requireAirtableConfig();
  const formula = `{Product ID}="${escapeAirtableFormula(productId)}"`;
  const records = await listRecords<AirtableProductFields>(config.productsTable, {
    filterByFormula: formula,
    maxRecords: 1,
  });

  if (records.length === 0) return null;
  return { id: records[0].id, product: mapProduct(records[0]) };
}

export async function listProducts(region = DEFAULT_REGION_CODE): Promise<RegionProduct[]> {
  const config = requireAirtableConfig();
  const formula = `{Region}="${escapeAirtableFormula(region)}"`;
  const records = await listRecords<AirtableProductFields>(config.productsTable, {
    filterByFormula: formula,
  });

  return records.map(mapProduct);
}

export async function getProductById(
  productId: string,
  _region = DEFAULT_REGION_CODE,
): Promise<RegionProduct | null> {
  const found = await findProductRecordByProductId(productId);
  return found?.product ?? null;
}

export async function seedProductsIfEmpty(region = DEFAULT_REGION_CODE): Promise<number> {
  const existing = await listProducts(region);
  if (existing.length > 0) return 0;

  const config = requireAirtableConfig();
  let created = 0;

  for (const seed of MUKHO_PRODUCT_SEEDS) {
    const fields = mukhoSeedToAirtableFields(seed);
    await createRecord<AirtableProductFields>(config.productsTable, fields);
    created += 1;
  }

  return created;
}

export async function incrementProductCount(productId: string): Promise<void> {
  const found = await findProductRecordByProductId(productId);
  if (!found) return;

  const nextCount = found.product.currentCount + 1;
  const status: GroupBuyStatus =
    nextCount >= found.product.targetCount ? 'success' : found.product.groupBuyStatus;

  const config = requireAirtableConfig();
  await updateRecord<AirtableProductFields>(config.productsTable, found.id, {
    'Current Count': nextCount,
    'Group Buy Status': status,
  });
}
