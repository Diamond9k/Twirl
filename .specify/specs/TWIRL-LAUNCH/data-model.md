# Data Model — Twirl

**Supabase project:** qlulzatkhgblorbjndsz  
**Last verified:** 2026-05-11  

---

## Table: profiles

Extends Supabase `auth.users`. Created on signup.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | = `auth.users.id` |
| `full_name` | text | |
| `school` | text | "University of Arkansas" for all MVP users |
| `sorority` | text | nullable |
| `rating` | numeric | nullable, 1–5 |
| `stripe_account_id` | varchar | **ADD THIS** — Stripe Express account ID for payouts |
| `created_at` | timestamptz | |

**Migration needed:** `ALTER TABLE profiles ADD COLUMN stripe_account_id varchar;`

---

## Table: items

Items listed by lenders.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_id` | uuid (FK → profiles) | |
| `title` | text | |
| `description` | text | nullable |
| `price_per_day` | numeric | |
| `deposit` | numeric | defaults 0 |
| `size` | text | XS/S/M/L/XL |
| `occasion` | text | from OCCASIONS constant |
| `category` | text | from CATEGORIES constant |
| `images` | text[] | Supabase Storage URLs |
| `available` | boolean | default true |
| `created_at` | timestamptz | |

---

## Table: conversations

One conversation per (renter, lender, item) tuple. Created when renter submits a request.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user1_id` | uuid (FK → profiles) | renter |
| `user2_id` | uuid (FK → profiles) | lender |
| `item_id` | uuid (FK → items) | |
| `last_message` | text | nullable |
| `last_message_at` | timestamptz | nullable |
| `unread_user1` | int | **unread count for user1 (renter)** |
| `unread_user2` | int | **unread count for user2 (lender)** |

**Bug:** `messages.tsx` queries `unread_count` — this column does NOT exist. Query must use `unread_user1, unread_user2` and compute which applies to the current user client-side.

---

## Table: messages

Individual chat messages.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `conversation_id` | uuid (FK → conversations) | |
| `sender_id` | uuid (FK → profiles) | |
| `text` | text | |
| `created_at` | timestamptz | default now() |

**Realtime:** Enable replication on this table in Supabase dashboard for live subscriptions.

---

## Table: rentals

Tracks each rental booking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `item_id` | uuid (FK → items) | |
| `renter_id` | uuid (FK → profiles) | |
| `owner_id` | uuid (FK → profiles) | |
| `conversation_id` | uuid (FK → conversations) | nullable |
| `start_date` | date | |
| `end_date` | date | |
| `total_price` | numeric | rental + fee + deposit |
| `status` | text | pending → paid → active → completed |
| `contract_agreed` | boolean | |
| `stripe_payment_intent_id` | varchar | nullable |
| `stripe_deposit_intent_id` | varchar | nullable |
| `created_at` | timestamptz | |

---

## Table: rental_contracts

Audit log of contract agreements.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `rental_id` | uuid (FK → rentals) | |
| `renter_id` | uuid (FK → profiles) | |
| `owner_id` | uuid (FK → profiles) | |
| `agreed_at` | timestamptz | |
| `deposit_intent_id` | varchar | nullable |
| `terms_version` | text | "1.0" for MVP |

---

## Table: reviews

Not yet wired to UI. Schema exists.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `rental_id` | uuid (FK → rentals) | |
| `reviewer_id` | uuid (FK → profiles) | |
| `reviewee_id` | uuid (FK → profiles) | |
| `rating` | int | 1–5 |
| `body` | text | nullable |
| `created_at` | timestamptz | |

---

## Table: saved_items

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → profiles) | |
| `item_id` | uuid (FK → items) | |
| `created_at` | timestamptz | |

---

## Table: reports / blocked_users

Exist in schema. No UI for MVP. No changes needed.

---

## RLS Policies (required for all tables)

- `messages`: users can only SELECT/INSERT messages in conversations where they are `user1_id` or `user2_id`
- `conversations`: users can only SELECT conversations where they are `user1_id` or `user2_id`
- `rentals`: renter and owner can SELECT their own rentals; only renter can INSERT; only edge functions can UPDATE status
- `items`: anyone can SELECT `available = true`; only owner can INSERT/UPDATE/DELETE

---

## Required Migrations

```sql
-- Add Stripe Connect account ID to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id varchar;

-- Add payment intent IDs to rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS stripe_payment_intent_id varchar;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS stripe_deposit_intent_id varchar;

-- Ensure messages has realtime enabled (do in Supabase dashboard under Database > Replication)
```

---

## Supabase Storage Buckets

| Bucket | Access | Used by |
|---|---|---|
| `item-images` | public | `items.images[]` |
| `profile-photos` | public | future use — not MVP |
