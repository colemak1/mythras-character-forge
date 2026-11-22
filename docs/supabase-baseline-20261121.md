# Supabase baseline capture — 2026-11-21

Read-only catalog snapshot of the live Mythras Forge Supabase database on 2026-11-21 Pacific time (2026-11-22 UTC), after PR #392. The five pre-migration tables match the `CREATE TABLE` list in [the test fixture](../tests/db/base-schema.sql). The live snapshot contains 33 columns, 16 named constraints, 7 indexes and 21 RLS policies. It includes only the requested schema metadata and aggregate count.

## Legacy campaign session state

```sql
select count(*) from campaigns where session_state is not null;
```

**Result: 0.** The database reported that RLS did not filter `campaigns` for the SQL role used for this count.

## Differences from the test fixture

| Table | Live differences in columns and constraints |
| --- | --- |
| `profiles` | `display_name` is required and defaults to `'Adventurer'`. There is no `email` column. `id` references `auth.users` with cascade delete. |
| `campaigns` | `name` defaults to `'New Campaign'`. `notes` and `invite_code` are required. `dm_id` references `auth.users` with cascade delete. The live table also has `rules_settings`. |
| `campaign_members` | `user_id` references `auth.users` with cascade delete. |
| `characters` | `owner_id` references `auth.users` with cascade delete. `name`, `tier`, `culture` and `career` are required and have defaults. `state` has no default. The live table has `revision` and no `created_at`. |
| `campaign_custom_content` | `data` is required and defaults to `{}`. `created_by` is a nullable foreign key to `auth.users`. A check limits `type` to `weapon`, `armor` and `spell`. |

The live schema also has a standalone index on `campaign_custom_content.campaign_id` and the policies listed below. All five tables have RLS enabled with FORCE RLS off.

This snapshot reflects production **after migrations**. The migration chain adds `campaigns.rules_settings` and `characters.revision`, and installs the live policies that reference `private.is_campaign_dm` and `private.is_campaign_member`. Account for those dependencies when reconstructing the pre-migration baseline. The DDL references the Supabase-managed `auth.users` table and existing policy helpers. Grants, triggers and helper definitions are outside this capture.

## Live DDL

Constraint-backed indexes are shown as comments because the named constraints create them.

```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text DEFAULT 'Adventurer'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Backing index created by profiles_pkey
-- CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;

CREATE POLICY profiles_insert_self ON public.profiles
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY profiles_select_any_authenticated ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_update_self ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE TABLE public.campaigns (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text DEFAULT 'New Campaign'::text NOT NULL,
  notes text DEFAULT ''::text NOT NULL,
  dm_id uuid NOT NULL,
  invite_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  session_state jsonb,
  rules_settings jsonb,
  CONSTRAINT campaigns_dm_id_fkey FOREIGN KEY (dm_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT campaigns_invite_code_key UNIQUE (invite_code),
  CONSTRAINT campaigns_pkey PRIMARY KEY (id)
);

-- Backing index created by campaigns_invite_code_key
-- CREATE UNIQUE INDEX campaigns_invite_code_key ON public.campaigns USING btree (invite_code);
-- Backing index created by campaigns_pkey
-- CREATE UNIQUE INDEX campaigns_pkey ON public.campaigns USING btree (id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns NO FORCE ROW LEVEL SECURITY;

CREATE POLICY campaigns_delete_dm ON public.campaigns
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((dm_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY campaigns_insert_as_dm ON public.campaigns
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((dm_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY campaigns_select_dm ON public.campaigns
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((dm_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY campaigns_select_member ON public.campaigns
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (private.is_campaign_member(id));

CREATE POLICY campaigns_update_dm ON public.campaigns
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((dm_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((dm_id = ( SELECT auth.uid() AS uid)));

CREATE TABLE public.campaign_members (
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT campaign_members_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_members_pkey PRIMARY KEY (campaign_id, user_id),
  CONSTRAINT campaign_members_role_check CHECK ((role = ANY (ARRAY['dm'::text, 'player'::text]))),
  CONSTRAINT campaign_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Backing index created by campaign_members_pkey
-- CREATE UNIQUE INDEX campaign_members_pkey ON public.campaign_members USING btree (campaign_id, user_id);

ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_members NO FORCE ROW LEVEL SECURITY;

CREATE POLICY members_delete_self_or_dm ON public.campaign_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
     FROM public.campaigns c
    WHERE ((c.id = campaign_members.campaign_id) AND (c.dm_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY members_insert_dm_self ON public.campaign_members
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (role = 'dm'::text) AND private.is_campaign_dm(campaign_id)));

CREATE POLICY members_select_dm ON public.campaign_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (private.is_campaign_dm(campaign_id));

CREATE POLICY members_select_member ON public.campaign_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (private.is_campaign_member(campaign_id));

CREATE POLICY members_select_self ON public.campaign_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE TABLE public.characters (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  campaign_id uuid,
  name text DEFAULT 'Unnamed Character'::text NOT NULL,
  tier text DEFAULT 'ordinary'::text NOT NULL,
  culture text DEFAULT ''::text NOT NULL,
  career text DEFAULT ''::text NOT NULL,
  state jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  revision bigint DEFAULT 0 NOT NULL,
  CONSTRAINT characters_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL,
  CONSTRAINT characters_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT characters_pkey PRIMARY KEY (id)
);

-- Backing index created by characters_pkey
-- CREATE UNIQUE INDEX characters_pkey ON public.characters USING btree (id);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters NO FORCE ROW LEVEL SECURITY;

CREATE POLICY characters_all_owner ON public.characters
  AS PERMISSIVE FOR ALL TO authenticated
  USING ((owner_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY characters_select_campaign_dm ON public.characters
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (private.is_campaign_dm(campaign_id));

CREATE POLICY characters_select_campaign_member ON public.characters
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (((campaign_id IS NOT NULL) AND private.is_campaign_member(campaign_id)));

CREATE POLICY characters_select_owner ON public.characters
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((owner_id = ( SELECT auth.uid() AS uid)));

CREATE TABLE public.campaign_custom_content (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT campaign_custom_content_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_custom_content_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT campaign_custom_content_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_custom_content_type_check CHECK ((type = ANY (ARRAY['weapon'::text, 'armor'::text, 'spell'::text])))
);

CREATE INDEX campaign_custom_content_campaign_id_idx ON public.campaign_custom_content USING btree (campaign_id);
-- Backing index created by campaign_custom_content_pkey
-- CREATE UNIQUE INDEX campaign_custom_content_pkey ON public.campaign_custom_content USING btree (id);

ALTER TABLE public.campaign_custom_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_custom_content NO FORCE ROW LEVEL SECURITY;

CREATE POLICY campaign_custom_content_delete_dm ON public.campaign_custom_content
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
     FROM public.campaigns
    WHERE ((campaigns.id = campaign_custom_content.campaign_id) AND (campaigns.dm_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY campaign_custom_content_insert_dm ON public.campaign_custom_content
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
     FROM public.campaigns
    WHERE ((campaigns.id = campaign_custom_content.campaign_id) AND (campaigns.dm_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY campaign_custom_content_select_member ON public.campaign_custom_content
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (private.is_campaign_member(campaign_id));

CREATE POLICY campaign_custom_content_update_dm ON public.campaign_custom_content
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
     FROM public.campaigns
    WHERE ((campaigns.id = campaign_custom_content.campaign_id) AND (campaigns.dm_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
     FROM public.campaigns
    WHERE ((campaigns.id = campaign_custom_content.campaign_id) AND (campaigns.dm_id = ( SELECT auth.uid() AS uid))))));
```
