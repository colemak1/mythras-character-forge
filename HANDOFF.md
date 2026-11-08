# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md`).

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item. Branch: claude/happy-brahmagupta-votbg4.

_Last updated: 2026-11-08 by Claude (#219 review fixes: N07 confirmed rank, N09 Core rank names; docs #220 merged)_

## Where things stand

- **Progress 5/8** (`docs/subsystem-plan.md`). Subsystems 1–5 closed; Main Play Mode Combat stays CLOSED. Next audits when the owner resumes them: 6 Magic (low priority), 7 Creatures, 8 Campaign/multi-account (D-S1–D-S4 implemented; DB permission tests in CI; signed-in live check remains).
- **Play Mode:** v0 "Stone & Verdigris" look, nine colour schemes (`play-stone.css`), item search, Core-only traits. Nothing waiting on a live check.
- **Home and menus:** owner's redesign handoff Part A done (#197–#201): shared page header, phone tab bar and More sheet, sign-in gates, Home Continue card and character cards, Characters search/sort/Undo delete, Campaign cards and Join with a code, The Pits lobby, Rules table of contents, World Guide chips, Account tabs and profile. Styles in `sitota-menus.css`; tests in `tests/site-menus.cjs`.
- **The Pits** (`experiments/practice-combat.html`, route `#/the-pits`):
  - Rules from ChatGPT's reviews implemented through #191: parry rounding (blocked half rounds up), Knockback, Impale, Barbed, Reach, Entangle (original-roll Trip), Entrapping, Disarm STR limit, Acrobatics vs Trip, concurrent tied Initiative, shield strikes and shield Bash. Ledger: `docs/the-pits-combat-procedure-review.md`.
  - v0 fight screen done (#193–#195, fixes #202): Stone look, view adapter `experiments/pits-view.js`, game layer `experiments/pits-game.js` (Glory, Momentum, Marks: presentation only, never rules).
  - **Melee only (owner, 2026-11-07).** All 35 Core melee weapons and 8 shields playable; saved characters can use any weapon their style trains, carried or not (#205). Ranged was built and removed (#206 reverted); its spec `docs/the-pits-ranged-cases.md` is shelved. Lance and Garrotte unsupported.

## Next

- **Owner (first):** run `supabase/migrations/20261108130000_display_names_signed_in_only.sql` once in the Supabase SQL editor (safe to re-run). It implements D-S3 option A: signed-in users read only display names; signed-out visitors read no profiles. (The D-S1/D-S2/D-S4 migration `20261108120000_…` is already run.)
- **Owner:** the signed-in live checks need disposable accounts that Work can't create (its browser forbids automated sign-up). Either create 3–4 test accounts and give Work their sign-ins, or run steps 8–10 of the plan in `campaign-cases-batch-1.md` yourself with two browsers. The database side of steps 1–6, 8 and 10 and of D-S3 is now covered by `tests/db/permissions.cjs` (CI), against a stand-in schema.
- **ChatGPT (Work), when accounts exist:** multi-account steps 1–10 plus D-S3 (as an outsider, other users' names show and nothing else); new-item pop-up; signed-in Play Mode item search and 26 Core traits; Undo delete and Join with a code. Signed out or standalone: The Pits terminal recap timing (play a bout to Victory/Defeat) and recheck the initiative strip, fixed in the D-S3 PR. Record in `docs/live-batch-pr209-20261107.md` or a new dated file. Real phone and audible sound stay blocked unless the owner can check them.
- **ChatGPT (Chat):** completed one static review of merged #221: N07 confirmed-rank gate, N09 Core rank names and GM-adjudicated overflow, N06 D-4 policy labelling all pass scoped review. Recorded in `docs/magic-prioritized-build-spec.md`; no independent tests/live acceptance. Magic P2 and D-4/D-5 remain open.
- **ChatGPT (Work), with the live batch:** Magic Audit fixture: Combine 1 asks for a second spell and shared targets; Talent blocked until "Learned" is ticked; add a second cult pool, check combined POW cap, that each miracle asks for its cult, that a miracle spends only its own pool, and that the wrong cult is rejected; a miracle above its pool rank, or with no confirmed rank, is refused; Animist rank (Follower…High Shaman) limits binding and needs a recorded bargain or Spirit Combat.
- **Claude, next code batch:** Magic P2 (MAG-N11–N13) waits for owner priority and D-4/D-5. Otherwise Creatures B01–B05 (`docs/creature-cases-batch-1.md`); B04 needs the nonhuman hit-location tables (Core pp.276–277): the owner uploads the rulebook, or ChatGPT adds the ranges to the spec. Pits Unarmed only if the owner asks. Split `experiments/practice-combat.html`'s very long lines when next touching it.
- **Owner, later:** D-4 and D-5 (Magic, low priority). Settings → General → "Allow auto-merge" if not on yet.

## Notes

- The owner uploads the Core rulebook (and the Companion) to Claude sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
