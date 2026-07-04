-- [R-13 hotfix] Protect rental/audit records during account deletion.
-- The original account-deletion RPC hard-deleted rentals and contracts. That can
-- strand Stripe/payment state and erase legally required transaction records.
-- Until anonymized transaction retention is implemented, reject deletion for any
-- account that participates in rental history.

create or replace function public.delete_user_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
      from public.rentals r
     where r.owner_id = p_user
        or r.renter_id = p_user
        or exists (
          select 1
            from public.items i
           where i.id = r.item_id
             and i.owner_id = p_user
        )
  )
  or exists (
    select 1
      from public.rental_contracts c
     where c.owner_id = p_user
        or c.renter_id = p_user
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Account deletion blocked: rental history must be retained safely. Contact Twirl support to delete or anonymize this account.';
  end if;

  delete from public.reviews
    where reviewer_id = p_user or reviewee_id = p_user;

  delete from public.rental_contracts
    where owner_id = p_user or renter_id = p_user;

  delete from public.rentals
    where owner_id = p_user or renter_id = p_user
       or item_id in (select id from public.items where owner_id = p_user);

  delete from public.messages
    where sender_id = p_user;

  delete from public.conversations
    where user1_id = p_user or user2_id = p_user
       or item_id in (select id from public.items where owner_id = p_user);

  delete from public.reports
    where reporter_id = p_user or user_id = p_user
       or item_id in (select id from public.items where owner_id = p_user);

  delete from public.saved_items where user_id = p_user;
  delete from public.blocked_users where blocker_id = p_user or blocked_id = p_user;
  delete from public.items where owner_id = p_user;
  delete from public.profiles where id = p_user;
end;
$$;

revoke execute on function public.delete_user_data(uuid) from public, anon, authenticated;
grant  execute on function public.delete_user_data(uuid) to service_role;
