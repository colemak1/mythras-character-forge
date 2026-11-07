# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-07 by ChatGPT (Chat) — The Pits Unarmed source cases and shield-convention review_

## Priorities

**Owner direction, 2026-11-06:** after Subsystem 8's critical work, pause the remaining subsystem audits and overhaul Play Mode's usability. Play Mode should feel like a polished digital character sheet and table companion, closer to D&D Beyond but built on Mythras's mechanics: depth without clutter, short explanations, a clean, intentional design. This is not a restart of Practice Combat.

1. **Subsystem 8 critical work:** security fix merged (PR #130). Migration `20261106120000_gm_private_state_and_assignment_checks.sql` **ran successfully live** with an owner-private safety copy. Verification: table `campaign_gm_state`, 1 private row, 0 campaigns retaining old session state. Multi-account acceptance remains outstanding and was excluded from the latest owner-only session.
2. **Play Mode UX: done**, now in the v0 "Stone & Verdigris" look (2026-11-07; earlier: PRs #133–#137, then layout v2 from the owner's sketch: one-screen columns and a D&D Beyond-style side panel, 2026-11-06): layout, physics dice tray, combat flow, skill search and pins, Body tab, tips, Gear and Notes. The theme lives in `play-clean.css` under `data-pm-style="clean"`, so a future player style picker only swaps token sets. Owner-only live pass recorded in `docs/play-mode-live-acceptance-20261105.md`: desktop overflow and incomplete result compaction fail; numerical Core spot-checks pass; terminal Fatigue labels need correction. Exact 390px phone pass remains unverified (browser limitation).
3. **Subsystem 4 Advancement: CLOSED (#173); Subsystem 5 Combat: CLOSED. Progress 5/8.** Fresh new-Stone owner pass also confirms (g)–(i), hazards and requested desktop controls: `docs/advancement-stone-live-20261106.md` (three screenshots). Both fixtures deleted/reload verified; #172 campaign also absent. Next subsystem audits: 6 (Magic, low priority per owner), 7 (creatures), 8 (campaign/multi-account; critical items done).

**Practice Combat is active again (owner, 2026-11-07):** rules first, then every weapon (done: shared table), then a Play Mode-style UI, then the fun polish. Progress **5/8**.

**Current Pits rule-check handoff:** Original **51** cases plus **28** Initiative/Shield child cases and **44** new Unarmed child cases are in `docs/the-pits-combat-procedure-review.md` (**123** entries including existing parent rows). #190 tied Initiative and #191 shield attack/Bash **merged**; #188 Entangle correction retained. **New Unarmed cases are source specs, not implemented or live-accepted.** Main Play Mode Combat **Subsystem 5 CLOSED**; total **5/8**.

## In progress

Four extra Play Mode palettes (War Room, Night Watch, Ivory & Ink, Deep Cypress) merged in #186. Progress 5/8 unchanged.

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| The Pits Unarmed P2 source-case specs | ChatGPT (Chat) → Claude | `docs/pits-unarmed-grip-flurry-take-weapon-cases-20261107` docs-only PR | **44** deterministic Core-cited PIT-SE03 cases: unarmed strike/parry, Grip vs full Grappling, Flurry, Take Weapon, effect eligibility and two-human arena scope. Three PR #191 shield conventions verified; Target left-embedded unavailable-for-bout explicitly **arena deviation** from recoverable Core p.97. **S5 CLOSED, 5/8**. |
| Item search / Core traits source review | ChatGPT → Claude | `docs/item-traits-source-review` docs-only PR | **PASS:** 5 ammo bundles (p.62), 8 armour per-location AP/ENC/cost rows (p.58), all 26 offered trait names/descriptions (p.89; Skirmishing cap p.108). `docs/item-search-core-cases.md`. Optional Lead sling label; printed Mail5-per-location/30-suit inconsistency documented. 34 scripts pass; no code changes;5/8 retained. |
| New desktop live acceptance | ChatGPT (Work) → Claude | #174 merged | All checks PASS. Its three UI observations are fixed in the follow-up PR: campaign picker refresh, tabs on one line, damage dice in the tray. |
| Skill summary + damage helper Core audit | ChatGPT (Chat) → Claude | `docs/play-skill-info-damage-core-review` (docs-only PR) | All **58** `SKILL_INFO` entries and all **10** damage cases source checked. Corrections: 3 substantive skill summaries, 2 magic citations; **R6, R7, R8** code/copy fixes. No tests or app code changed. Keep progress **4/8**. |
| Play Mode hazard/recovery wording audit | ChatGPT (Chat) → Claude | `docs/subsystem4-hazard-note-source-review-20261106` docs-only PR | Audited printed Core pp.68,71,74–85. `docs/advancement-hazard-notes-review.md` identifies incorrect/ambiguous or absent popup phrasing with compact suggested copy. **All treatment/damage decisions remain GM-assisted; no production code or tests edited.** |
| Combat Batch 3 focused acceptance | ChatGPT (Work) → Claude | #150 verified; docs PR follows | All 4 groups PASS. Earlier Knockback failure retracted; no extra starting metre. Screenshot confirms table fit. Throwaway deleted/reload checked; 28 scripts pass. |
| Combat Batch 2 live acceptance | ChatGPT (Work) → Claude | PR #144 verified; docs PR follows | All five requested check groups passed. Evidence and fumble-scope caveat: `docs/combat-batch2-live-acceptance-20261106.md`. Disposable fixture deleted; absence confirmed after reload. All 27 local test scripts passed. No code changed. |
| Play Mode live re-check | ChatGPT (Work) | after the fixes PR | Retest: no page scroll at your desktop size; finished combat roll is one card with Attack again / Parry; Comatose/Dead wording; tabs on one line. Exact phone width: the owner checks on a real phone |
| Subsystem 8 live follow-up | Claude → ChatGPT (Work) | migration applied | GM tracker edit survived reload. Earlier notes-save observation needs a native-input reproduction before treating it as a confirmed app defect; simulated fill did not commit some onchange fields during later testing. Prior temporary tracker NPC remains from that stopped attempt. No private backup contents are in GitHub. |
| Multi-account permission check | ChatGPT (Work) | after the migration | Plan at the end of `campaign-cases-batch-1.md` |
| New-item pop-up live check (PR #128) | Owner → ChatGPT (Work) | PR #131 attempt | **Blocked, not failed:** needs a disposable player account signed in separately from the GM (e.g. a second browser profile or private window) with a character assigned to a campaign the GM runs. Then: Reveal and plain notices, reload, a third item while the player spends an AP |

## Waiting on someone

- **Claude:** P2 Initiative #190 and Shield Bash #191 merged. Review/merge new **docs-only PIT-SE03 source-spec PR** after Tests passes, then implement Unarmed Attack/Parry, Grip, separate full Grapple if in scope, Flurry and Take Weapon with deterministic tests in focused code PRs. Preserve #188, #190 and #191. After rules, proceed with owner-approved v0 Pits fight-screen design. **The Pits UI:** step 1 (Stone look, v0 layout) merged in #193; steps 2 and 4 (view adapter, phase pill, disabled reasons, roll readout, odds bar) merged in #194; steps 3 and 5 (chronicle stamps, game layer `experiments/pits-game.js`, recap, hit feel, sound, Stone end-of-bout dialogs; `tests/pits-game.cjs`) in the follow-up PR. Then: ChatGPT (Work) live check of the whole new Pits UI, and Unarmed (PIT-SE03) rules.
- **ChatGPT (Chat):** 44 PIT-SE03 rule cases and three shield-convention verdicts delivered in docs-only PR; no code edits. Available for later source disputes or a bundled live-test spec once Claude implements them.

- **ChatGPT (Work):** (source review #179 passed) owner-only live check on a disposable character:
  - Inventory → Add an item: search "sword" and add it (free), then confirm it appears on the Combat tab and attacks;
  - tick Paid for it and add rope: silver goes down by 10;
  - add a mail location: ENC up 5, worn AP unchanged;
  - reload and confirm all of it is kept;
  - builder Combat Style: only 26 Core traits offered.
  Delete the fixture afterwards.

- **Owner:** later, decisions D-S1 to D-S4 (Subsystem 8) and D-4, D-5 (Magic, low priority).
- **Cleanup resolved (Work):** #172 Disposable S4 Final Campaign absent from owner list; new Stone character and campaign both deleted and absent after reload.
- **v0 (design):** delivered the "Stone & Verdigris" Play Mode design; Claude built it (this PR: `play-stone.css`, five colour schemes, contour body figure, four-step combat bar, five phone sections; physics dice docked in the side panel per owner). Next v0 brief only when the owner wants another screen.
- **Done (Claude):** #170 merged; R6/R7/R8 and the five skill-summary corrections implemented with tests (see the end of `docs/play-mode-damage-roll-cases.md`).
- **Done (Work, #174):** new desktop Play Mode walkthrough passed; Claude fixed its three UI observations. Nothing in Play Mode is waiting on a live check.
- **Hazard notes:** done (#161 audit, #163 implementation and tests).
- **ChatGPT (Chat):** Combat closeout map and missing child cases delivered in docs-only PR; `docs/advancement-reconciliation.md` begins Subsystem 4. Further S4 source/test reconciliation follows Claude's Combat closeout review.


## Notes

- **Current Pits source handoff (2026-11-07):** owner-uploaded Mythras Core **pp.9,43,89,91–92,95,97–98,100–101,105–106**, plus **p.222 for human fists/parry distinction**, checked on rendered printed pages. **44 new** `PIT-SE03-*` specs; **Grip SE p.97 ≠ full Grappling p.106**. Shield conventions #191: Short Reach source-compatible (pp.63,106); AI's better Hard Athletics/Acrobatics for Bash obstacle permitted as choice (p.96); Target shield lost for entire bout is **an arena-only restriction**, because Core p.97 allows later withdrawal. Rulings in `docs/decisions.md` and `docs/the-pits-combat-procedure-review.md`. No test/live claim, **S5 CLOSED / 5/8**.


- Source audit of PR #168 `SKILL_INFO` and new damage helper: original Core printed pp.38–50, p.9, pp.94–98,109–110, plus p.121 Folk Magic and pp.178/181 Exhort. R6: **Maximise Damage does apply to natural weapons**; R7: Impale rolls *weapon dice twice*, adds Damage Modifier *once*, must show chosen roll's total; R8: Choose Location should override d20. R1 parry and R4 zero floor confirmed. Full work in `docs/play-mode-skill-info-source-review.md` / `docs/play-mode-damage-roll-cases.md`. **Docs-only, no live/test pass, 4/8 unchanged**.
- S4 hazard popup source review uses privately supplied Core, printed **p.68 for Acid**, **p.71** for suffocation/blood loss, **pp.74–75** for disease/poison, **p.78** for falls/sleep, **p.79** for fire/exertion, **p.80** for healing. The current `pmHazardsHTML()` text is mostly accurate but lacks crucial table/exception reminders. Review: `docs/advancement-hazard-notes-review.md`. Claude may make **wording-only code corrections in a separate PR**. Core hazard automation remains GM-assisted and Subsystem 4 remains open, progress 4/8.
- Combat closeout mapping verified against privately uploaded Core printed pp.86–111 (parsed text first; difficult tables/pages visually inspected). Added 12 C5-CL case rows, **6 HANDLED / 6 NEEDS CODE**, and one final owner-only Work fight scenario. Source/JS review is not a deployed PASS. User settled Knockback with **no extra initial metre**. Creature anatomy/Rabble-Underlings remain S7; multi-account/GM/Party Board remain S8. Reconciliation started in `docs/advancement-reconciliation.md`. **3/8 unchanged.**
- Combat Batch 3 checked the user's uploaded Mythras 2e Core source directly (text search first, rendered printed pp.61–65 and 96–110 for tables and special cases) and reviewed current source code after #146. **92 new specification rows**, not live implementation evidence; added to the existing ledger without changing previous acceptance. **Creature anatomy excluded**, for Subsystem 7. Total Combat ledger now **368** cases (191 + 85 + 92). Status is initial and may need Claude adjudication. No production code or tests were changed by ChatGPT. CI pending.
- New Combat batch source checked against user's uploaded Core PDF, rendered printed pp.89,97–98,101–103,105–109. The 85 added rows **do not** claim CI/live passes; current app behavior was assessed from `js/data.js`, `js/play.js`, `js/render.js`, `js/engine.js` and `tests/combat-cases.cjs`. **3/8 retained; Subsystem 5 still open.**

- Combat live evidence (Creation Audit — Human, `71640fe7-…`): see `combat-cases-batch-1.md`. Fixture restored after each batch.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`).
- ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs; ChatGPT (Work) can run the tests.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
