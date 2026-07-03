const memoryInquiries: {
  id: string;
  name: string;
  phone: string;
  message: string;
  region: string;
  created_at: string;
}[] = [];

export type InquiryRecord = (typeof memoryInquiries)[number];

export async function saveInquiry(
  inquiry: Omit<InquiryRecord, 'id' | 'created_at'>,
): Promise<InquiryRecord> {
  const row: InquiryRecord = {
    ...inquiry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  memoryInquiries.unshift(row);
  return row;
}
