-- [R-101,R-102,R-103] Tier A security lockdown — money/identity SECURITY DEFINER RPCs
-- Verified live 2026-05-28 against project qlulzatkhgblorbjndsz:
--   increment_owner_earnings + handle_new_user were EXECUTE-able by anon AND authenticated
--   via /rest/v1/rpc/, allowing arbitrary earnings forgery and direct trigger-fn invocation.
-- This migration removes that exposure. The on_auth_user_created trigger is UNAFFECTED
-- (trigger functions run as definer, fired by the auth admin role — no caller EXECUTE grant required).

-- R-101: earnings forgery hole. Body hardened (schema-qualified + empty search_path); callable only by service_role (edge functions).
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

-- R-102: remove direct RPC exposure of the signup trigger fn. service_role/postgres retain execute; trigger keeps firing.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- R-103: pin search_path on the two SECURITY INVOKER helpers (no table refs) to clear mutable-search_path advisors.
alter function public.is_edu_email(text) set search_path = '';
alter function public.set_updated_at()   set search_path = '';
