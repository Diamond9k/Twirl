-- RPC called by release-deposit edge function after successful rental return
-- Atomically increments owner's earnings and rental count
create or replace function increment_owner_earnings(p_owner_id uuid, p_amount numeric)
returns void language plpgsql security definer as $$
begin
  update profiles
  set
    total_earnings = total_earnings + p_amount,
    total_rentals  = total_rentals + 1
  where id = p_owner_id;
end;
$$;

-- Completes a returned rental and credits the owner atomically after Stripe
-- capture/deposit release succeeds in the release-deposit edge function.
create or replace function complete_rental_return(
  p_rental_id uuid,
  p_owner_id uuid,
  p_amount numeric
)
returns void language plpgsql security definer set search_path = public as $$
declare
  updated_count integer;
begin
  update rentals
  set
    status = 'completed',
    return_confirmed_at = coalesce(return_confirmed_at, now()),
    deposit_released_at = coalesce(deposit_released_at, now())
  where id = p_rental_id
    and owner_id = p_owner_id
    and status = 'active';

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'Rental is not active or not owned by caller';
  end if;

  update profiles
  set
    total_earnings = coalesce(total_earnings, 0) + p_amount,
    total_rentals = coalesce(total_rentals, 0) + 1
  where id = p_owner_id;

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'Owner profile not found';
  end if;
end;
$$;
