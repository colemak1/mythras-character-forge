# Campaign server check (2026-11-09)

Live batch #213 found that New code, Remove and Make GM failed in production with "needs the November 2026 campaign update", even though the migration had been run. Until now the app showed that message for *any* "does not exist" error. So the real cause could also be a table, column or function that a production trigger can't find. The functions run with an empty search path, so any name without a schema in front fails.

The app now shows the server's own error text and code. If New code fails again, the message will say what's wrong.

**Owner: run this read-only query in the Supabase SQL editor and paste the result to Claude.** It changes nothing.

```sql
-- 1. Are the three functions there, and who can run them?
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_run
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('rotate_campaign_invite','dm_remove_member','dm_transfer_campaign');

-- 2. Every trigger on the tables these functions change, with the
--    search_path its function runs under (blank = inherits the caller's,
--    which is empty inside these functions).
select c.relname as table_name, t.tgname as trigger_name,
       fn.nspname || '.' || f.proname as trigger_function, f.proconfig as settings
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc f on f.oid = t.tgfoid
join pg_namespace fn on fn.oid = f.pronamespace
where not t.tgisinternal
  and c.relname in ('campaigns','campaign_members','characters')
order by 1, 2;
```

**Likely fixes, depending on the result:**
- **Query 1 returns no rows, or `authenticated_can_run` is false:** re-run `supabase/migrations/20261108120000_campaign_continuity_and_save_conflicts.sql`. It now ends by telling the API to reload its function list.
- **Query 2 lists a trigger whose `settings` is blank:** that trigger's function probably names tables without `public.`. Claude will write a small migration that sets its search path or qualifies its names.
