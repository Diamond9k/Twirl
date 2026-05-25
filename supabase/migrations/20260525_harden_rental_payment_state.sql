-- Prevent clients from calling the earnings RPC directly.
revoke execute on function increment_owner_earnings(uuid, numeric) from public, anon, authenticated;
grant execute on function increment_owner_earnings(uuid, numeric) to service_role;

-- Client-side rental updates are limited to owner-controlled status transitions.
-- Financial fields, Stripe IDs, and paid/completed transitions are service-role only.
create or replace function guard_rental_client_updates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Unauthorized rental update';
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Only rental status may be updated by clients';
  end if;

  if auth.uid() = old.owner_id and (
    (old.status = 'pending' and new.status in ('approved', 'cancelled')) or
    (old.status = 'paid' and new.status = 'active')
  ) then
    return new;
  end if;

  raise exception 'Invalid rental status transition';
end;
$$;

drop trigger if exists guard_rental_client_updates on rentals;
create trigger guard_rental_client_updates before update on rentals
  for each row execute function guard_rental_client_updates();

drop policy if exists "Rental parties update rentals" on rentals;
create policy "Owners update rental handoff status" on rentals for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
