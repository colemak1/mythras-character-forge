-- Stand-in for the Supabase production schema that predates the files in
-- supabase/migrations/ (base tables, helper functions, auth.uid(), roles and
-- Supabase's default grants). Used only by tests/db/permissions.cjs so every
-- migration can run, in order, on a real Postgres (PGlite). Where production
-- differs, the live multi-account check in docs/campaign-cases-batch-1.md
-- is the authority.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.profiles (
  id uuid primary key,
  display_name text,
  email text,                       -- a private column: must never be readable by others
  created_at timestamptz not null default now()
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text default '',
  dm_id uuid not null,
  invite_code text unique,
  session_state jsonb,
  created_at timestamptz not null default now()
);
create table public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('dm','player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text, tier text, culture text, career text,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.campaign_custom_content (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  type text not null, name text not null, data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.campaign_custom_content enable row level security;

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
