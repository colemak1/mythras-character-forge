# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by Claude_

## Priorities

**Owner direction, 2026-11-06:** after Subsystem 8's critical work, pause the remaining subsystem audits and overhaul Play Mode's usability. Play Mode should feel like a polished digital character sheet and table companion, closer to D&D Beyond but built on Mythras's mechanics: depth without clutter, short explanations, a clean, intentional design. This is not a restart of Practice Combat.

1. **Subsystem 8 critical work:** security fix merged (PR #130). Remaining: the owner runs migration `20261106120000_gm_private_state_and_assignment_checks.sql`, then ChatGPT (Work) does the multi-account check in `campaign-cases-batch-1.md`.
2. **Play Mode UX:** audit and redesign proposal ready for owner review (`docs/play-mode-ux-proposal.md`; full version with mockups shared with the owner). **No redesign code until the owner approves.** Then implement in five batches, preserving the rules engine, data and working features.
3. **Then resume subsystem audits:** 4 (Advancement optional extras), 5 (Combat ledger gaps), 6 (Magic), 7 (Creatures and GM procedures), 8 (non-critical items and decisions D-S1 to D-S4).

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Play Mode UX proposal | Owner | `docs/play-mode-ux-proposal.md` | Waiting for the owner's answers to the five questions |
| Run Subsystem 8 migration | Owner | `supabase/migrations/20261106120000_…` | Supabase → SQL Editor → paste → Run |
| Multi-account permission check | ChatGPT (Work) | after the migration | Plan at the end of `campaign-cases-batch-1.md` |
| New-item pop-up live check (PR #128) | ChatGPT (Work) | — | GM gives items with and without Reveal; player sees each once; survives reload |

## Waiting on someone

- **Owner:** approve or adjust the Play Mode proposal; run the migration; later, decisions D-S1 to D-S4 (Subsystem 8) and D-4, D-5 (Magic, low priority).
- **ChatGPT (Chat):** nothing new until the redesign is approved. Optional: review `docs/play-mode-ux-proposal.md` from a new player's point of view and suggest changes in a docs-only PR.

## Notes

- Combat live evidence (Creation Audit — Human, `71640fe7-…`): see `combat-cases-batch-1.md`. Fixture restored after each batch.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`).
- ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs; ChatGPT (Work) can run the tests.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
