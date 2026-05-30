-- Stripe Connect account ID used by create-connect-account.
alter table profiles
  add column if not exists stripe_account_id text;
