export type AirtableConfig = {
  token: string;
  baseId: string;
  usersTable: string;
  otpTable: string;
  productsTable: string;
  productsView: string;
  ordersTable: string;
  participantsTable: string;
  chatRoomsTable: string;
  chatRoomMembersTable: string;
  chatMessagesTable: string;
};

export function getAirtableConfig(): AirtableConfig | null {
  const token = cleanEnv(process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN);
  const baseId = cleanEnv(process.env.AIRTABLE_BASE_ID);
  if (!token || !baseId) return null;

  return {
    token,
    baseId,
    usersTable: cleanEnv(process.env.AIRTABLE_USERS_TABLE) || 'Users',
    otpTable: cleanEnv(process.env.AIRTABLE_OTP_CODES_TABLE) || 'OTP_Codes',
    productsTable: cleanEnv(process.env.AIRTABLE_PRODUCTS_TABLE) || 'Products',
    productsView: cleanEnv(process.env.AIRTABLE_PRODUCTS_VIEW) || 'Grid view',
    ordersTable: cleanEnv(process.env.AIRTABLE_ORDERS_TABLE) || 'Orders',
    participantsTable: cleanEnv(process.env.AIRTABLE_PARTICIPANTS_TABLE) || 'Participants',
    chatRoomsTable: cleanEnv(process.env.AIRTABLE_CHAT_ROOMS_TABLE) || 'Chat_Rooms',
    chatRoomMembersTable:
      cleanEnv(process.env.AIRTABLE_CHAT_ROOM_MEMBERS_TABLE) || 'Chat_Room_Members',
    chatMessagesTable: cleanEnv(process.env.AIRTABLE_CHAT_MESSAGES_TABLE) || 'Chat_Messages',
  };
}

function cleanEnv(value: string | undefined): string {
  return value?.trim().replace(/^['"]|['"]$/g, '') ?? '';
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
