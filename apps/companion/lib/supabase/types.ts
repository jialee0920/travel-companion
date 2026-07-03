export type ProfileRow = {
  id: string;
  phone: string;
  name: string;
  region: string;
  avatar_url: string | null;
  companion_seed_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatRoomRow = {
  id: string;
  region: string;
  last_message_at: string | null;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type OrderRow = {
  id: string;
  order_code: string;
  profile_id: string | null;
  product_id: string | null;
  product_name: string;
  participant_name: string;
  participant_phone: string;
  region: string;
  amount: number;
  payment_status: 'pending' | 'paid' | 'failed';
  imp_uid: string | null;
  merchant_uid: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> };
      chat_rooms: { Row: ChatRoomRow; Insert: Partial<ChatRoomRow>; Update: Partial<ChatRoomRow> };
      chat_room_members: {
        Row: { room_id: string; profile_id: string };
        Insert: { room_id: string; profile_id: string };
        Update: Partial<{ room_id: string; profile_id: string }>;
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: Partial<ChatMessageRow>;
        Update: Partial<ChatMessageRow>;
      };
      orders: { Row: OrderRow; Insert: Partial<OrderRow>; Update: Partial<OrderRow> };
      products: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      participants: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
  };
};

export type ChatRoomWithPeer = ChatRoomRow & {
  peer: Pick<ProfileRow, 'id' | 'name' | 'avatar_url' | 'companion_seed_id'>;
  last_message?: string | null;
};
