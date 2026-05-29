-- RPC called by release-deposit edge function after successful rental return
-- Atomically increments owner's earnings and rental count
create or replace function increment_owner_earnings(p_owner_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles
  set
    total_earnings = total_earnings + p_amount,
    total_rentals  = total_rentals + 1
  where id = p_owner_id;
end;
$$;

revoke all on function increment_owner_earnings(uuid, numeric) from public;
revoke all on function increment_owner_earnings(uuid, numeric) from anon;
revoke all on function increment_owner_earnings(uuid, numeric) from authenticated;
grant execute on function increment_owner_earnings(uuid, numeric) to service_role;
