-- Prevent rental parties from forging payment/status transitions from the client.
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

  if auth.uid() = old.owner_id
    and old.status = 'pending'
    and new.status in ('approved', 'cancelled')
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
    and new.deposit_released_at is not distinct from old.deposit_released_at then
    return new;
  end if;

  raise exception 'rental updates are restricted to trusted payment and workflow handlers';
end;
$$;

drop trigger if exists restrict_rental_client_updates on rentals;
create trigger restrict_rental_client_updates
  before update on rentals
  for each row execute function enforce_rental_client_update();

drop policy if exists "Renters create contracts" on rental_contracts;
create policy "Renters create contracts" on rental_contracts
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
