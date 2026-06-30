-- Lock rental payment/state integrity.
-- Authenticated clients can only perform owner-driven status transitions:
--   pending -> approved/cancelled, paid -> active.
-- Payment, contract, money, and Stripe intent fields are written by service-role
-- functions after Stripe verification.

drop policy if exists "Rental parties update rentals" on public.rentals;
drop policy if exists "Owners approve or cancel pending rentals" on public.rentals;
drop policy if exists "Owners start paid rentals" on public.rentals;

revoke update on public.rentals from anon, authenticated;
grant update (status) on public.rentals to authenticated;
grant update on public.rentals to service_role;

create policy "Owners approve or cancel pending rentals"
  on public.rentals
  for update
  to authenticated
  using (auth.uid() = owner_id and status = 'pending')
  with check (auth.uid() = owner_id and status in ('approved', 'cancelled'));

create policy "Owners start paid rentals"
  on public.rentals
  for update
  to authenticated
  using (auth.uid() = owner_id and status = 'paid')
  with check (auth.uid() = owner_id and status = 'active');

create or replace function public.confirm_rental_payment(
  p_rental_id uuid,
  p_renter_id uuid,
  p_owner_id uuid,
  p_deposit_intent_id text,
  p_agreed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.rentals
     set status = 'paid',
         contract_agreed = true,
         contract_agreed_at = p_agreed_at
   where id = p_rental_id
     and renter_id = p_renter_id
     and owner_id = p_owner_id
     and status = 'approved';

  if not found then
    raise exception 'Rental is no longer approved';
  end if;

  if not exists (
    select 1
      from public.rental_contracts
     where rental_id = p_rental_id
       and renter_id = p_renter_id
  ) then
    insert into public.rental_contracts (
      rental_id,
      renter_id,
      owner_id,
      agreed_at,
      deposit_intent_id,
      terms_version
    )
    values (
      p_rental_id,
      p_renter_id,
      p_owner_id,
      p_agreed_at,
      p_deposit_intent_id,
      '1.0'
    );
  end if;
end;
$$;

revoke execute on function public.confirm_rental_payment(uuid, uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.confirm_rental_payment(uuid, uuid, uuid, text, timestamptz)
  to service_role;
