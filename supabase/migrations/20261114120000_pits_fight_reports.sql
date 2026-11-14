-- Pits fight reports (owner, 2026-11-14). In the Pits, "Report fight" saves what went wrong (the owner's note) with the
-- fight record (dice, rulings, what the stage drew). Claude and ChatGPT read them from the repository: a manual GitHub
-- workflow copies them there (docs/pits-reports.md).
--   - Only site admins can save a report (the owner's account; see docs/site-admin-setup.md), so the public cannot fill
--     the table or, through the export, the repository.
--   - A reporter reads their own reports from the site; nobody can change or delete one from the site.
--   - The export reads every report through pits_reports_export(token): the token is a long random secret kept as a
--     GitHub secret; only its SHA-256 is stored here, in a table nobody can read from the site.

create table if not exists public.pits_fight_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  note text not null check (char_length(btrim(note)) between 1 and 4000),
  record jsonb not null check (jsonb_typeof(record) = 'object' and pg_column_size(record) <= 600000),
  page text check (page is null or char_length(page) <= 500),
  build text check (build is null or char_length(build) <= 200)
);
alter table public.pits_fight_reports enable row level security;
revoke all on public.pits_fight_reports from anon, authenticated;
grant select on public.pits_fight_reports to authenticated;
grant insert (note, record, page, build) on public.pits_fight_reports to authenticated;

drop policy if exists pits_fight_reports_insert on public.pits_fight_reports;
create policy pits_fight_reports_insert on public.pits_fight_reports
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_site_admin());
drop policy if exists pits_fight_reports_read_own on public.pits_fight_reports;
create policy pits_fight_reports_read_own on public.pits_fight_reports
  for select to authenticated
  using (user_id = auth.uid());

-- At most 100 reports a day per account (a stuck button or a script cannot flood it).
create or replace function public.pits_fight_reports_limit()
returns trigger language plpgsql security definer set search_path = public as
$$ begin
  if (select count(*) from public.pits_fight_reports
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 100 then
    raise exception 'too many fight reports today';
  end if;
  return new;
end $$;
revoke all on function public.pits_fight_reports_limit() from public;
drop trigger if exists pits_fight_reports_limit on public.pits_fight_reports;
create trigger pits_fight_reports_limit before insert on public.pits_fight_reports
  for each row execute function public.pits_fight_reports_limit();

-- The export's readers: the SHA-256 (hex) of each export token. Added in the SQL editor only.
create table if not exists public.pits_report_readers (
  token_sha256 text primary key check (token_sha256 ~ '^[0-9a-f]{64}$'),
  label text not null default '',
  created_at timestamptz not null default now()
);
alter table public.pits_report_readers enable row level security;
revoke all on public.pits_report_readers from anon, authenticated;

-- Every report, oldest first, for a valid export token; nothing about the reporter but the report itself.
create or replace function public.pits_reports_export(p_token text)
returns table (id uuid, created_at timestamptz, note text, record jsonb, page text, build text)
language plpgsql stable security definer set search_path = public as
$$ begin
  if p_token is null or char_length(p_token) < 32 or not exists (
      select 1 from public.pits_report_readers r
      where r.token_sha256 = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')) then
    raise exception 'not allowed';
  end if;
  return query select f.id, f.created_at, f.note, f.record, f.page, f.build
    from public.pits_fight_reports f order by f.created_at, f.id;
end $$;
revoke all on function public.pits_reports_export(text) from public;
grant execute on function public.pits_reports_export(text) to anon, authenticated;
