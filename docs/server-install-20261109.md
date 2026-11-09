# Install the campaign continuity migration (ChatGPT (Work), 2026-11-09)

**Why:** `server-check-results-20261109.md` found none of the three campaign functions in production. Its trigger list also lacks `characters_bump_revision`, which the same file creates. So the whole migration `20261108120000` never ran, or ran in a different project. The file is one transaction (`begin … commit`), so a partial run isn't possible.

**Confirmed file:** `supabase/migrations/20261108120000_campaign_continuity_and_save_conflicts.sql` on `main`. CI checks it against the stand-in schema on every push (`tests/db/permissions.cjs`, 12 tests). It is safe to re-run: `add column if not exists`, `create or replace`, and `drop trigger if exists` before the trigger is created.

## Steps (production project "Mythras Forge", SQL editor)

1. **Check one assumption first (read-only).** Make GM inserts with `on conflict (campaign_id, user_id)`, which needs a unique key on those two columns:
   ```sql
   select conname, pg_get_constraintdef(oid) from pg_constraint
   where conrelid = 'public.campaign_members'::regclass and contype in ('p','u');
   ```
   **Expect** a primary key or unique constraint on `(campaign_id, user_id)`. If there isn't one, **stop**, record the result and hand back to Claude.
2. **Install:** paste the **whole** migration file and run it once. Expect "Success. No rows returned."
3. **Verify (read-only).** Re-run Query 1 from `server-check-20261109.md`. Expect three rows (`rotate_campaign_invite`, `dm_remove_member`, `dm_transfer_campaign`), each with `authenticated_can_run = true`. Then:
   ```sql
   select column_name from information_schema.columns
   where table_schema='public' and table_name='characters' and column_name='revision';
   select tgname from pg_trigger where tgrelid='public.characters'::regclass and tgname='characters_bump_revision';
   ```
   Expect one row from each.
4. **Live:** on a disposable campaign, repeat New code, Remove and Make GM (the app's on-page confirms first). Then check that the old invite link stops working, and that the removed player keeps their character, unassigned.

Record the results in a dated `docs/` file, with no secrets. If any step shows an error, copy its exact text.
