-- D-S3, option A (docs/decisions.md, owner 2026-11-07): any signed-in user
-- may read other users' display names, including outside their campaigns.
-- Nothing else on a profile is readable by other users, and signed-out
-- visitors read nothing. Run once in the Supabase SQL editor. Safe to re-run.
--
-- Row access stays as it is (profiles_select_any_authenticated). Column
-- privileges narrow what that row access exposes: only id and display_name.
-- Any other column, existing or added later, stays unreadable through the
-- API unless it is granted here on purpose. Writes are unchanged: a user can
-- still only insert and update their own profile.

begin;

alter table public.profiles enable row level security;

-- Signed out: no access at all.
revoke all on public.profiles from anon;

-- Signed in: read only the public columns.
revoke select on public.profiles from authenticated;
grant select (id, display_name) on public.profiles to authenticated;

-- Keep the existing row rules (re-stated so a re-run converges).
drop policy if exists profiles_select_any_authenticated on public.profiles;
create policy profiles_select_any_authenticated on public.profiles
  for select to authenticated using (true);
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

commit;
