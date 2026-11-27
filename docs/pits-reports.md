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
3. The workflow **Export Pits fight reports** (`.github/workflows/pits-reports-export.yml`) runs every 6 hours, at
   12 AM, 6 AM, 12 PM and 6 PM Pacific (owner, 2026-11-27; GitHub may start it a little late), and by hand from the
   Actions tab whenever the owner says "go through the fight reports". It copies every report to the **`pits-reports`
   branch**, folder `reports/`: one JSON file per report, never rewritten, and `README.md`, a list of all of them,
   newest first. A run with nothing new commits nothing.
4. Claude and ChatGPT both read that branch (ChatGPT through its GitHub connector). Each writes what it finds in
   `docs/pits-report-ledger.md` on the working branch: one row per report, so the two do not diagnose the same one twice
   and the owner sees what came of each.

The reports are in a **public repository** once exported: notes and fight records (character names, weapons, dice) are
readable by anyone. The typed name is exported; nothing about an account is. If the site gets other visitors, anyone
could send a report: the 200-a-day limit caps it, and the owner can ask Claude to restrict sending again.

## "Lost?" (What just happened?)

Next to Report fight, **Lost?** (or the `?` key) is for the moment a player no longer follows the fight (owner,
2026-11-14). One press, no typing:

1. It marks the moment and saves it at once as a report whose note starts `[Lost #n]` (n counts the presses in that
   bout), with the whole fight record. The record's `lost` list holds every mark in the bout, and `lostMark` says which
   one this report is. A mark holds where the fight was (round, cycle, whose turn, the phase, a beat being played and
   which one, the dice or decision waiting), indexes into the record (`logShown`, `lastLogShown`, `tape`,
   `stageClock`), what the screen showed (headline, exchange step, story, dice tray, strip, details panel) and the last
   actions as the player was told them.
2. A window tells the player the last few actions in plain words (only what the screen has shown so far). An optional
   "What confused you?" note is saved as a second report, `[Lost #n note] ...`, with a small record naming the mark.

**Diagnosing a Lost press:** read the mark's `screen` and `recent` (what the player saw and was told), then find
`lastLogShown` in `log` and `tape` in `presented` to see what had just happened and what came next. The question is
why the screen did not make it clear; the answer is usually a presentation fix (tempo, wording, what is shown), not a
rule.

## "Idea"

Beside Lost? and Report fight, **Idea** opens a window where a player suggests something for the Pits (owner,
2026-11-15): a feature, a change, something they would like to see. It is saved in the same table as a report whose note
starts `[Idea]`, with the optional name and a small record (`record: "pits-idea"`: mode, round, phase, fighters and their
weapons, and the screen's headline and exchange step), not the whole fight. Offline or refused, it waits on the device
like a report. When going through the fight reports, list ideas under "Ideas" in `docs/pits-report-ledger.md` for the
owner to choose from; they are not faults to diagnose.

## Site feedback

The round button in the bottom-right corner of every page (`js/feedback.js`, owner 2026-11-27) opens a small popup:
**Report a bug** or **Share an idea**, a text box and the same optional name. It is saved in the same table, so the
export copies it with the fight reports: the note starts `[Site bug]` or `[Site idea]`, `page` is the page and its
query, `build` is `view=<view>;<width>x<height>`, and the small record (`record: "site-feedback"`) holds the view, the
route (`#/...`), the viewport (width, height, pixel ratio), light or dark, the browser and the time it was written.
It shares the 200-a-day limit and, offline or refused, waits on the device like a report. On phones it sits above the
bottom tab bar (or Play Mode's bar, or the builder's footer); in a Pits fight it is hidden, since Report fight and
Idea carry the fight record. A `[Site bug]` goes into `docs/auto-queue.md` as `QUEUED FOR CLAUDE`; a `[Site idea]`
goes under that file's Ideas for the owner.

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
