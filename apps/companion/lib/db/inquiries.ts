import { createInquiry, type InquiryRecord } from '@/lib/airtable/inquiries';

export type { InquiryRecord };

export async function saveInquiry(
  inquiry: Omit<InquiryRecord, 'id' | 'created_at'>,
): Promise<InquiryRecord> {
  return createInquiry(inquiry);
}
