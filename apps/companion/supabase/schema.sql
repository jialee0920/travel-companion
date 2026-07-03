-- 묵호 동행 서비스 — Supabase 스키마
-- Dashboard > SQL Editor에서 실행 후, Database > Replication에서 chat_messages Realtime 활성화

create extension if not exists "pgcrypto";

-- ─── 사용자 프로필 ───
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text not null,
  region text not null default 'mukho',
  avatar_url text,
  companion_seed_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_profiles_phone_region
  on profiles (phone, region)
  where companion_seed_id is null;

-- ─── 공동구매 상품 ───
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  name text not null,
  description text not null,
  image_url text,
  seller_name text not null,
  category text not null,
  ticket_label text,
  regular_price integer not null,
  discount_rate numeric(3,2) not null default 0,
  target_count integer not null,
  current_count integer not null default 0,
  group_buy_status text not null default 'open'
    check (group_buy_status in ('open', 'success', 'closed')),
  created_at timestamptz not null default now()
);

-- ─── 주문 / 공동구매 참여 ───
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  profile_id uuid references profiles(id),
  product_id uuid references products(id),
  product_name text not null,
  participant_name text not null,
  participant_phone text not null,
  region text not null,
  amount integer not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed')),
  imp_uid text,
  merchant_uid text unique,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  product_id uuid references products(id),
  display_name text not null,
  order_code text not null,
  created_at timestamptz not null default now()
);

-- ─── 1:1 채팅 ───
create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'mukho',
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists chat_room_members (
  room_id uuid not null references chat_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (room_id, profile_id)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_room on chat_messages(room_id, created_at);
create index if not exists idx_orders_profile on orders(profile_id);
create index if not exists idx_orders_phone on orders(participant_phone);
create index if not exists idx_participants_profile on participants(profile_id);

-- ─── Realtime (chat_messages) ───
alter table chat_messages replica identity full;

-- MVP: anon 키 Realtime·CRUD 허용 (추후 Auth+RLS로 교체)
alter table profiles enable row level security;
alter table chat_rooms enable row level security;
alter table chat_room_members enable row level security;
alter table chat_messages enable row level security;
alter table orders enable row level security;

create policy "profiles_all" on profiles for all using (true) with check (true);
create policy "chat_rooms_all" on chat_rooms for all using (true) with check (true);
create policy "chat_room_members_all" on chat_room_members for all using (true) with check (true);
create policy "chat_messages_all" on chat_messages for all using (true) with check (true);
create policy "orders_all" on orders for all using (true) with check (true);

-- Realtime publication (이미 추가됐으면 무시)
do $$
begin
  alter publication supabase_realtime add table chat_messages;
exception
  when duplicate_object then null;
end $$;
