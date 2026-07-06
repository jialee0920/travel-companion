export type AirtableConfig = {
  token: string;
  baseId: string;
  usersTable: string;
  otpTable: string;
};

export function getAirtableConfig(): AirtableConfig | null {
  const token = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  if (!token || !baseId) return null;

  return {
    token,
    baseId,
    usersTable: process.env.AIRTABLE_USERS_TABLE?.trim() || 'Users',
    otpTable: process.env.AIRTABLE_OTP_CODES_TABLE?.trim() || 'OTP_Codes',
  };
}

export function requireAirtableConfig(): AirtableConfig {
  const config = getAirtableConfig();
  if (!config) {
    throw new Error(
      'Airtable가 설정되지 않았습니다. AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID를 설정하세요.',
    );
  }
  return config;
}

export function escapeAirtableFormula(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
