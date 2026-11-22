-- Stand-in for what the Supabase production schema had before the files in
-- supabase/migrations/: auth.users, auth.uid(), roles, policy helpers, the
-- original RPCs and Supabase's default grants. The five base tables are not
-- copied here: tests/db/permissions.cjs puts supabase/baseline_schema.sql
-- (taken from the live database on 2026-11-21) where the include line below
-- is, so the tests run on the real table definitions. Then every migration
-- runs, in order, on a real Postgres (PGlite).
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- @include supabase/baseline_schema.sql

create function public.is_campaign_dm(c uuid) returns boolean language sql stable security definer set search_path = '' as
  $$ select exists (select 1 from public.campaigns where id = c and dm_id = auth.uid()) $$;
create function public.is_campaign_member(c uuid) returns boolean language sql stable security definer set search_path = '' as
  $$ select exists (select 1 from public.campaign_members where campaign_id = c and user_id = auth.uid()) $$;

create function public.characters_before_update() returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id then raise exception 'owner_id cannot change'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger characters_before_update before update on public.characters
  for each row execute function public.characters_before_update();
create function public.campaign_custom_content_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create function public.join_campaign(p_code text) returns table(id uuid, name text) language sql as $$ select null::uuid, null::text $$;
create function public.dm_unassign_character(p_char uuid) returns void language sql as $$ select $$;
create function public.dm_update_character_inventory(p_char uuid, p_inventory jsonb) returns void language sql as $$ select $$;

-- Supabase's default grants: table access is then narrowed by RLS and by the migrations.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
