-- Account deletion must not destroy rental/payment history.
-- Replace the R-13 teardown RPC with a guarded version: users with any rental
-- or contract history need manual anonymization so transaction records remain.

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
    where r.renter_id = p_user
       or r.owner_id = p_user
       or r.item_id in (select i.id from public.items i where i.owner_id = p_user)
  ) or exists (
    select 1
    from public.rental_contracts c
    where c.renter_id = p_user
       or c.owner_id = p_user
  ) then
    raise exception
      using
        errcode = 'P0001',
        message = 'Account deletion blocked: rental or payment history must be retained. Contact support to anonymize this account.';
  end if;

  delete from public.reviews
    where reviewer_id = p_user or reviewee_id = p_user;

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
grant execute on function public.delete_user_data(uuid) to service_role;
