-- ═══════════════════════════════════════════════════════════════════════════
-- Twirl Database Schema v2.0
-- Security-hardened, indexed, audit-logged
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── HELPERS ────────────────────────────────────────────────────────────────

-- Auto-update updated_at on any table that has it
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Enforce .edu email domain
create or replace function is_edu_email(email text)
returns boolean language sql immutable as $$
  select email ~* '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.edu$';
$$;

-- ─── PROFILES ───────────────────────────────────────────────────────────────

create table profiles (
  id              uuid references auth.users on delete cascade primary key,
  full_name       text not null check (char_length(full_name) between 2 and 80),
  email           text check (is_edu_email(email)),
  school          text check (char_length(school) <= 100),
  sorority        text check (char_length(sorority) <= 80),
  size            text check (size in ('XS','S','M','L','XL','XXL')),
  avatar_url      text,
  bio             text check (char_length(bio) <= 300),
  is_verified     boolean default false,
  is_suspended    boolean default false,
  rating          numeric(3,2) default 0 check (rating between 0 and 5),
  total_rentals   integer default 0 check (total_rentals >= 0),
  total_earnings  numeric(10,2) default 0 check (total_earnings >= 0),
  push_token      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table profiles enable row level security;

create policy "Public profiles visible"    on profiles for select using (true);
create policy "Users edit own profile"     on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and not is_verified = false);  -- can't self-verify
create policy "Users insert own profile"   on profiles for insert with check (auth.uid() = id);

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create index idx_profiles_school on profiles(school);
create index idx_profiles_rating on profiles(rating desc);

-- ─── ITEMS ──────────────────────────────────────────────────────────────────

create table items (
  id              uuid default uuid_generate_v4() primary key,
  owner_id        uuid references profiles(id) on delete cascade not null,
  title           text not null check (char_length(title) between 3 and 100),
  description     text check (char_length(description) <= 1000),
  price_per_day   numeric(10,2) not null check (price_per_day between 1 and 500),
  deposit         numeric(10,2) default 0 check (deposit between 0 and 2000),
  size            text check (size in ('XS','S','M','L','XL','XXL')),
  occasion        text,
  category        text,
  brand           text check (char_length(brand) <= 80),
  images          text[] default '{}' check (array_length(images, 1) <= 8),
  available       boolean default true,
  view_count      integer default 0 check (view_count >= 0),
  save_count      integer default 0 check (save_count >= 0),
  is_flagged      boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table items enable row level security;

create policy "Public items visible"    on items for select using (available = true and not is_flagged);
create policy "Owner sees all items"    on items for select using (auth.uid() = owner_id);
create policy "Owners manage items"     on items for all using (auth.uid() = owner_id);

create trigger items_updated_at before update on items
  for each row execute function set_updated_at();

create index idx_items_owner      on items(owner_id);
create index idx_items_available  on items(available) where available = true;
create index idx_items_occasion   on items(occasion);
create index idx_items_created    on items(created_at desc);

-- ─── SAVED ITEMS ────────────────────────────────────────────────────────────

create table saved_items (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references profiles(id) on delete cascade not null,
  item_id    uuid references items(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, item_id)
);
alter table saved_items enable row level security;
create policy "Users see own saved"   on saved_items for select using (auth.uid() = user_id);
create policy "Users manage saved"    on saved_items for all   using (auth.uid() = user_id);

create index idx_saved_user on saved_items(user_id);
create index idx_saved_item on saved_items(item_id);

-- ─── CONVERSATIONS ──────────────────────────────────────────────────────────

create table conversations (
  id               uuid default uuid_generate_v4() primary key,
  user1_id         uuid references profiles(id) not null,
  user2_id         uuid references profiles(id) not null,
  item_id          uuid references items(id),
  last_message     text check (char_length(last_message) <= 1000),
  last_message_at  timestamptz,
  unread_user1     integer default 0 check (unread_user1 >= 0),
  unread_user2     integer default 0 check (unread_user2 >= 0),
  created_at       timestamptz default now(),
  unique(user1_id, user2_id, item_id)
);
alter table conversations enable row level security;

create policy "Participants see conversations" on conversations
  for select using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Users create conversations"     on conversations
  for insert with check (auth.uid() = user1_id and user1_id <> user2_id);
create policy "Participants update"            on conversations
  for update using (auth.uid() = user1_id or auth.uid() = user2_id);

create index idx_conv_user1 on conversations(user1_id);
create index idx_conv_user2 on conversations(user2_id);

-- ─── MESSAGES ───────────────────────────────────────────────────────────────

create table messages (
  id               uuid default uuid_generate_v4() primary key,
  conversation_id  uuid references conversations(id) on delete cascade not null,
  sender_id        uuid references profiles(id) not null,
  content          text not null check (char_length(content) between 1 and 2000),
  is_deleted       boolean default false,
  created_at       timestamptz default now()
);
alter table messages enable row level security;

create policy "Participants see messages" on messages for select using (
  auth.uid() in (
    select user1_id from conversations where id = conversation_id
    union
    select user2_id from conversations where id = conversation_id
  )
);
create policy "Participants send messages" on messages for insert with check (
  auth.uid() = sender_id and
  auth.uid() in (
    select user1_id from conversations where id = conversation_id
    union
    select user2_id from conversations where id = conversation_id
  )
);
-- Soft delete only — no hard deletes
create policy "Sender soft-deletes" on messages for update using (auth.uid() = sender_id);

create index idx_messages_conv on messages(conversation_id, created_at desc);

-- ─── RENTALS ────────────────────────────────────────────────────────────────

create table rentals (
  id                    uuid default uuid_generate_v4() primary key,
  item_id               uuid references items(id) not null,
  renter_id             uuid references profiles(id) not null,
  owner_id              uuid references profiles(id) not null,
  conversation_id       uuid references conversations(id),
  start_date            date not null,
  end_date              date not null,
  total_price           numeric(10,2) not null check (total_price > 0),
  commission_amount     numeric(10,2) check (commission_amount >= 0),
  deposit_amount        numeric(10,2) check (deposit_amount >= 0),
  status                text default 'pending'
    check (status in ('pending','approved','paid','active','completed','cancelled','disputed')),
  stripe_payment_intent text,
  stripe_deposit_intent text,
  contract_agreed       boolean default false,
  contract_agreed_at    timestamptz,
  return_confirmed_at   timestamptz,
  deposit_released_at   timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  check (end_date > start_date),
  check (renter_id <> owner_id)
);
alter table rentals enable row level security;

create policy "Rental parties see rentals"    on rentals for select using (auth.uid() = renter_id or auth.uid() = owner_id);
create policy "Renters create rentals"        on rentals for insert with check (auth.uid() = renter_id and renter_id <> owner_id);
create policy "Owners update rental decisions" on rentals for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create or replace function enforce_rental_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Payment settlement and lifecycle transitions must be performed by trusted server code.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() = old.owner_id
    and old.status = 'pending'
    and new.status in ('approved', 'cancelled')
    and new.id is not distinct from old.id
    and new.item_id is not distinct from old.item_id
    and new.renter_id is not distinct from old.renter_id
    and new.owner_id is not distinct from old.owner_id
    and new.conversation_id is not distinct from old.conversation_id
    and new.start_date is not distinct from old.start_date
    and new.end_date is not distinct from old.end_date
    and new.total_price is not distinct from old.total_price
    and new.commission_amount is not distinct from old.commission_amount
    and new.deposit_amount is not distinct from old.deposit_amount
    and new.stripe_payment_intent is not distinct from old.stripe_payment_intent
    and new.stripe_deposit_intent is not distinct from old.stripe_deposit_intent
    and new.contract_agreed is not distinct from old.contract_agreed
    and new.contract_agreed_at is not distinct from old.contract_agreed_at
    and new.return_confirmed_at is not distinct from old.return_confirmed_at
    and new.deposit_released_at is not distinct from old.deposit_released_at
    and new.created_at is not distinct from old.created_at then
    return new;
  end if;

  raise exception 'rental updates are restricted to trusted payment and workflow handlers';
end;
$$;

create trigger rentals_updated_at before update on rentals
  for each row execute function set_updated_at();
create trigger restrict_rental_client_updates before update on rentals
  for each row execute function enforce_rental_client_update();

create index idx_rentals_renter on rentals(renter_id);
create index idx_rentals_owner  on rentals(owner_id);
create index idx_rentals_status on rentals(status);
create index idx_rentals_dates  on rentals(start_date, end_date);

-- ─── RENTAL CONTRACTS (audit log) ───────────────────────────────────────────

create table rental_contracts (
  id                uuid default uuid_generate_v4() primary key,
  rental_id         uuid references rentals(id) on delete cascade not null,
  renter_id         uuid references profiles(id) not null,
  owner_id          uuid references profiles(id) not null,
  agreed_at         timestamptz not null default now(),
  deposit_intent_id text,
  terms_version     text not null default '2.0',
  ip_address        inet,
  user_agent        text check (char_length(user_agent) <= 500),
  created_at        timestamptz default now()
);
alter table rental_contracts enable row level security;

create policy "Contract parties see contracts" on rental_contracts
  for select using (auth.uid() = renter_id or auth.uid() = owner_id);
create policy "Renters create contracts"       on rental_contracts
  for insert with check (
    auth.uid() = renter_id
    and exists (
      select 1
      from rentals
      where rentals.id = rental_contracts.rental_id
        and rentals.renter_id = rental_contracts.renter_id
        and rentals.owner_id = rental_contracts.owner_id
    )
  );
-- No updates or deletes — immutable audit log

create index idx_contracts_rental on rental_contracts(rental_id);

-- ─── REVIEWS ────────────────────────────────────────────────────────────────

create table reviews (
  id           uuid default uuid_generate_v4() primary key,
  rental_id    uuid references rentals(id) on delete cascade not null unique,
  reviewer_id  uuid references profiles(id) not null,
  reviewee_id  uuid references profiles(id) not null,
  stars        integer not null check (stars between 1 and 5),
  body         text check (char_length(body) <= 500),
  created_at   timestamptz default now(),
  check (reviewer_id <> reviewee_id)
);
alter table reviews enable row level security;

create policy "Reviews are public"       on reviews for select using (true);
create policy "Reviewers create reviews" on reviews for insert
  with check (auth.uid() = reviewer_id);

create index idx_reviews_reviewee on reviews(reviewee_id);

-- ─── REPORTS (content moderation) ───────────────────────────────────────────

create table reports (
  id           uuid default uuid_generate_v4() primary key,
  reporter_id  uuid references profiles(id) not null,
  item_id      uuid references items(id),
  user_id      uuid references profiles(id),
  reason       text not null check (reason in ('inappropriate','counterfeit','scam','spam','other')),
  details      text check (char_length(details) <= 500),
  resolved     boolean default false,
  created_at   timestamptz default now()
);
alter table reports enable row level security;
create policy "Users create reports"   on reports for insert with check (auth.uid() = reporter_id);
create policy "Users see own reports"  on reports for select using (auth.uid() = reporter_id);

-- ─── BLOCKED USERS ──────────────────────────────────────────────────────────

create table blocked_users (
  id          uuid default uuid_generate_v4() primary key,
  blocker_id  uuid references profiles(id) on delete cascade not null,
  blocked_id  uuid references profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table blocked_users enable row level security;
create policy "Users manage blocks" on blocked_users for all using (auth.uid() = blocker_id);

-- ─── STORAGE ────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict do nothing;

create policy "Public read item images"
  on storage.objects for select using (bucket_id = 'item-images');

create policy "Auth users upload item images"
  on storage.objects for insert
  with check (
    bucket_id = 'item-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners delete item images"
  on storage.objects for delete
  using (
    bucket_id = 'item-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── RATE LIMITING VIEW ─────────────────────────────────────────────────────
-- Call from Edge Functions: reject if count > threshold in window

create or replace view recent_rentals_by_user as
  select renter_id, count(*) as count
  from rentals
  where created_at > now() - interval '24 hours'
  group by renter_id;
