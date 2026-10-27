-- Mirror of the production security hardening applied on 2026-10-27.
-- Public data access requires a signed-in user. Policy helpers live outside
-- the public API schema; the three public RPCs are explicitly granted only
-- to authenticated users and perform their own authorization checks.

begin;

create schema if not exists private;
revoke all on schema private from public;

alter function public.is_campaign_dm(uuid) set schema private;
alter function public.is_campaign_member(uuid) set schema private;

alter function public.characters_before_update() set search_path = '';
alter function public.campaign_custom_content_set_updated_at() set search_path = '';

create or replace function public.join_campaign(p_code text)
returns table(id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare v_campaign record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select c.id, c.name into v_campaign from public.campaigns c
  where c.invite_code = upper(trim(p_code));
  if v_campaign.id is null then raise exception 'Invalid invite code'; end if;
  insert into public.campaign_members (campaign_id, user_id, role)
  values (v_campaign.id, auth.uid(), 'player')
  on conflict (campaign_id, user_id) do nothing;
  return query select v_campaign.id, v_campaign.name;
end;
$$;

create or replace function public.dm_unassign_character(p_char uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.characters ch join public.campaigns c on c.id = ch.campaign_id
    where ch.id = p_char and c.dm_id = auth.uid()
  ) then raise exception 'not the DM of this characters campaign'; end if;
  update public.characters set campaign_id = null where id = p_char;
end;
$$;

create or replace function public.dm_update_character_inventory(p_char uuid, p_inventory jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.characters ch join public.campaigns c on c.id = ch.campaign_id
    where ch.id = p_char and c.dm_id = auth.uid()
  ) then raise exception 'not the DM of this characters campaign'; end if;
  update public.characters set state = jsonb_set(state, '{inventory}', p_inventory) where id = p_char;
end;
$$;

revoke all on function private.is_campaign_dm(uuid) from public, anon, authenticated;
revoke all on function private.is_campaign_member(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_campaign_dm(uuid) to authenticated;
grant execute on function private.is_campaign_member(uuid) to authenticated;

revoke all on function public.join_campaign(text) from public, anon, authenticated;
revoke all on function public.dm_unassign_character(uuid) from public, anon, authenticated;
revoke all on function public.dm_update_character_inventory(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.join_campaign(text) to authenticated;
grant execute on function public.dm_unassign_character(uuid) to authenticated;
grant execute on function public.dm_update_character_inventory(uuid, jsonb) to authenticated;

drop policy if exists campaign_custom_content_delete_dm on public.campaign_custom_content;
drop policy if exists campaign_custom_content_insert_dm on public.campaign_custom_content;
drop policy if exists campaign_custom_content_select_member on public.campaign_custom_content;
drop policy if exists campaign_custom_content_update_dm on public.campaign_custom_content;
create policy campaign_custom_content_delete_dm on public.campaign_custom_content for delete to authenticated using (exists (select 1 from public.campaigns where campaigns.id = campaign_custom_content.campaign_id and campaigns.dm_id = (select auth.uid())));
create policy campaign_custom_content_insert_dm on public.campaign_custom_content for insert to authenticated with check (exists (select 1 from public.campaigns where campaigns.id = campaign_custom_content.campaign_id and campaigns.dm_id = (select auth.uid())));
create policy campaign_custom_content_select_member on public.campaign_custom_content for select to authenticated using (private.is_campaign_member(campaign_id));
create policy campaign_custom_content_update_dm on public.campaign_custom_content for update to authenticated using (exists (select 1 from public.campaigns where campaigns.id = campaign_custom_content.campaign_id and campaigns.dm_id = (select auth.uid()))) with check (exists (select 1 from public.campaigns where campaigns.id = campaign_custom_content.campaign_id and campaigns.dm_id = (select auth.uid())));

drop policy if exists members_delete_self_or_dm on public.campaign_members;
drop policy if exists members_insert_dm_self on public.campaign_members;
drop policy if exists members_select_dm on public.campaign_members;
drop policy if exists members_select_member on public.campaign_members;
drop policy if exists members_select_self on public.campaign_members;
create policy members_delete_self_or_dm on public.campaign_members for delete to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.campaigns c where c.id = campaign_members.campaign_id and c.dm_id = (select auth.uid())));
create policy members_insert_dm_self on public.campaign_members for insert to authenticated with check (user_id = (select auth.uid()) and role = 'dm' and private.is_campaign_dm(campaign_id));
create policy members_select_dm on public.campaign_members for select to authenticated using (private.is_campaign_dm(campaign_id));
create policy members_select_member on public.campaign_members for select to authenticated using (private.is_campaign_member(campaign_id));
create policy members_select_self on public.campaign_members for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists campaigns_delete_dm on public.campaigns;
drop policy if exists campaigns_insert_as_dm on public.campaigns;
drop policy if exists campaigns_select_dm on public.campaigns;
drop policy if exists campaigns_select_member on public.campaigns;
drop policy if exists campaigns_update_dm on public.campaigns;
create policy campaigns_delete_dm on public.campaigns for delete to authenticated using (dm_id = (select auth.uid()));
create policy campaigns_insert_as_dm on public.campaigns for insert to authenticated with check (dm_id = (select auth.uid()));
create policy campaigns_select_dm on public.campaigns for select to authenticated using (dm_id = (select auth.uid()));
create policy campaigns_select_member on public.campaigns for select to authenticated using (private.is_campaign_member(id));
create policy campaigns_update_dm on public.campaigns for update to authenticated using (dm_id = (select auth.uid())) with check (dm_id = (select auth.uid()));

drop policy if exists characters_all_owner on public.characters;
drop policy if exists characters_select_campaign_dm on public.characters;
drop policy if exists characters_select_campaign_member on public.characters;
drop policy if exists characters_select_owner on public.characters;
create policy characters_all_owner on public.characters for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy characters_select_campaign_dm on public.characters for select to authenticated using (private.is_campaign_dm(campaign_id));
create policy characters_select_campaign_member on public.characters for select to authenticated using (campaign_id is not null and private.is_campaign_member(campaign_id));
create policy characters_select_owner on public.characters for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_select_any_authenticated on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_select_any_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

commit;
