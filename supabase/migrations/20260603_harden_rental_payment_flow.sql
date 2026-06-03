-- Lock down payment lifecycle mutations so clients cannot forge paid/completed
-- rentals or inflate owner earnings outside the service-role edge functions.

create or replace function public.increment_owner_earnings(p_owner_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'Owner earnings increment must be positive';
  end if;

  update profiles
  set
    total_earnings = total_earnings + p_amount,
    total_rentals  = total_rentals + 1
  where id = p_owner_id;
end;
$$;

revoke all on function public.increment_owner_earnings(uuid, numeric) from public;
revoke all on function public.increment_owner_earnings(uuid, numeric) from anon;
revoke all on function public.increment_owner_earnings(uuid, numeric) from authenticated;
grant execute on function public.increment_owner_earnings(uuid, numeric) to service_role;

create or replace function public.enforce_rental_client_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  current_role text := auth.role();
begin
  if current_role = 'service_role' then
    return new;
  end if;

  if
    new.item_id is distinct from old.item_id or
    new.renter_id is distinct from old.renter_id or
    new.owner_id is distinct from old.owner_id or
    new.conversation_id is distinct from old.conversation_id or
    new.start_date is distinct from old.start_date or
    new.end_date is distinct from old.end_date or
    new.total_price is distinct from old.total_price or
    new.commission_amount is distinct from old.commission_amount or
    new.deposit_amount is distinct from old.deposit_amount or
    new.stripe_payment_intent is distinct from old.stripe_payment_intent or
    new.stripe_deposit_intent is distinct from old.stripe_deposit_intent or
    new.contract_agreed is distinct from old.contract_agreed or
    new.contract_agreed_at is distinct from old.contract_agreed_at or
    new.return_confirmed_at is distinct from old.return_confirmed_at or
    new.deposit_released_at is distinct from old.deposit_released_at
  then
    raise exception 'Rental payment fields are server-managed';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if current_uid = old.owner_id then
    if old.status = 'pending' and new.status in ('approved', 'cancelled') then
      return new;
    end if;

    if old.status = 'paid' and new.status = 'active' then
      return new;
    end if;
  end if;

  if current_uid = old.renter_id and old.status in ('pending', 'approved') and new.status = 'cancelled' then
    return new;
  end if;

  raise exception 'Invalid rental status transition';
end;
$$;

drop trigger if exists enforce_rental_client_transition on public.rentals;
create trigger enforce_rental_client_transition
before update on public.rentals
for each row execute function public.enforce_rental_client_transition();
