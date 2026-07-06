import { escapeAirtableFormula, requireAirtableConfig, type AirtableConfig } from './config';

type AirtableRecord<T> = {
  id: string;
  createdTime?: string;
  fields: T;
};

type ListResponse<T> = {
  records: AirtableRecord<T>[];
  offset?: string;
};

async function airtableFetch<T>(
  config: AirtableConfig,
  table: string,
  init?: RequestInit & { searchParams?: Record<string, string> },
): Promise<T> {
  const { searchParams, ...rest } = init ?? {};
  const url = new URL(`https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(table)}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Airtable API 오류 (${res.status}) [base=${config.baseId}, table=${table}]: ${body}`,
    );
  }

  return res.json() as Promise<T>;
}

export async function listRecords<T>(
  table: string,
  options?: { filterByFormula?: string; maxRecords?: number; sortField?: string; sortDirection?: 'asc' | 'desc' },
): Promise<AirtableRecord<T>[]> {
  const config = requireAirtableConfig();
  const params: Record<string, string> = {};
  if (options?.filterByFormula) params.filterByFormula = options.filterByFormula;
  if (options?.maxRecords) params.maxRecords = String(options.maxRecords);
  if (options?.sortField) {
    params['sort[0][field]'] = options.sortField;
    params['sort[0][direction]'] = options.sortDirection ?? 'desc';
  }

  const data = await airtableFetch<ListResponse<T>>(config, table, { searchParams: params });
  return data.records ?? [];
}

export async function createRecord<T extends Record<string, unknown>>(
  table: string,
  fields: T,
): Promise<AirtableRecord<T>> {
  const config = requireAirtableConfig();
  const data = await airtableFetch<{ records: AirtableRecord<T>[] }>(config, table, {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields }] }),
  });
  return data.records[0];
}

export async function updateRecord<T extends Record<string, unknown>>(
  table: string,
  id: string,
  fields: Partial<T>,
): Promise<AirtableRecord<T>> {
  const config = requireAirtableConfig();
  const data = await airtableFetch<{ records: AirtableRecord<T>[] }>(config, table, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id, fields }] }),
  });
  return data.records[0];
}

export { escapeAirtableFormula };
