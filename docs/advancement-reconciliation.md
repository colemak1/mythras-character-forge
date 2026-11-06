# Subsystem 4 — advancement, hazards and recovery reconciliation (initial pass)

**Date:** 2026-11-06. This is an **initial reconciliation**, not a new source audit or subsystem closeout. Authoritative rules are the privately supplied Mythras 2e Core (primarily pp.68–85). Source-case inventory: `docs/advancement-cases-batch-1.md` (**216 cases**). Completion criteria: `docs/subsystem-plan.md`.

| Scope | Existing status according to Claude mapping | Open reconciliation / evidence needed |
|---|---|---|
| Experience Rolls and improvement (`A4-X01–X20`) | Core skill/Passion improvement mechanics and CHA modifier implemented; XP spending has prior signed-in evidence. | Verify no double spending under reload; one Experience Roll per attempt and failures still +1%; source-check the optional **1d6+1** improvement choice as a **campaign option**, not a mandatory default. |
| Permanent vs ongoing characteristic training (`A4-C01–C16`) | Both rules paths implemented; recurring maintenance/atrophy and p.73 example are mapped. | Signed-in train/maintain/stop → new award → reload tests for each path, especially no advancement lost. |
| Skill training and Teach (`A4-T01–T20`) | Dice step table and Teach shifts covered; trainer exactly +20 uses 1d2 by owner ruling. | Live training+Teach boundary test and persistence, one skill at a time and proper Experience-Roll gate. |
| Passion additions (`A4-X18–X19`) | Passion changes manually/experience paths present; Weak/Moderate/Strong helper not implemented and optional. | Decide whether a very small player-facing intensity helper merits scope; GM adjudication is acceptable. |
| Ageing (`A4-AG01–AG17`) | Human ageing bands/record/undo covered with prior live checks; nonhuman ageing remains GM-assisted. | Batch boundary/reload check if later changes; do not apply human intervals to other species. |
| Fatigue (`A4-F01–F22`) | Active level grades, AP, initiative, Movement and cause-specific recovery guidance mapped; prior live pass covers grade effects. | Check Comatose/Dead no-action presentation after UX fixes and recovery causes (exertion vs blood loss/asphyxiation); avoid automatic MP restoration. |
| Healing and permanent injuries (`A4-H01–H30`) | Minor daily recovery and maiming max HP ruling implemented; Serious/Major guidance recorded. | One signed-in Serious/Major treatment confirmation, weekly/monthly interval and permanent-injury maximum HP persistence test; GM still adjudicates trauma. |
| Acid, falls, fire, suffocation, diseases, poisons, survival, weather, traps (`A4-HZ*`, `A4-D*`, `A4-S*`) | Hazard and illness rules are reference/GM-assisted; no full hazard simulation intended. | Verify page-cited guidance is complete and accurate; retain explicit exclusions rather than claiming automated disease/fall handling. |
| Luck and object damage (`A4-L*`) | Luck Point pool tracked; use adjudicated by GM, object HP handled manually. | One new-session refill after spending; object damage remains GM-assisted, equipment data under S3. |

## Proposed next source-and-live work

1. Reconcile current repo advancement mapping and mark each case as verified code, guidance, GM-assisted, decision or not implemented. No new code is requested in this docs pass.
2. In a later single-owner live Work pass on a disposable character, exercise **XP spend → training/Teach → one award → maintenance/atrophy → save/reload**, then **Serious/Major treatment and healing intervals** on a separate safe fixture. Use natural dice/manual inputs as appropriate; restore/delete fixtures.
3. Treat **optional** `1d6+1` improvement and Passion shift helper as separate owner decisions, not automatic blockers to finishing default Core playability. Record final choices in `docs/decisions.md` when approved.
4. Keep Subsystem 4 **OPEN** until source-to-app reconciliation, evidence, decisions and signed-in acceptance meet `docs/subsystem-plan.md`. **Progress stays 3/8** pending Combat closeout and advancement completion.

**Source:** the existing source-verified advancement ledger and reconciliation plan. This file does **not** claim independent re-verification of every hazard against rendered PDF pages.

## Claude review (2026-11-06)

**Tests:** every row that was "Pass (code)" now has a deterministic regression test. Most are in the new `tests/advancement-cases.cjs` (12 tests, fixed dice); ageing and characteristic training already had tests in `core-batch-1.cjs` and `campaign-setup.cjs`. No calculation errors were found.

**Before Subsystem 4 can close:**
1. **Owner decisions,** both optional:
   - Offer 1d6+1 skill improvement as a campaign option (X14)?
   - Add a small Weak/Moderate/Strong Passion shift helper (X19)?
   - "No" to either is a valid answer and is simply recorded.
2. **One owner-only Work pass on a disposable character:**
   - (a) Award rolls with characteristic training active: one roll is used to maintain it; stop training, award again, and it atrophies.
   - (b) Spend an Experience Roll on a fumbled skill: +1 is applied first.
   - (c) Train a skill with a mentor 25 points higher, then try to train again: blocked until an Experience Roll is spent.
   - (d) Learn a Professional Skill for 3 rolls.
   - (e) Serious and Major Wounds: weekly recovery; a Major Wound refuses monthly recovery until treatment is confirmed.
   - (f) Reload after each step.
3. **Hazards (HZ), diseases (D), survival (S):** these stay GM-assisted by design. Chat should confirm that the Play Mode hazard notes match Core pp.74–85, a docs-only check.

**Update (2026-11-06):** both owner decisions are done.
- X14: 1d6+1 is now an optional campaign rule.
- X19: the Passion shift helper was added.

Both have tests (`tests/advancement-options.cjs`). What remains for Subsystem 4 is the Work live pass (a)–(f), plus (g): with a campaign set to 1d6+1, a successful Experience Roll gains up to +7, and a Passion deepens by Weak 1d10. Chat's hazard-notes check is still open too.

