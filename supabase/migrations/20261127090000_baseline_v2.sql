-- 彦根くらしアプリ v2 の土台（2026-11-27 作り直し）
-- 旧DB（kawntunevmabyxqmhqnv）は失われたため、旧SQLは supabase/legacy_migrations に退避。
-- 方針:
--   * public の全テーブルで RLS を有効化
--   * ポイント・権限・ボーナス記録などは利用者が直接書き換えられない（列単位で UPDATE を許可）
--   * ポイント付与やスタンプ押印は、後でサーバー側の関数で行う

-- ========== 共通 ==========
create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========== profiles（会員情報） ==========
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  username text,
  avatar_url text,
  birthday date,
  gender text check (gender in ('男性', '女性', 'その他', '回答しない')),
  age_range text,
  prefecture text,
  city text,
  interests text[] not null default '{}',
  user_type text,
  is_student boolean not null default false,
  university_name text,
  faculty text,
  grade text,
  -- ここから下は利用者が直接変更できない
  points integer not null default 0 check (points >= 0),
  role text not null default 'user' check (role in ('user', 'shop', 'admin')),
  referral_code text unique,
  referred_by uuid references public.profiles (id) on delete set null,
  last_login_bonus_at timestamptz,
  consecutive_login_days integer not null default 0,
  last_birthday_bonus_year integer,
  is_profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

create policy "自分のプロフィールを見られる"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "自分のプロフィールを更新できる"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 列単位の権限: 利用者が変えてよい項目だけ UPDATE を許可
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name, username, avatar_url, gender, age_range, prefecture, city,
  interests, user_type, is_student, university_name, faculty, grade
) on public.profiles to authenticated;
-- 生年月日は一度だけ登録できる（変更不可）ルールのため、後で専用関数で扱う

-- 新規登録時にプロフィールを自動作成（auth.users のトリガーは definer が必要なので private に置く）
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, referral_code)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    upper(substr(md5(gen_random_uuid()::text), 1, 8))
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ========== point_history（ポイント履歴） ==========
create table public.point_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('earn', 'use', 'referral', 'bonus', 'transfer')),
  description text not null,
  created_at timestamptz not null default now()
);

create index point_history_user_created_idx
  on public.point_history (user_id, created_at desc);

alter table public.point_history enable row level security;

create policy "自分のポイント履歴を見られる"
  on public.point_history for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.point_history from anon, authenticated;
grant select on public.point_history to authenticated;

-- ========== shops（店舗） ==========
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  description text,
  category_main text,
  category_sub text,
  meal_type text,
  area text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  opening_hours jsonb,
  price_range text,
  image_url text,
  gallery_urls text[] not null default '{}',
  place_id text,
  status text not null default 'open' check (status in ('open', 'temporarily_closed', 'closed')),
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shops_owner_idx on public.shops (owner_id);
create index shops_category_main_idx on public.shops (category_main);

create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function private.set_updated_at();

alter table public.shops enable row level security;

create policy "誰でも店舗を見られる"
  on public.shops for select
  to anon, authenticated
  using (true);

create policy "店主は自分の店舗を更新できる"
  on public.shops for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on public.shops from anon, authenticated;
grant select on public.shops to anon, authenticated;
grant update (
  name, description, category_main, category_sub, meal_type, area, address,
  latitude, longitude, phone, opening_hours, price_range, image_url,
  gallery_urls, status
) on public.shops to authenticated;
-- 店舗の追加は当面ダッシュボード（管理者）から行う

-- ========== stamp_cards（店舗ごとのスタンプカード設定） ==========
create table public.stamp_cards (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  target_count integer not null default 10 check (target_count > 0),
  reward_description text,
  expiry_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stamp_cards_set_updated_at
  before update on public.stamp_cards
  for each row execute function private.set_updated_at();

alter table public.stamp_cards enable row level security;

create policy "誰でもスタンプカード設定を見られる"
  on public.stamp_cards for select
  to anon, authenticated
  using (true);

create policy "店主は自分の店のスタンプカードを作れる"
  on public.stamp_cards for insert
  to authenticated
  with check (
    exists (
      select 1 from public.shops s
      where s.id = shop_id and s.owner_id = (select auth.uid())
    )
  );

create policy "店主は自分の店のスタンプカードを更新できる"
  on public.stamp_cards for update
  to authenticated
  using (
    exists (
      select 1 from public.shops s
      where s.id = shop_id and s.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.shops s
      where s.id = shop_id and s.owner_id = (select auth.uid())
    )
  );

revoke all on public.stamp_cards from anon, authenticated;
grant select on public.stamp_cards to anon, authenticated;
grant insert (shop_id, target_count, reward_description, expiry_days) on public.stamp_cards to authenticated;
grant update (target_count, reward_description, expiry_days) on public.stamp_cards to authenticated;

-- ========== user_stamps（利用者のスタンプ進捗） ==========
create table public.user_stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  shop_id uuid not null references public.stamp_cards (shop_id) on delete cascade,
  current_count integer not null default 0 check (current_count >= 0),
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, shop_id)
);

create index user_stamps_shop_idx on public.user_stamps (shop_id);

create trigger user_stamps_set_updated_at
  before update on public.user_stamps
  for each row execute function private.set_updated_at();

alter table public.user_stamps enable row level security;

create policy "自分のスタンプ進捗を見られる"
  on public.user_stamps for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 押印（追加・加算）は不正防止のため、後でサーバー側の関数で行う
revoke all on public.user_stamps from anon, authenticated;
grant select on public.user_stamps to authenticated;

-- ========== stamp_logs（押印の記録） ==========
create table public.stamp_logs (
  id uuid primary key default gen_random_uuid(),
  user_stamp_id uuid not null references public.user_stamps (id) on delete cascade,
  stamped_at timestamptz not null default now(),
  location_lat double precision,
  location_lng double precision
);

create index stamp_logs_user_stamp_idx on public.stamp_logs (user_stamp_id);

alter table public.stamp_logs enable row level security;

create policy "自分の押印記録を見られる"
  on public.stamp_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.user_stamps us
      where us.id = user_stamp_id and us.user_id = (select auth.uid())
    )
  );

revoke all on public.stamp_logs from anon, authenticated;
grant select on public.stamp_logs to authenticated;

-- 紹介者からの逆引き用
create index profiles_referred_by_idx on public.profiles (referred_by);
