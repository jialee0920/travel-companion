-- 묵호 동행 서비스 — 공동구매·결제 테이블 (확장 가능 구조)

create extension if not exists "pgcrypto";

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
  group_buy_status text not null default 'open' check (group_buy_status in ('open', 'success', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  product_id uuid not null references products(id),
  product_name text not null,
  participant_name text not null,
  participant_phone text not null,
  region text not null,
  amount integer not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  imp_uid text,
  merchant_uid text unique,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  display_name text not null,
  order_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_product on orders(product_id);
create index if not exists idx_participants_product on participants(product_id);
create index if not exists idx_products_region on products(region);
