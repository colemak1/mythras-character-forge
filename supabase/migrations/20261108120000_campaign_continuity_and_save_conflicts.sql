-- Subsystem 8 owner decisions D-S1, D-S2 and D-S4 (docs/decisions.md,
-- 2026-11-07). Run once in the Supabase SQL editor. Safe to re-run.
--
-- D-S1  The GM can replace the invite code. The old code and its #/join/
--       link stop working at once. Members can still read the current code.
-- D-S2  Characters carry a revision number that goes up whenever their
--       saved state changes. The app saves only if the revision is still the
--       one it opened, so a stale tab, device or GM edit never silently
--       overwrites a newer copy. Campaign assignment changes don't count.
-- D-S4  The GM can remove a member (their characters stay theirs and are
--       only unassigned) and hand the GM role to another member. The
--       whole-campaign backup is built in the browser from data the GM can
--       already read, so it needs no server change.

begin;

-- D-S2. Character revisions ---------------------------------------------
alter table public.characters add column if not exists revision bigint not null default 0;

-- The server alone sets the revision: a client can't skip ahead or roll back.
create or replace function private.characters_bump_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 0;
  elsif new.state is distinct from old.state then
    new.revision := old.revision + 1;
  else
    new.revision := old.revision;
  end if;
  return new;
end;
$$;
drop trigger if exists characters_bump_revision on public.characters;
create trigger characters_bump_revision before insert or update on public.characters
  for each row execute function private.characters_bump_revision();

-- GM inventory edits check the revision too, so a GM working from an old
-- copy can't wipe items the player changed since. The old two-argument form
-- stays for cached app versions.
create or replace function public.dm_update_character_inventory(p_char uuid, p_inventory jsonb, p_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_rev bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_inventory is null or jsonb_typeof(p_inventory) <> 'array' then raise exception 'Inventory must be a list'; end if;
  if not exists (
    select 1 from public.characters ch join public.campaigns c on c.id = ch.campaign_id
    where ch.id = p_char and c.dm_id = auth.uid()
  ) then raise exception 'not the DM of this characters campaign'; end if;
  update public.characters set state = jsonb_set(state, '{inventory}', p_inventory)
    where id = p_char and (p_revision is null or revision = p_revision)
    returning revision into v_rev;
  if v_rev is null then raise exception 'conflict: character changed since it was opened' using errcode = '40001'; end if;
  return v_rev;
end;
$$;
revoke all on function public.dm_update_character_inventory(uuid, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.dm_update_character_inventory(uuid, jsonb, bigint) to authenticated;

-- D-S1. New invite code ---------------------------------------------------
create or replace function public.rotate_campaign_invite(p_campaign uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.campaigns c where c.id = p_campaign and c.dm_id = auth.uid())
    then raise exception 'Only the GM can change the invite code'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.campaigns c where c.invite_code = v_code);
  end loop;
  update public.campaigns set invite_code = v_code where id = p_campaign;
  return v_code;
end;
$$;
revoke all on function public.rotate_campaign_invite(uuid) from public, anon, authenticated;
grant execute on function public.rotate_campaign_invite(uuid) to authenticated;

-- D-S4. Remove a member ---------------------------------------------------
-- Their characters are unassigned, never deleted (C8-LIFE11).
create or replace function public.dm_remove_member(p_campaign uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.campaigns c where c.id = p_campaign and c.dm_id = auth.uid())
    then raise exception 'Only the GM can remove members'; end if;
  if p_user = auth.uid() then raise exception 'The GM cannot remove themselves; hand over the GM role first'; end if;
  delete from public.campaign_members where campaign_id = p_campaign and user_id = p_user;
  update public.characters set campaign_id = null where campaign_id = p_campaign and owner_id = p_user;
end;
$$;
revoke all on function public.dm_remove_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.dm_remove_member(uuid, uuid) to authenticated;

-- D-S4. Hand over the GM role ---------------------------------------------
-- The new GM must already be a member. The old GM stays on as a player and
-- keeps their characters. GM-only session state (tracker, notes) goes with
-- the campaign to the new GM.
create or replace function public.dm_transfer_campaign(p_campaign uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old uuid := auth.uid();
begin
  if v_old is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.campaigns c where c.id = p_campaign and c.dm_id = v_old)
    then raise exception 'Only the GM can hand over the campaign'; end if;
  if p_user is null or p_user = v_old then raise exception 'Choose another member'; end if;
  if not exists (select 1 from public.campaign_members m where m.campaign_id = p_campaign and m.user_id = p_user)
    then raise exception 'The new GM must be a member of this campaign'; end if;
  update public.campaigns set dm_id = p_user where id = p_campaign;
  update public.campaign_members set role = 'dm' where campaign_id = p_campaign and user_id = p_user;
  insert into public.campaign_members (campaign_id, user_id, role) values (p_campaign, v_old, 'player')
    on conflict (campaign_id, user_id) do update set role = 'player';
end;
$$;
revoke all on function public.dm_transfer_campaign(uuid, uuid) from public, anon, authenticated;
grant execute on function public.dm_transfer_campaign(uuid, uuid) to authenticated;

commit;

-- Ask the API to pick up the new functions at once (live batch #213).
notify pgrst, 'reload schema';
