# Pits fight reports

How "Report fight" in the Pits reaches Claude and ChatGPT (owner, 2026-11-14).

## How it works

1. In a fight, **Report fight** (top bar) opens a window. Anyone playing (no sign-in needed) types what went wrong,
   optionally a name (remembered on that device, so two testers can be told apart), and presses **Send report**.
   The note is saved with the fight record (dice and rulings in the order shown, the engine's log, what the stage drew)
   and the build of the Pits scripts the page was running, so a stale page shows as one.
2. It is saved in the site's database, table `pits_fight_reports`
   (`supabase/migrations/20261114120000_pits_fight_reports.sql`). Anyone can send one, signed in or not (owner,
   2026-11-14); nobody can read, change or delete one from the site; at most 200 a day across the site.
   Offline or refused, the report is kept on that device and sent with the next one that goes through.
   **Copy the fight record** in the same window still copies it by hand.
3. When the owner says "go through the fight reports", Claude runs the manual workflow **Export Pits fight reports**
   (`.github/workflows/pits-reports-export.yml`). It copies every report to the **`pits-reports` branch**, folder
   `reports/`: one JSON file per report, never rewritten, and `README.md`, a list of all of them, newest first.
4. Claude and ChatGPT both read that branch (ChatGPT through its GitHub connector). Each writes what it finds in
   `docs/pits-report-ledger.md` on the working branch: one row per report, so the two do not diagnose the same one twice
   and the owner sees what came of each.

The reports are in a **public repository** once exported: notes and fight records (character names, weapons, dice) are
readable by anyone. The typed name is exported; nothing about an account is. If the site gets other visitors, anyone
could send a report: the 200-a-day limit caps it, and the owner can ask Claude to restrict sending again.

## One-time setup

**ChatGPT (Work)**, in the Supabase SQL editor:

1. Run `supabase/migrations/20261114120000_pits_fight_reports.sql`.
2. Make the export key. This shows a 64-character key **once**; only its fingerprint is kept in the database:

   ```sql
   with t as (select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') as token),
   ins as (insert into public.pits_report_readers(token_sha256, label)
           select encode(sha256(convert_to(token, 'UTF8')), 'hex'), 'GitHub export' from t returning 1)
   select token from t, ins;
   ```

3. Give the key to the owner privately (not in a file, a PR or a report). Record only "export key created" in your
   dated `docs/` report.

**Owner**, on GitHub: repository **Settings → Secrets and variables → Actions → New repository secret**, name
`PITS_REPORTS_TOKEN`, value the key from step 2. (To replace a key: Work deletes the old row from
`pits_report_readers`, makes a new one, and the owner updates the secret.)

## Diagnosing

- Start from the note: it names the moment. Then the record: `presented` (what the player saw, in order), `log` (the
  engine), `stage` (what was drawn: `[clock, type, kind, actor, target, location, HP lost]`).
- Check `build` against the scripts' `?v=` on the branch the owner was playing; a stale page is reported, not fixed.
- Severity as in `AGENTS.md`. Claude fixes with a test; ChatGPT (Chat) answers rules questions with a Core page.
