-- Harden client-visible rental lifecycle transitions and internal earnings RPCs.

alter table profiles
  add column if not exists stripe_account_id text;

drop policy if exists "Renters create rentals" on rentals;
create policy "Renters create rentals" on rentals for insert with check (
  auth.uid() = renter_id
  and renter_id <> owner_id
  and status = 'pending'
  and stripe_payment_intent is null
  and stripe_deposit_intent is null
  and contract_agreed = false
  and contract_agreed_at is null
  and return_confirmed_at is null
  and deposit_released_at is null
);

drop policy if exists "Rental parties update rentals" on rentals;
create policy "Rental parties update rentals" on rentals for update
  using (auth.uid() = renter_id or auth.uid() = owner_id)
  with check (auth.uid() = renter_id or auth.uid() = owner_id);

create or replace function enforce_rental_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if new.item_id is distinct from old.item_id
    or new.renter_id is distinct from old.renter_id
    or new.owner_id is distinct from old.owner_id
    or new.conversation_id is distinct from old.conversation_id
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
    or new.total_price is distinct from old.total_price
    or new.commission_amount is distinct from old.commission_amount
    or new.deposit_amount is distinct from old.deposit_amount
    or new.stripe_payment_intent is distinct from old.stripe_payment_intent
    or new.stripe_deposit_intent is distinct from old.stripe_deposit_intent
    or new.contract_agreed is distinct from old.contract_agreed
    or new.contract_agreed_at is distinct from old.contract_agreed_at
    or new.return_confirmed_at is distinct from old.return_confirmed_at
    or new.deposit_released_at is distinct from old.deposit_released_at then
    raise exception 'Rental fields can only be changed by trusted server code' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if auth.uid() = old.owner_id
      and old.status = 'pending'
      and new.status in ('approved', 'cancelled') then
      return new;
    end if;

    if auth.uid() = old.owner_id
      and old.status = 'paid'
      and new.status = 'active'
      and coalesce(old.contract_agreed, false) = true
      and old.stripe_payment_intent is not null
      and (coalesce(old.deposit_amount, 0) = 0 or old.stripe_deposit_intent is not null) then
      return new;
    end if;

    raise exception 'Invalid rental status transition' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_rental_client_update_trigger on rentals;
create trigger enforce_rental_client_update_trigger
  before update on rentals
  for each row execute function enforce_rental_client_update();

revoke execute on function increment_owner_earnings(uuid, numeric) from public, anon, authenticated;
