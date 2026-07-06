-- 묵호 동행 서비스 — Supabase 전체 스키마
-- Supabase Dashboard > SQL Editor 에 붙여넣고 Run
-- 이후 Database > Replication 에서 chat_messages Realtime 활성화 확인

create extension if not exists "pgcrypto";

-- ─── 1. 사용자 프로필 (간편 로그인: 이름+연락처) ───
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

-- ─── 2. 공동구매 상품 ───
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

-- ─── 3. 주문 (공동구매 결제) ───
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

-- ─── 4. 공동구매 참여자 (상품별 참여 목록) ───
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  product_id uuid references products(id),
  display_name text not null,
  order_code text not null,
  created_at timestamptz not null default now()
);

-- ─── 5. 1:1 채팅 ───
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

-- ─── 인덱스 ───
create index if not exists idx_chat_messages_room on chat_messages(room_id, created_at);
create index if not exists idx_orders_profile on orders(profile_id);
create index if not exists idx_orders_phone on orders(participant_phone);
create index if not exists idx_participants_profile on participants(profile_id);
create index if not exists idx_participants_product on participants(product_id);

-- ─── Realtime (채팅 실시간 수신) ───
alter table chat_messages replica identity full;

-- ─── RLS (MVP: 전체 허용 — 추후 Auth·정책 강화) ───
alter table profiles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table participants enable row level security;
alter table chat_rooms enable row level security;
alter table chat_room_members enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "profiles_all" on profiles;
drop policy if exists "products_all" on products;
drop policy if exists "orders_all" on orders;
drop policy if exists "participants_all" on participants;
drop policy if exists "chat_rooms_all" on chat_rooms;
drop policy if exists "chat_room_members_all" on chat_room_members;
drop policy if exists "chat_messages_all" on chat_messages;

create policy "profiles_all" on profiles for all using (true) with check (true);
create policy "products_all" on products for all using (true) with check (true);
create policy "orders_all" on orders for all using (true) with check (true);
create policy "participants_all" on participants for all using (true) with check (true);
create policy "chat_rooms_all" on chat_rooms for all using (true) with check (true);
create policy "chat_room_members_all" on chat_room_members for all using (true) with check (true);
create policy "chat_messages_all" on chat_messages for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table chat_messages;
exception
  when duplicate_object then null;
end $$;

-- ─── 묵호 공동구매 시드 (앱 mock ID와 동일) ───
insert into products (
  id, region, name, description, image_url, seller_name, category, ticket_label,
  regular_price, discount_rate, target_count, current_count, group_buy_status
) values
  (
    'a47bc3f0-cbe8-4664-86f8-cc88c81f3804',
    'mukho',
    '묵호항 싱싱 회센터 세트',
    '당일 입항 대구·광어 회 2~3인분 + 해물탕. 묵호항에서 바로 픽업.',
    '/product-pt.png',
    '묵호수산',
    'food',
    '2~3인분',
    96000,
    0.40,
    4,
    1,
    'open'
  ),
  (
    'ca84cb14-564e-445b-98b4-b439db7f6a55',
    'mukho',
    '논골담길·묵호등대 가이드 투어',
    '현지 가이드와 함께하는 3시간 도보 투어. 논골담길 + 묵호등대 코스.',
    '/product-pt.png',
    '묵호로컬',
    'tour',
    '1인',
    52000,
    0.35,
    6,
    3,
    'open'
  ),
  (
    '703c8a96-2322-4cf6-bd5d-c7846f7b2f7a',
    'mukho',
    '동해 특산품 선물세트',
    '오징어채·멸치젓·망고빙수 재료 등 묵호·동해 특산품 모음. 택배 발송.',
    '/product-pt.png',
    '동해장터',
    'gift',
    '1세트',
    48000,
    0.50,
    5,
    5,
    'success'
  )
on conflict (id) do nothing;
