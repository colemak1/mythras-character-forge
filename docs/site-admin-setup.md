# Site admin setup (owner, 2026-11-10)

The owner's account ("colemak") can change the Home quote, its credit line and the Home picture from the site: **Account → Site home page**. The panel shows only for site admins. This needs the migration run once, then the owner's account added as an admin.

**For ChatGPT (Work), in the Supabase SQL editor.** Record the results in a dated `docs/` file, with no secrets or emails.

1. Run `supabase/migrations/20261110120000_site_admin_and_settings.sql` as it is in the repository.
2. Find the owner's account. It should be exactly one row:
   ```sql
   select id, display_name, created_at from public.profiles where display_name ilike 'colemak%';
   ```
   If there is not exactly one row, stop and ask the owner which account to use.
3. Make it an admin, using the `id` from step 2:
   ```sql
   insert into public.site_admins (user_id) values ('<id from step 2>') on conflict do nothing;
   ```
4. Verify:
   ```sql
   select count(*) from public.site_admins;                      -- 1
   select id, home, hero_image is null as default_picture from public.site_settings;  -- one row 'home'
   ```
5. Live check, signed in as the owner's account: Account shows **Site home page**. Set a quote, Save, and Home shows it while signed out too. Then "Use the default painting" and Save, to leave the picture as it was. Signed in as any other account, the panel does not show.

## Notes

- Before the migration runs, the site behaves exactly as now: the bundled painting, and the title instead of a quote.
- Only the database decides who is an admin. Nobody can make themselves one from the site. To add or remove an admin later, use step 3, or `delete from public.site_admins where user_id = '…'`.
- A campaign's own quote, set by its GM in the campaign manager, still shows first for that campaign's players.
- The picture is resized in the browser to a JPEG of at most about 1.3 MB and stored in the settings row.
