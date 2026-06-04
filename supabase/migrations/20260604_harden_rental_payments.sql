-- Harden rental/payment state transitions after introducing Stripe-backed
-- approval, payment confirmation, and return completion flows.

create or replace function transition_rental_status(p_rental_id uuid, p_status text)
returns rentals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rental rentals;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_status = 'approved' then
    update rentals
    set status = 'approved'
    where id = p_rental_id
      and owner_id = v_uid
      and status = 'pending'
    returning * into v_rental;
  elsif p_status = 'cancelled' then
    update rentals
    set status = 'cancelled'
    where id = p_rental_id
      and (owner_id = v_uid or renter_id = v_uid)
      and status in ('pending', 'approved')
    returning * into v_rental;
  elsif p_status = 'active' then
    update rentals
    set status = 'active'
    where id = p_rental_id
      and owner_id = v_uid
      and status = 'paid'
    returning * into v_rental;
  else
    raise exception 'Unsupported rental status transition' using errcode = '22023';
  end if;

  if not found then
    raise exception 'Rental transition not allowed' using errcode = '42501';
  end if;

  return v_rental;
end;
$$;

revoke all on function transition_rental_status(uuid, text) from public, anon;
grant execute on function transition_rental_status(uuid, text) to authenticated;

create or replace function complete_rental_return(p_rental_id uuid, p_owner_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rental record;
  v_owner_earnings numeric;
begin
  update rentals
  set
    status = 'completed',
    return_confirmed_at = now(),
    deposit_released_at = now()
  where id = p_rental_id
    and owner_id = p_owner_id
    and status = 'active'
  returning id, owner_id, total_price, commission_amount into v_rental;

  if not found then
    raise exception 'Rental is not active or not authorized' using errcode = '42501';
  end if;

  v_owner_earnings := greatest(
    coalesce(v_rental.total_price, 0) - coalesce(v_rental.commission_amount, 0),
    0
  );

  update profiles
  set
    total_earnings = total_earnings + v_owner_earnings,
    total_rentals = total_rentals + 1
  where id = v_rental.owner_id;

  return v_rental.id;
end;
$$;

revoke all on function complete_rental_return(uuid, uuid) from public, anon, authenticated;
grant execute on function complete_rental_return(uuid, uuid) to service_role;

-- The old increment-only helper must never be callable by browser clients.
revoke all on function increment_owner_earnings(uuid, numeric) from public, anon, authenticated;
grant execute on function increment_owner_earnings(uuid, numeric) to service_role;

-- Keep client-editable profile fields separate from financial/admin counters.
revoke update (total_earnings, total_rentals, rating, is_verified, is_suspended)
on table profiles
from anon, authenticated;

-- Browser clients must not be able to mark rentals paid/completed or forge
-- Stripe/financial state. Allowed status transitions go through the RPCs above;
-- payment and return completion go through Edge Functions using service role.
revoke update (
  item_id,
  renter_id,
  owner_id,
  total_price,
  commission_amount,
  deposit_amount,
  status,
  stripe_payment_intent,
  stripe_deposit_intent,
  contract_agreed,
  contract_agreed_at,
  return_confirmed_at,
  deposit_released_at
)
on table rentals
from anon, authenticated;
