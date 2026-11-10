-- Site admin and site-wide Home settings (owner, 2026-11-10).
-- The owner's account can change the Home quote and picture from inside the
-- site. Everyone, signed in or not, reads one settings row; only accounts
-- listed in site_admins can change it. Nobody can add admins from the site:
-- an admin is added in the SQL editor (see docs/site-admin-setup.md).

create table if not exists public.site_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

-- True when the signed-in account is a site admin. Runs as the owner so the
-- admin list itself stays unreadable.
create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.site_admins where user_id = auth.uid()) $$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

create table if not exists public.site_settings (
  id text primary key check (id = 'home'),
  home jsonb not null default '{}'::jsonb check (pg_column_size(home) <= 4000),
  hero_image text check (
    hero_image is null
    or (hero_image like 'data:image/jpeg;base64,%' and length(hero_image) <= 1400000)),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.site_settings enable row level security;
insert into public.site_settings (id) values ('home') on conflict (id) do nothing;

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update (home, hero_image, updated_at, updated_by) on public.site_settings to authenticated;

drop policy if exists site_settings_read on public.site_settings;
create policy site_settings_read on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists site_settings_admin_update on public.site_settings;
create policy site_settings_admin_update on public.site_settings
  for update to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin() and updated_by = auth.uid());
