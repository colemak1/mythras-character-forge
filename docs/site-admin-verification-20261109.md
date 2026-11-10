# Site admin setup and live verification — 2026-11-09

Owner-local date (America/Los_Angeles). Followed `AGENTS.md`, `HANDOFF.md`, and `docs/site-admin-setup.md` for merged #256. Database changes used the Supabase connector against the Mythras Forge project; live checks used the internal browser and secure authentication.

## Results

| Step | Result | Evidence |
| --- | --- | --- |
| Run repository migration | PASS | Applied `supabase/migrations/20261110120000_site_admin_and_settings.sql` verbatim through the migration tool (`site_admin_and_settings`); success returned. Repository migration source unchanged. |
| Find owner | PASS | Setup query `display_name ilike 'colemak%'` returned exactly one profile, display name Colemak. No ambiguity; no other profile selected. |
| Add site admin | PASS | Inserted that profile into `public.site_admins` with `on conflict do nothing`. |
| Verify admin count | PASS | `select count(*) from public.site_admins` returned 1. |
| Verify settings | PASS | Initial query returned one row: id `home`, home `{}`, default_picture=true. Both new tables have RLS enabled. |
| Non-admin Account | PASS | Refreshed the deployed Account page while signed in as an existing test account. No Site home page region/heading; account remained signed in. Tested before owner sign-in. |
| Owner Account | PASS | Secure sign-in verified Colemak; Account displayed Site home page / Admin with Quote, Said by, picture controls and Save home page. |
| Save quote/default picture | PASS | Used Use the default painting and saved; then saved quote “Every road begins with a single step.” and attribution “Table motto”. Status: “Saved. Home shows it for everyone now.” |
| Home while signed out | PASS | Signed out, reloaded Home, confirmed the saved quote and attribution with Account / Sign in visible. Default painting remained. |
| Campaign override | PASS, observed | Owner's signed-in Home retained the existing campaign's own quote/session; signed-out Home showed the site quote. No campaign data edited. |
| Final database read | PASS | `home` contains quote/cite values above and empty picture credit; `hero_image is null` remains true. |

## Finding for Claude

**Use the default painting discards unsaved quote/attribution edits.** On Site home page, typed Quote and Said by, then clicked Use the default painting. The form re-rendered with both text fields empty before Save. Saving succeeded with those empty values. Re-entering the text after the picture action and saving worked. Preserve the pending text values when picture controls re-render the panel. This does not block the completed setup.

## Security advisor observations

Ran the security advisor after migration. Findings relevant to the supplied design:

- `site_admins`: RLS enabled with no policy (INFO). This is intentional in the migration: client grants revoked and admin list stays unreadable. [Advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- `is_site_admin()`: SECURITY DEFINER executable by anon and authenticated (WARN). The supplied migration explicitly grants these roles a boolean lookup scoped to `auth.uid()`. Record for Claude's review; no grants or function code changed beyond the requested migration. [Anon reference](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Other findings: existing authenticated continuity/inventory RPC SECURITY DEFINER warnings; leaked-password protection disabled. These are outside this setup; no unrelated changes made. [Password-protection reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

UI panel visibility was tested; this was not a full adversarial RLS/write-permission matrix.

## Final state and scope

- Exactly one site admin: the uniquely matched owner profile. No profile IDs, emails, credentials, invite codes or tokens recorded here.
- Site quote and attribution left saved as requested. Default painting preserved; no image uploaded.
- Browser left signed out on public Home. No campaigns or characters created or changed.
- An earlier secure prompt timed out without reaching the owner; fresh internal-browser prompt succeeded. No direct credential entry used.
- Docs-only repository changes; CHANGELOG.md and production code untouched. Runtime tests not run (connector-only docs edits); database verification and independent live checks are the evidence above.
- Progress remains **5/8**. Main Play Mode Combat stays CLOSED.

Next: Claude — review/merge the results and preserve unsaved quote/attribution values across the default-picture action.
