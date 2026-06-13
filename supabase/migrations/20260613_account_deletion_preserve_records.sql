-- Account deletion safety fix.
-- Preserve shared transaction/audit rows by retaining an anonymized profile after
-- the auth identity is deleted. This avoids erasing counterparties' rentals,
-- contracts, reports, reviews, and messages.

alter table public.profiles add column if not exists stripe_account_id text;
alter table public.profiles add column if not exists deleted_at timestamptz;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
      from pg_constraint
     where conrelid = 'public.profiles'::regclass
       and confrelid = 'auth.users'::regclass
       and contype = 'f'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_record.conname);
  end loop;
end $$;

create or replace function public.delete_user_data(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  blocking_rental_count integer;
begin
  select count(*)
    into blocking_rental_count
    from public.rentals
   where (owner_id = p_user
          or renter_id = p_user
          or item_id in (select id from public.items where owner_id = p_user))
     and status in ('pending', 'approved', 'paid', 'active', 'disputed');

  if blocking_rental_count > 0 then
    raise exception 'Finish or cancel active rentals before deleting your account.';
  end if;

  update public.messages
     set content = 'Message deleted',
         is_deleted = true
   where sender_id = p_user;

  update public.conversations
     set last_message = null
   where user1_id = p_user
      or user2_id = p_user
      or item_id in (select id from public.items where owner_id = p_user);

  update public.reviews
     set body = null
   where reviewer_id = p_user;

  update public.reports
     set details = null
   where reporter_id = p_user;

  delete from public.saved_items where user_id = p_user;
  delete from public.blocked_users where blocker_id = p_user or blocked_id = p_user;

  update public.items
     set title = 'Deleted item',
         description = null,
         images = '{}'::text[],
         available = false,
         size = null,
         occasion = null,
         category = null,
         brand = null
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
         is_suspended = true,
         push_token = null,
         stripe_account_id = null,
         deleted_at = now()
   where id = p_user;
end;
$$;

revoke execute on function public.delete_user_data(uuid) from public, anon, authenticated;
grant  execute on function public.delete_user_data(uuid) to service_role;
