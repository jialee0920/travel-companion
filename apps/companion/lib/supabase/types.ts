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

export type ChatRoomMemberRow = {
  room_id: string;
  profile_id: string;
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

export type ParticipantRow = {
  id: string;
  profile_id: string | null;
  product_id: string | null;
  display_name: string;
  order_code: string;
  created_at: string;
};

export type ProductRow = {
  id: string;
  region: string;
  name: string;
  description: string;
  image_url: string | null;
  seller_name: string;
  category: string;
  ticket_label: string;
  regular_price: number;
  discount_rate: number;
  target_count: number;
  current_count: number;
  group_buy_status: 'open' | 'success' | 'closed';
  created_at: string;
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<ProfileRow>
      >;
      chat_rooms: TableDef<
        ChatRoomRow,
        {
          region: string;
          id?: string;
          last_message_at?: string | null;
          created_at?: string;
        },
        Partial<ChatRoomRow>
      >;
      chat_room_members: TableDef<ChatRoomMemberRow, ChatRoomMemberRow, Partial<ChatRoomMemberRow>>;
      chat_messages: TableDef<
        ChatMessageRow,
        {
          room_id: string;
          sender_id: string;
          body: string;
          id?: string;
          created_at?: string;
        },
        Partial<ChatMessageRow>
      >;
      orders: TableDef<OrderRow, Omit<OrderRow, 'id' | 'created_at'> & { id?: string; created_at?: string }, Partial<OrderRow>>;
      products: TableDef<
        ProductRow,
        Omit<ProductRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<ProductRow>
      >;
      participants: TableDef<
        ParticipantRow,
        Omit<ParticipantRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<ParticipantRow>
      >;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ChatRoomWithPeer = ChatRoomRow & {
  peer: Pick<ProfileRow, 'id' | 'name' | 'avatar_url' | 'companion_seed_id'>;
  last_message?: string | null;
};
