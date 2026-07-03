-- Preserve shared rental/payment history during account deletion.
-- Replaces the R-13 hard-delete cleanup with an anonymizing cleanup that refuses
-- unresolved rentals and keeps completed/cancelled transaction records intact.

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
    raise exception 'Account deletion is blocked while you have pending or active rentals. Complete or cancel them first.';
  end if;

  update public.messages
     set content = '[deleted]',
         is_deleted = true
   where sender_id = p_user;

  update public.reviews
     set body = null
   where reviewer_id = p_user or reviewee_id = p_user;

  delete from public.saved_items
    where user_id = p_user
       or item_id in (select id from public.items where owner_id = p_user);

  delete from public.blocked_users
    where blocker_id = p_user or blocked_id = p_user;

  delete from public.reports
    where reporter_id = p_user or user_id = p_user
       or item_id in (select id from public.items where owner_id = p_user);

  update public.items
     set title = 'Deleted listing',
         description = null,
         brand = null,
         images = '{}',
         available = false,
         is_flagged = true
   where owner_id = p_user;

  update public.profiles
     set full_name = 'Deleted user',
         email = null,
         school = null,
         sorority = null,
         size = null,
         year = null,
         major = null,
         hometown = null,
         avatar_url = null,
         bio = null,
         is_verified = false,
         rating = 0,
         total_rentals = 0,
         total_earnings = 0,
         push_token = null
   where id = p_user;
end;
$$;

revoke execute on function public.delete_user_data(uuid) from public, anon, authenticated;
grant  execute on function public.delete_user_data(uuid) to service_role;
