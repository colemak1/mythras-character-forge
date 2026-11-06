-- Subsystem 8 security fixes (docs/campaign-cases-batch-1.md, C8-SEC12,
-- C8-BRD17, C8-OWN03, C8-BRD07). Run once in the Supabase SQL editor.
-- Safe to re-run.
--
-- 1. GM session state (Combat Tracker NPCs and private session notes) moves
--    off campaigns, where every member can read the whole row, into a
--    GM-only table.
-- 2. A character can only be moved into a campaign its owner belongs to
--    (or runs). Unchanged assignments are never re-checked, so a player who
--    leaves a campaign can still save their character.
-- 3. The GM inventory RPC only accepts a JSON array.

begin;

-- 1. GM-only session state ------------------------------------------------
create table if not exists public.campaign_gm_state (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  session_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.campaign_gm_state enable row level security;

drop policy if exists campaign_gm_state_dm_all on public.campaign_gm_state;
create policy campaign_gm_state_dm_all on public.campaign_gm_state
  for all to authenticated
  using (exists (select 1 from public.campaigns c where c.id = campaign_gm_state.campaign_id and c.dm_id = (select auth.uid())))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_gm_state.campaign_id and c.dm_id = (select auth.uid())));

revoke all on public.campaign_gm_state from anon;
grant select, insert, update, delete on public.campaign_gm_state to authenticated;

-- Copy existing tracker data across, then clear the readable copy.
insert into public.campaign_gm_state (campaign_id, session_state)
  select id, session_state from public.campaigns where session_state is not null
  on conflict (campaign_id) do nothing;
update public.campaigns set session_state = null where session_state is not null;

-- Older cached app versions may still try to write the old column; drop
-- those writes so secrets never land where players can read them.
create or replace function private.campaigns_block_session_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.session_state := null;
  return new;
end;
$$;
drop trigger if exists campaigns_block_session_state on public.campaigns;
create trigger campaigns_block_session_state before insert or update on public.campaigns
  for each row execute function private.campaigns_block_session_state();

-- Live updates for the GM's other tabs and devices.
do $$ begin
  alter publication supabase_realtime add table public.campaign_gm_state;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- 2. Campaign assignment requires membership -----------------------------
create or replace function private.characters_check_campaign_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.campaign_id is not null
     and (tg_op = 'INSERT' or new.campaign_id is distinct from old.campaign_id)
     and not (private.is_campaign_member(new.campaign_id) or private.is_campaign_dm(new.campaign_id)) then
    raise exception 'You can only assign a character to a campaign you belong to';
  end if;
  return new;
end;
$$;
drop trigger if exists characters_check_campaign_assignment on public.characters;
create trigger characters_check_campaign_assignment before insert or update of campaign_id on public.characters
  for each row execute function private.characters_check_campaign_assignment();

-- 3. GM inventory RPC: arrays only ----------------------------------------
create or replace function public.dm_update_character_inventory(p_char uuid, p_inventory jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_inventory is null or jsonb_typeof(p_inventory) <> 'array' then raise exception 'Inventory must be a list'; end if;
  if not exists (
    select 1 from public.characters ch join public.campaigns c on c.id = ch.campaign_id
    where ch.id = p_char and c.dm_id = auth.uid()
  ) then raise exception 'not the DM of this characters campaign'; end if;
  update public.characters set state = jsonb_set(state, '{inventory}', p_inventory) where id = p_char;
end;
$$;
revoke all on function public.dm_update_character_inventory(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.dm_update_character_inventory(uuid, jsonb) to authenticated;

commit;
