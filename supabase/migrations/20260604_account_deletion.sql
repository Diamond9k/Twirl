-- [R-13] Account deletion (Apple Guideline 5.1.1(v)).
-- Transactional teardown of all of a user's data, ordered to satisfy the NO ACTION
-- foreign keys (conversations/messages/rentals/rental_contracts/reviews/reports)
-- before the CASCADE tables (items/saved_items/blocked_users/profiles).
-- SECURITY DEFINER + empty search_path + service_role-only execute (per R-3 lockdown).
-- The auth.users row is removed separately by the delete-account edge function.

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
    where (
      owner_id = p_user
      or renter_id = p_user
      or item_id in (select id from public.items where owner_id = p_user)
    )
    and status not in ('completed', 'cancelled')
  ) then
    raise exception using message = 'Cannot delete account while rentals are still in progress. Complete or cancel active rentals first.';
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
