-- Harden the rental return/deposit release path.
-- Public clients must not be able to mutate financial rental fields or call
-- earnings-crediting RPCs directly.

create or replace function complete_rental_return(p_rental_id uuid, p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rental rentals%rowtype;
  v_owner_earnings numeric;
begin
  update rentals
  set
    status = 'completed',
    return_confirmed_at = coalesce(return_confirmed_at, now()),
    deposit_released_at = coalesce(deposit_released_at, now())
  where id = p_rental_id
    and owner_id = p_owner_id
    and status = 'active'
    and deposit_released_at is null
  returning * into v_rental;

  if found then
    v_owner_earnings := greatest(
      coalesce(v_rental.total_price, 0) - coalesce(v_rental.commission_amount, 0),
      0
    );

    update profiles
    set
      total_earnings = total_earnings + v_owner_earnings,
      total_rentals = total_rentals + 1
    where id = v_rental.owner_id;

    return true;
  end if;

  if exists (
    select 1
    from rentals
    where id = p_rental_id
      and owner_id = p_owner_id
      and status = 'completed'
      and deposit_released_at is not null
  ) then
    return false;
  end if;

  raise exception 'Rental is not active or not authorized';
end;
$$;

create or replace function protect_client_rental_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_status_allowed boolean := false;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Unauthorized rental update' using errcode = '42501';
  end if;

  if row(
    new.item_id,
    new.renter_id,
    new.owner_id,
    new.conversation_id,
    new.start_date,
    new.end_date,
    new.total_price,
    new.commission_amount,
    new.deposit_amount,
    new.stripe_payment_intent,
    new.stripe_deposit_intent,
    new.contract_agreed_at,
    new.return_confirmed_at,
    new.deposit_released_at,
    new.created_at
  ) is distinct from row(
    old.item_id,
    old.renter_id,
    old.owner_id,
    old.conversation_id,
    old.start_date,
    old.end_date,
    old.total_price,
    old.commission_amount,
    old.deposit_amount,
    old.stripe_payment_intent,
    old.stripe_deposit_intent,
    old.contract_agreed_at,
    old.return_confirmed_at,
    old.deposit_released_at,
    old.created_at
  ) then
    raise exception 'Protected rental fields cannot be changed by clients' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if v_uid = old.owner_id
      and old.status = 'pending'
      and new.status in ('approved', 'cancelled') then
      v_status_allowed := true;
    end if;

    if v_uid = old.owner_id
      and old.status = 'paid'
      and new.status = 'active' then
      v_status_allowed := true;
    end if;

    if v_uid = old.renter_id
      and old.status in ('pending', 'approved')
      and new.status = 'paid'
      and new.contract_agreed is true then
      v_status_allowed := true;
    end if;

    if not v_status_allowed then
      raise exception 'Invalid client rental status transition' using errcode = '42501';
    end if;
  end if;

  if new.contract_agreed is distinct from old.contract_agreed then
    if not (
      v_uid = old.renter_id
      and old.status in ('pending', 'approved')
      and new.status = 'paid'
      and new.contract_agreed is true
    ) then
      raise exception 'Invalid client contract update' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_client_rental_updates_trigger on rentals;
create trigger protect_client_rental_updates_trigger
  before update on rentals
  for each row execute function protect_client_rental_updates();

revoke all on function increment_owner_earnings(uuid, numeric) from public, anon, authenticated;
grant execute on function increment_owner_earnings(uuid, numeric) to service_role;

revoke all on function complete_rental_return(uuid, uuid) from public, anon, authenticated;
grant execute on function complete_rental_return(uuid, uuid) to service_role;
