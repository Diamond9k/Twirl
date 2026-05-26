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

revoke execute on function increment_owner_earnings(uuid, numeric) from public, anon, authenticated;
