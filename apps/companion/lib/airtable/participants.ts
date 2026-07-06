import { createRecord, escapeAirtableFormula, listRecords } from './client';
import { requireAirtableConfig } from './config';

export type ParticipantRecord = {
  id: string;
  profile_id?: string | null;
  product_id: string;
  display_name: string;
  order_code: string;
  created_at: string;
};

type ParticipantFields = {
  'User ID'?: string;
  'Product ID': string;
  'Display Name': string;
  'Order Code': string;
};

function mapParticipant(record: {
  id: string;
  createdTime?: string;
  fields: ParticipantFields;
}): ParticipantRecord {
  return {
    id: record.id,
    profile_id: record.fields['User ID'] ?? null,
    product_id: record.fields['Product ID'],
    display_name: record.fields['Display Name'],
    order_code: record.fields['Order Code'],
    created_at: record.createdTime ?? new Date().toISOString(),
  };
}

export async function addParticipant(
  participant: Omit<ParticipantRecord, 'id' | 'created_at'>,
): Promise<ParticipantRecord> {
  const config = requireAirtableConfig();
  const created = await createRecord<ParticipantFields>(config.participantsTable, {
    'User ID': participant.profile_id ?? undefined,
    'Product ID': participant.product_id,
    'Display Name': participant.display_name,
    'Order Code': participant.order_code,
  });
  return mapParticipant(created);
}

export async function listParticipants(productId: string): Promise<ParticipantRecord[]> {
  const config = requireAirtableConfig();
  const formula = `{Product ID}="${escapeAirtableFormula(productId)}"`;
  const records = await listRecords<ParticipantFields>(config.participantsTable, {
    filterByFormula: formula,
  });
  return records
    .map(mapParticipant)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
