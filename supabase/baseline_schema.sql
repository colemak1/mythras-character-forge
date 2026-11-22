-- Baseline: the five tables production had before the files in
-- supabase/migrations/ were written. Reference only; never run against
-- production (the tables exist there). tests/db/permissions.cjs loads this
-- file, between the Supabase stand-ins in tests/db/base-schema.sql, so the
-- tests and this file cannot drift apart.
--
-- Source: the live catalog snapshot of 2026-11-21,
-- docs/supabase-baseline-20261121.md (PR #393). That snapshot is after the
-- migrations, so two migration-added columns are left out here:
--   campaigns.rules_settings  (20261031174633_campaign_rule_settings.sql)
--   characters.revision       (20261108120000_campaign_continuity_and_save_conflicts.sql)
-- campaigns.session_state is kept: it predates the migrations, and
-- 20261106120000 clears and blocks it (0 live rows used it on 2026-11-21).
--
-- Not here, because it was never captured or is replaced in full:
--   * Row-level policies. 20261027010800_secure_campaign_rpc_access.sql drops
--     and recreates every policy on these five tables, so the old ones do not
--     affect the result. The live policies are in the snapshot doc.
--   * The pre-migration helpers is_campaign_dm/is_campaign_member, the
--     updated_at triggers and the three original RPCs (the migrations move,
--     harden or replace them; tests/db/base-schema.sql has stand-ins).
--   * Grants (Supabase's defaults, narrowed by the migrations).
-- Depends on Supabase's auth.users table.

create table public.profiles (
  id uuid not null,
  display_name text default 'Adventurer'::text not null,
  created_at timestamp with time zone default now() not null,
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_pkey primary key (id)
);

create table public.campaigns (
  id uuid default gen_random_uuid() not null,
  name text default 'New Campaign'::text not null,
  notes text default ''::text not null,
  dm_id uuid not null,
  invite_code text not null,
  created_at timestamp with time zone default now() not null,
  session_state jsonb,
  constraint campaigns_dm_id_fkey foreign key (dm_id) references auth.users(id) on delete cascade,
  constraint campaigns_invite_code_key unique (invite_code),
  constraint campaigns_pkey primary key (id)
);

create table public.campaign_members (
  campaign_id uuid not null,
  user_id uuid not null,
  role text not null,
  joined_at timestamp with time zone default now() not null,
  constraint campaign_members_campaign_id_fkey foreign key (campaign_id) references public.campaigns(id) on delete cascade,
  constraint campaign_members_pkey primary key (campaign_id, user_id),
  constraint campaign_members_role_check check ((role = any (array['dm'::text, 'player'::text]))),
  constraint campaign_members_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

create table public.characters (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  campaign_id uuid,
  name text default 'Unnamed Character'::text not null,
  tier text default 'ordinary'::text not null,
  culture text default ''::text not null,
  career text default ''::text not null,
  state jsonb not null,
  updated_at timestamp with time zone default now() not null,
  constraint characters_campaign_id_fkey foreign key (campaign_id) references public.campaigns(id) on delete set null,
  constraint characters_owner_id_fkey foreign key (owner_id) references auth.users(id) on delete cascade,
  constraint characters_pkey primary key (id)
);

create table public.campaign_custom_content (
  id uuid default gen_random_uuid() not null,
  campaign_id uuid not null,
  type text not null,
  name text not null,
  data jsonb default '{}'::jsonb not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint campaign_custom_content_campaign_id_fkey foreign key (campaign_id) references public.campaigns(id) on delete cascade,
  constraint campaign_custom_content_created_by_fkey foreign key (created_by) references auth.users(id),
  constraint campaign_custom_content_pkey primary key (id),
  constraint campaign_custom_content_type_check check ((type = any (array['weapon'::text, 'armor'::text, 'spell'::text])))
);
create index campaign_custom_content_campaign_id_idx on public.campaign_custom_content using btree (campaign_id);

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.campaign_custom_content enable row level security;
