-- [R-3] Security advisor lockdown — applied live to qlulzatkhgblorbjndsz 2026-06-04.
-- Supersedes/deploys the never-applied 20260528_lockdown_money_rpcs.sql and adds the
-- recent_rentals_by_user view + item-images bucket fixes. Advisor: 11 issues -> 1
-- (only auth leaked-password-protection remains; that is a dashboard toggle, not SQL).

-- R-3.1 / R-101: increment_owner_earnings — schema-qualified body, empty search_path,
-- callable only by service_role (edge functions). Closes the anon earnings-forgery hole.
create or replace function public.increment_owner_earnings(p_owner_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set total_earnings = total_earnings + p_amount,
         total_rentals  = total_rentals + 1
   where id = p_owner_id;
end;
$$;
revoke execute on function public.increment_owner_earnings(uuid, numeric) from public, anon, authenticated;
grant  execute on function public.increment_owner_earnings(uuid, numeric) to service_role;

-- R-102: remove direct RPC exposure of the signup trigger fn. The on_auth_user_created
-- trigger is UNAFFECTED (trigger fns run as definer, fired by the auth admin role).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- R-103: pin search_path on the two SECURITY INVOKER helpers (no table refs).
alter function public.is_edu_email(text) set search_path = '';
alter function public.set_updated_at()   set search_path = '';

-- R-3.2: recent_rentals_by_user runs with caller RLS, not creator. Clears the
-- security_definer_view ERROR. Edge-fn rate-limiting uses service_role (bypasses RLS).
alter view public.recent_rentals_by_user set (security_invoker = true);

-- R-3.3: remove broad public listing on item-images. Public object-URL fetch is
-- unaffected (public bucket serves without a SELECT policy); only enumeration is removed.
drop policy "Public read item images" on storage.objects;
