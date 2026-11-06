# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by ChatGPT (Chat), Combat Batch 2 source handoff_

## Priorities

**Owner direction, 2026-11-06:** after Subsystem 8's critical work, pause the remaining subsystem audits and overhaul Play Mode's usability. Play Mode should feel like a polished digital character sheet and table companion, closer to D&D Beyond but built on Mythras's mechanics: depth without clutter, short explanations, a clean, intentional design. This is not a restart of Practice Combat.

1. **Subsystem 8 critical work:** security fix merged (PR #130). Migration `20261106120000_gm_private_state_and_assignment_checks.sql` **ran successfully live** with an owner-private safety copy. Verification: table `campaign_gm_state`, 1 private row, 0 campaigns retaining old session state. Multi-account acceptance remains outstanding and was excluded from the latest owner-only session.
2. **Play Mode UX: done** (PRs #133–#137, then layout v2 from the owner's sketch: one-screen columns and a D&D Beyond-style side panel, 2026-11-06): layout, physics dice tray, combat flow, skill search and pins, Body tab, tips, Gear and Notes. The theme lives in `play-clean.css` under `data-pm-style="clean"`, so a future player style picker only swaps token sets. Owner-only live pass recorded in `docs/play-mode-live-acceptance-20261105.md`: desktop overflow and incomplete result compaction fail; numerical Core spot-checks pass; terminal Fatigue labels need correction. Exact 390px phone pass remains unverified (browser limitation).
3. **Now: resume subsystem audits:** **Subsystem 5 Combat Batch 2:** 85 additional source/case-status rows added to `docs/combat-cases-batch-1.md` in docs-only PR (branch `docs/combat-batch2-source-gaps-20261106`). Claude to review triage and fix narrowly scoped text/eligibility gaps first. Remaining 4, 6, 7, 8 not closed.

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Combat Batch 2 source gap inventory | ChatGPT (Chat) → Claude | `docs/combat-batch2-source-gaps-20261106` (docs-only PR) | **85 cases**: 26 printed Core traits plus extra metadata review, complete p.101 close/ranged p.108 tables and key SE, cover, reach and charge branches. Triage per row: HANDLED vs NEEDS CODE, no production changes. |
| Play Mode live re-check | ChatGPT (Work) | after the fixes PR | Retest: no page scroll at your desktop size; finished combat roll is one card with Attack again / Parry; Comatose/Dead wording; tabs on one line. Exact phone width: the owner checks on a real phone |
| Subsystem 8 live follow-up | Claude → ChatGPT (Work) | migration applied | GM tracker edit survived reload. Earlier notes-save observation needs a native-input reproduction before treating it as a confirmed app defect; simulated fill did not commit some onchange fields during later testing. Prior temporary tracker NPC remains from that stopped attempt. No private backup contents are in GitHub. |
| Multi-account permission check | ChatGPT (Work) | after the migration | Plan at the end of `campaign-cases-batch-1.md` |
| New-item pop-up live check (PR #128) | Owner → ChatGPT (Work) | PR #131 attempt | **Blocked, not failed:** needs a disposable player account signed in separately from the GM (e.g. a second browser profile or private window) with a character assigned to a campaign the GM runs. Then: Reveal and plain notices, reload, a third item while the player spends an AP |

## Waiting on someone

- **Owner:** confirm whether ranged weapons should offer Parry (Play Mode hides it; Core p.97 covers parrying ranged attacks with shields, not parrying with a bow); later, decisions D-S1 to D-S4 (Subsystem 8) and D-4, D-5 (Magic, low priority).
- **Claude:** review/merge the Combat Batch 2 docs-only PR after CI. Then use source table to make narrow code/test corrections: `Blind Fighting` (p.89 ignores penalty, not -1 grade), printed `Skirmishing` name (p.89), `Kill Silently` trait prerequisite (pp.89,97), `Weapon Malfunction` firearm-only (p.101), optional shorter-Reach reduction based on Reach-category difference (p.106), and p.108 range×target-SIZ table/guidance. Existing shield Parry button appears correct; live verification pending. No Practice Combat expansion.
- **ChatGPT (Chat):** next source batch only after Claude mapping/implementation handoff. Subsystem 4 optional extras and other open subsystems remain.

- **ChatGPT (Work):** retest the Play Mode fixes (owner checks phone width on a real phone). Multi-account and new-item checks still require separately authorized sessions/fixtures; latest instruction was owner-only, with no new accounts.

## Notes

- New Combat batch source checked against user's uploaded Core PDF, rendered printed pp.89,97–98,101–103,105–109. The 85 added rows **do not** claim CI/live passes; current app behavior was assessed from `js/data.js`, `js/play.js`, `js/render.js`, `js/engine.js` and `tests/combat-cases.cjs`. **3/8 retained; Subsystem 5 still open.**

- Combat live evidence (Creation Audit — Human, `71640fe7-…`): see `combat-cases-batch-1.md`. Fixture restored after each batch.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`).
- ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs; ChatGPT (Work) can run the tests.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
