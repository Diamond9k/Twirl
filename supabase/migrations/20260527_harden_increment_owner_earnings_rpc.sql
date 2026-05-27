-- Harden existing release-deposit RPC deployments. SECURITY DEFINER functions
-- are executable by PUBLIC unless privileges are explicitly revoked.
create or replace function public.increment_owner_earnings(p_owner_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'increment_owner_earnings is restricted to service role'
      using errcode = '42501';
  end if;

  if p_amount < 0 then
    raise exception 'p_amount must be nonnegative'
      using errcode = '22023';
  end if;

  update public.profiles
  set
    total_earnings = total_earnings + p_amount,
    total_rentals  = total_rentals + 1
  where id = p_owner_id;
end;
$$;

revoke execute on function public.increment_owner_earnings(uuid, numeric) from public;
revoke execute on function public.increment_owner_earnings(uuid, numeric) from anon;
revoke execute on function public.increment_owner_earnings(uuid, numeric) from authenticated;
grant execute on function public.increment_owner_earnings(uuid, numeric) to service_role;
