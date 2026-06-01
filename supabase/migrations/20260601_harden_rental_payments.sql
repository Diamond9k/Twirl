-- Harden rental payment state so clients cannot forge paid/completed rentals.

revoke execute on function public.increment_owner_earnings(uuid, numeric) from public;
revoke execute on function public.increment_owner_earnings(uuid, numeric) from anon;
revoke execute on function public.increment_owner_earnings(uuid, numeric) from authenticated;
grant execute on function public.increment_owner_earnings(uuid, numeric) to service_role;

create or replace function public.enforce_rental_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
  requester_role text := auth.role();
begin
  if requester_role = 'service_role' then
    return new;
  end if;

  if requester is null then
    raise exception 'Unauthorized rental update';
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
    or new.deposit_released_at is distinct from old.deposit_released_at
  then
    raise exception 'Rental financial fields are server-managed';
  end if;

  if new.status is distinct from old.status then
    if requester = old.owner_id then
      if not (
        (old.status = 'pending' and new.status in ('approved', 'cancelled')) or
        (old.status = 'approved' and new.status = 'cancelled') or
        (old.status = 'paid' and new.status = 'active') or
        (old.status = 'active' and new.status = 'disputed')
      ) then
        raise exception 'Invalid owner rental status transition';
      end if;
    elsif requester = old.renter_id then
      if not (
        (old.status in ('pending', 'approved') and new.status = 'cancelled')
      ) then
        raise exception 'Invalid renter rental status transition';
      end if;
    else
      raise exception 'Unauthorized rental update';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_rental_client_update on public.rentals;
create trigger enforce_rental_client_update
  before update on public.rentals
  for each row execute function public.enforce_rental_client_update();
