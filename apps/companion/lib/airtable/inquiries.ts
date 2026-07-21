import { createRecordNoTypecast } from './client';
import { requireAirtableConfig } from './config';

export type AirtableInquiryFields = {
  Name?: string;
  Phone?: string;
  Message?: string;
  Region?: string;
};

export type InquiryRecord = {
  id: string;
  name: string;
  phone: string;
  message: string;
  region: string;
  created_at: string;
};

function mapInquiry(record: {
  id: string;
  createdTime?: string;
  fields: AirtableInquiryFields;
}): InquiryRecord {
  return {
    id: record.id,
    name: record.fields.Name?.trim() || '',
    phone: record.fields.Phone?.trim() || '',
    message: record.fields.Message?.trim() || '',
    region: record.fields.Region?.trim() || '',
    created_at: record.createdTime ?? new Date().toISOString(),
  };
}

export async function createInquiry(input: {
  name: string;
  phone: string;
  message: string;
  region: string;
}): Promise<InquiryRecord> {
  const config = requireAirtableConfig();
  const created = await createRecordNoTypecast<AirtableInquiryFields>(
    config.inquiriesTable,
    {
      Name: input.name.trim(),
      Phone: input.phone.trim(),
      Message: input.message.trim(),
      Region: input.region,
    },
  );
  return mapInquiry(created);
}
