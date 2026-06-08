-- Guard R-13 account deletion from deleting counterparties' shared records.
-- A fuller anonymization flow can preserve retained transaction records while removing
-- the auth user, but until those FK changes exist, deletion must fail before data loss.

create or replace function public.delete_user_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  lock table public.rentals, public.conversations in share row exclusive mode;

  if exists (
    select 1
      from public.rentals r
     where r.owner_id = p_user
        or r.renter_id = p_user
        or r.item_id in (select i.id from public.items i where i.owner_id = p_user)
  ) then
    raise exception 'Account deletion is blocked while rental records must be retained. Contact Twirl support to anonymize retained transaction records.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
      from public.conversations c
     where c.user1_id = p_user
        or c.user2_id = p_user
        or c.item_id in (select i.id from public.items i where i.owner_id = p_user)
  ) then
    raise exception 'Account deletion is blocked while shared conversations exist. Contact Twirl support to remove or anonymize retained messages.'
      using errcode = 'check_violation';
  end if;

  delete from public.reviews
    where reviewer_id = p_user or reviewee_id = p_user;

  delete from public.messages
    where sender_id = p_user;

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
