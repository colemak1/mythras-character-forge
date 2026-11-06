# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by Claude_

## Priorities

**Owner direction, 2026-11-06:** after Subsystem 8's critical work, pause the remaining subsystem audits and overhaul Play Mode's usability. Play Mode should feel like a polished digital character sheet and table companion, closer to D&D Beyond but built on Mythras's mechanics: depth without clutter, short explanations, a clean, intentional design. This is not a restart of Practice Combat.

1. **Subsystem 8 critical work:** security fix merged (PR #130). Remaining: the owner runs migration `20261106120000_gm_private_state_and_assignment_checks.sql`, then ChatGPT (Work) does the multi-account check in `campaign-cases-batch-1.md`.
2. **Play Mode UX: done** (PRs #133–#137, then layout v2 from the owner's sketch: one-screen columns and a D&D Beyond-style side panel, 2026-11-06): layout, physics dice tray, combat flow, skill search and pins, Body tab, tips, Gear and Notes. The theme lives in `play-clean.css` under `data-pm-style="clean"`, so a future player style picker only swaps token sets. Next: a ChatGPT (Work) live pass on the new Play Mode, batched with the other live checks.
3. **Now: resume subsystem audits:** 4 (Advancement optional extras), 5 (Combat ledger gaps), 6 (Magic), 7 (Creatures and GM procedures), 8 (non-critical items and decisions D-S1 to D-S4).

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Play Mode live check | ChatGPT (Work) | after #137 deploys | Signed in, desktop and phone width: each tab; Attack → opponent result → choose effects; pin a skill and reload; tips open on tap; dice tray shows and closes |
| Run Subsystem 8 migration | Owner | `supabase/migrations/20261106120000_…` | Supabase → SQL Editor → paste → Run |
| Multi-account permission check | ChatGPT (Work) | after the migration | Plan at the end of `campaign-cases-batch-1.md` |
| New-item pop-up live check (PR #128) | Owner → ChatGPT (Work) | PR #131 attempt | **Blocked, not failed:** needs a disposable player account signed in separately from the GM (e.g. a second browser profile or private window) with a character assigned to a campaign the GM runs. Then: Reveal and plain notices, reload, a third item while the player spends an AP |

## Waiting on someone

- **Owner:** run the migration; confirm whether ranged weapons should offer Parry (Play Mode hides it; Core p.97 covers parrying ranged attacks with shields, not parrying with a bow); later, decisions D-S1 to D-S4 (Subsystem 8) and D-4, D-5 (Magic, low priority).
- **ChatGPT (Chat):** audits resume. Next case batch: Subsystem 5 (Combat) open gaps in `combat-cases-batch-1.md`, as a docs-only PR. Optional: Subsystem 4 Advancement extras (1d6+1 option, Passion helper) as owner-decision notes.
- **ChatGPT (Work), when credits return:** one batched session: Play Mode live check, the multi-account check (after the migration), and the new-item pop-up check.

## Notes

- Combat live evidence (Creation Audit — Human, `71640fe7-…`): see `combat-cases-batch-1.md`. Fixture restored after each batch.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`).
- ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs; ChatGPT (Work) can run the tests.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
