# Pits fight reports setup — 2026-11-13

Source: `claude/cool-faraday-izzi63` at `e69bc4e`, `docs/pits-reports.md` and migration `20261114120000_pits_fight_reports.sql`.

- PASS: ran the migration unchanged on the Mythras Forge Supabase project through its SQL connector.
- Export key created.
- PASS: both new tables have RLS; anon and authenticated may insert report content but cannot directly read, update or delete reports, or read the reader table.
- PASS: an anon submission succeeded inside a rolled-back transaction; no test report remains. The valid key exported zero reports; an invalid key was rejected with `not allowed`.
- Security advisors checked: the new reader table's lack of policies and the token-gated export's SECURITY DEFINER warnings match the intended design. [Advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). Other advisor findings concern existing objects and Auth settings, outside this setup scope.
- Not checked: browser submission and GitHub export workflow. Owner must add `PITS_REPORTS_TOKEN` to the repository Actions secrets before running the export.

No failures found in these setup checks. Session readiness **13/14**; feature completeness **8/8 built, 8 closed**. Change: report database and export access installed; readiness counts unchanged.
