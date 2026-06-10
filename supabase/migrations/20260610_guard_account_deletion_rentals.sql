-- Critical guard: account deletion must not erase rental transaction history.
-- If a user has ever participated in a rental, support must perform a
-- retention-safe anonymization flow instead of hard-deleting shared records.

create or replace function public.delete_user_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.rentals
    where owner_id = p_user
       or renter_id = p_user
       or item_id in (select id from public.items where owner_id = p_user)
  ) then
    raise exception
      using
        errcode = 'P0001',
        message = 'Account deletion is blocked while rental history exists. Contact support to anonymize legally retained transaction records.';
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
grant  execute on function public.delete_user_data(uuid) to service_role;
