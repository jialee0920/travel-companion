import { DEFAULT_REGION_CODE } from '@/lib/regions';
import { isRegionFilterEnabled } from '@/lib/region-filter';
import type { GroupBuyStatus, ProductActionType, RegionProduct } from '@/lib/regions/types';
import { createRecord, escapeAirtableFormula, listRecords, updateRecord } from './client';
import { requireAirtableConfig } from './config';
import {
  resolveProductImageUrl,
} from '@/lib/products/format';
import {
  MUKHO_PRODUCT_SEEDS,
  type AirtableProductFields,
  mukhoSeedToAirtableFields,
} from './product-seeds';
import { parseProductCategory } from '@/lib/regions/product-categories';

function parseActionType(value: unknown): ProductActionType {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return 'payment';
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (
    normalized === 'kakao_channel' ||
    normalized.includes('kakao')
  ) {
    return 'kakao_channel';
  }
  if (normalized === 'reservation' || normalized === 'pre_reservation') {
    return 'reservation';
  }
  return 'payment';
}

function parseGroupBuyStatus(value: unknown): GroupBuyStatus {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return 'open';
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'preparing' ||
    normalized === 'success' ||
    normalized === 'closed' ||
    normalized === 'open'
  ) {
    return normalized;
  }
  return 'open';
}

function parseExternalLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function mapProduct(record: { id: string; fields: AirtableProductFields }): RegionProduct {
  const fields = record.fields;
  return {
    id: fields['Product ID'],
    region: fields.Region,
    name: fields.Name ?? '',
    description: fields.Description ?? '',
    imageUrl: resolveProductImageUrl(fields['Image URL']),
    sellerName: fields['Seller Name'] ?? '',
    category: parseProductCategory(fields.Category) ?? '',
    ticketLabel: fields['Ticket Label']?.trim() ?? '',
    regularPrice: Number(fields['Regular Price'] ?? 0),
    discountedPrice: Number(fields['Discounted Price'] ?? 0),
    discountRate: Number(fields['Discount Rate'] ?? 0),
    targetCount: Number(fields['Target Count'] ?? 0),
    currentCount: Number(fields['Current Count'] ?? 0),
    groupBuyStatus: parseGroupBuyStatus(fields['Group Buy Status']),
    actionType: parseActionType(fields['Action Type']),
    externalLink: parseExternalLink(fields['External Link']),
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

async function fetchAllProducts(): Promise<RegionProduct[]> {
  const config = requireAirtableConfig();
  // view 지정 + sort 없음 → 해당 view의 드래그 행 순서 유지
  const records = await listRecords<AirtableProductFields>(config.productsTable, {
    view: config.productsView,
  });
  return records.map(mapProduct);
}

/** Airtable Products 전체 (Region 필터 없음) — 공동구매 탭 등 */
export async function listAllProducts(): Promise<RegionProduct[]> {
  return fetchAllProducts();
}

export async function listProducts(region = DEFAULT_REGION_CODE): Promise<RegionProduct[]> {
  const products = await fetchAllProducts();

  if (!isRegionFilterEnabled()) return products;
  return products.filter((product) => product.region === region);
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

export async function decrementProductCount(productId: string): Promise<void> {
  const found = await findProductRecordByProductId(productId);
  if (!found) return;

  const nextCount = Math.max(0, found.product.currentCount - 1);
  const status: GroupBuyStatus =
    found.product.groupBuyStatus === 'success' &&
    (found.product.targetCount <= 0 || nextCount < found.product.targetCount)
      ? 'open'
      : found.product.groupBuyStatus;

  const config = requireAirtableConfig();
  await updateRecord<AirtableProductFields>(config.productsTable, found.id, {
    'Current Count': nextCount,
    'Group Buy Status': status,
  });
}
