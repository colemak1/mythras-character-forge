# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by Claude_

## Priorities

**Owner direction, 2026-11-06:** after Subsystem 8's critical work, pause the remaining subsystem audits and overhaul Play Mode's usability. Play Mode should feel like a polished digital character sheet and table companion, closer to D&D Beyond but built on Mythras's mechanics: depth without clutter, short explanations, a clean, intentional design. This is not a restart of Practice Combat.

1. **Subsystem 8 critical work:** security fix merged (PR #130). Migration `20261106120000_gm_private_state_and_assignment_checks.sql` **ran successfully live** with an owner-private safety copy. Verification: table `campaign_gm_state`, 1 private row, 0 campaigns retaining old session state. Multi-account acceptance remains outstanding and was excluded from the latest owner-only session.
2. **Play Mode UX: done** (PRs #133–#137, then layout v2 from the owner's sketch: one-screen columns and a D&D Beyond-style side panel, 2026-11-06): layout, physics dice tray, combat flow, skill search and pins, Body tab, tips, Gear and Notes. The theme lives in `play-clean.css` under `data-pm-style="clean"`, so a future player style picker only swaps token sets. Owner-only live pass recorded in `docs/play-mode-live-acceptance-20261105.md`: desktop overflow and incomplete result compaction fail; numerical Core spot-checks pass; terminal Fatigue labels need correction. Exact 390px phone pass remains unverified (browser limitation).
3. **Subsystem 5 Combat closeout:** #154 deployed and the ONE final owner-only fight completed. **Steps 1–7 PASS; step 8 FAIL**: top-bar End fight clears initiative but leaves AP spent and own Surprised true; Advance time → End the fight correctly resets all three. Surprise target box passes exactly +1 SE (natural 33 Success vs No defence: 1→2), own flag unchanged, later bow 19 gets only 1 SE. See `docs/combat-final-fight-20261106.md` for exact dice, stamps, evidence and scope limits (MP was full). Throwaway deleted/reload verified; 29 local scripts pass. Claude to resolve the narrow End fight inconsistency. **Subsystem 5 OPEN; progress 3/8.**

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Combat final integrated acceptance | ChatGPT (Work) → Claude | #154 tested; docs PR follows | One fight completed, steps 1–7 PASS; step 8 FAIL for top-bar End fight AP/Surprised reset. Full report + screenshots in `docs/combat-final-fight-20261106.md`. Disposable deleted and reload checked. |
| Advancement reconciliation (start) | ChatGPT (Chat) → Claude | `docs/advancement-reconciliation.md` in same docs-only PR | Existing 216-case inventory summarized against `docs/subsystem-plan.md`. Training/passion/recovery live gaps and two optional choices remain; Subsystem 4 OPEN. |
| Combat Batch 3 focused acceptance | ChatGPT (Work) → Claude | #150 verified; docs PR follows | All 4 groups PASS. Earlier Knockback failure retracted; no extra starting metre. Screenshot confirms table fit. Throwaway deleted/reload checked; 28 scripts pass. |
| Combat Batch 2 live acceptance | ChatGPT (Work) → Claude | PR #144 verified; docs PR follows | All five requested check groups passed. Evidence and fumble-scope caveat: `docs/combat-batch2-live-acceptance-20261106.md`. Disposable fixture deleted; absence confirmed after reload. All 27 local test scripts passed. No code changed. |
| Play Mode live re-check | ChatGPT (Work) | after the fixes PR | Retest: no page scroll at your desktop size; finished combat roll is one card with Attack again / Parry; Comatose/Dead wording; tabs on one line. Exact phone width: the owner checks on a real phone |
| Subsystem 8 live follow-up | Claude → ChatGPT (Work) | migration applied | GM tracker edit survived reload. Earlier notes-save observation needs a native-input reproduction before treating it as a confirmed app defect; simulated fill did not commit some onchange fields during later testing. Prior temporary tracker NPC remains from that stopped attempt. No private backup contents are in GitHub. |
| Multi-account permission check | ChatGPT (Work) | after the migration | Plan at the end of `campaign-cases-batch-1.md` |
| New-item pop-up live check (PR #128) | Owner → ChatGPT (Work) | PR #131 attempt | **Blocked, not failed:** needs a disposable player account signed in separately from the GM (e.g. a second browser profile or private window) with a character assigned to a campaign the GM runs. Then: Reveal and plain notices, reload, a third item while the player spends an AP |

## Waiting on someone

- **Owner:** later, decisions D-S1 to D-S4 (Subsystem 8) and D-4, D-5 (Magic, low priority).
- **ChatGPT (Work):** focused step-8 re-check only (see the fix PR): with AP spent and own Surprised ticked, the initiative End fight button restores AP, clears Surprised and initiative; Advance time → End the fight does the same. Reopen the character to confirm.
- **Claude:** if the step-8 re-check passes, record closeout evidence and recommend closing Subsystem 5 (3/8 → 4/8); then review `docs/advancement-reconciliation.md`.
- **ChatGPT (Chat):** Combat closeout map and missing child cases delivered in docs-only PR; `docs/advancement-reconciliation.md` begins Subsystem 4. Further S4 source/test reconciliation follows Claude's Combat closeout review.


## Notes

- Combat closeout mapping verified against privately uploaded Core printed pp.86–111 (parsed text first; difficult tables/pages visually inspected). Added 12 C5-CL case rows, **6 HANDLED / 6 NEEDS CODE**, and one final owner-only Work fight scenario. Source/JS review is not a deployed PASS. User settled Knockback with **no extra initial metre**. Creature anatomy/Rabble-Underlings remain S7; multi-account/GM/Party Board remain S8. Reconciliation started in `docs/advancement-reconciliation.md`. **3/8 unchanged.**
- Combat Batch 3 checked the user's uploaded Mythras 2e Core source directly (text search first, rendered printed pp.61–65 and 96–110 for tables and special cases) and reviewed current source code after #146. **92 new specification rows**, not live implementation evidence; added to the existing ledger without changing previous acceptance. **Creature anatomy excluded**, for Subsystem 7. Total Combat ledger now **368** cases (191 + 85 + 92). Status is initial and may need Claude adjudication. No production code or tests were changed by ChatGPT. CI pending.
- New Combat batch source checked against user's uploaded Core PDF, rendered printed pp.89,97–98,101–103,105–109. The 85 added rows **do not** claim CI/live passes; current app behavior was assessed from `js/data.js`, `js/play.js`, `js/render.js`, `js/engine.js` and `tests/combat-cases.cjs`. **3/8 retained; Subsystem 5 still open.**

- Combat live evidence (Creation Audit — Human, `71640fe7-…`): see `combat-cases-batch-1.md`. Fixture restored after each batch.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`).
- ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs; ChatGPT (Work) can run the tests.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
