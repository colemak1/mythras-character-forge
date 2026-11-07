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

## Play Mode hazard note source review (ChatGPT, 2026-11-06)

Read `docs/advancement-hazard-notes-review.md` for a page-verified audit of the actual Body → Hazards popup. The review covers Acid (printed Core p.68), asphyxiation/blood loss (p.71), disease and poison (pp.74–75), falls/sleep (p.78), fire/exertion (p.79) and healing (p.80). Its compact wording recommendations remain GM-assisted and do not request automated hazard timers. Claude to review and, if approved, fix prose in a separate code PR. This source review does **not** count as the still-outstanding owner-only live Subsystem 4 pass or optional owner decisions. **Progress 4/8.**


## Owner-only live evidence — 2026-11-06

Requested Claude-review steps **(a)–(f) all PASS**: [full live report and screenshot](advancement-live-acceptance-20261106.md). One disposable character; no accounts created or campaign rules changed. Immediate reloads use the offered same-owner recovery draft; final account reopen confirms correct skills, pool and wounds. Natural Experience Rolls **76** and **54**; pool ends **2**, Athletics **54%**, newly learned Acrobatics **28%**. Serious Chest −2→0 over one week; Major Arm −5 unchanged without treatment, −3 after confirmed monthly treatment. Disposable deleted and absence checked after reload; all **32** local scripts pass.

The later-added campaign-option **(g)** was outside the owner's requested (a)–(f) pass and remains unverified. Retain Subsystem 4 OPEN and overall **4/8** pending Claude's remaining-gate review; this is not a new full source audit or automatic closeout.

## Claude closeout gate review (2026-11-07)

Merged #164: steps (a)–(f) pass, with reload and account reopen. Chat's hazard-notes audit (#161) is implemented and tested (#163, `tests/hazard-notes.cjs`). Both optional owner decisions are done (X14, X19). The remaining Subsystem 4 gaps all need a live check, so **one last focused owner-only Work pass** closes it:

- **(g) Campaign options:** a disposable campaign set to 1d6+1 skill improvement (Campaign rules), with a disposable character assigned. A successful Experience Roll gains 2–7; the result text says 1d6+1. Then use the Passion helper: Weak deepen is 1d10; wane stops at 0. Reload; values persist. Set the campaign back or delete it.
- **(h) Permanent injury:** record a maiming on a location; its maximum HP is lowered and survives reload.
- **(i) Luck refill:** spend a Luck Point, then Advance Time → New session; the pool refills to its maximum.
- Glance at Body → Hazards and recovery: acid, fall and fire tables are present (Core pp.68, 78, 79).

If (g)–(i) pass, Claude closes Subsystem 4 (**4/8 → 5/8**). Everything else in the table above is GM-assisted by design or already has passing evidence.


## Final focused owner-only live evidence — 2026-11-06

Steps **(g)–(i) PASS** and hazard tables present: [detailed observations and limitations](advancement-final-live-20261106.md). Optional campaign 1d6+1: natural ER 66 + INT16 versus Willpower24 gained +6→30; formula visible in instructions. Weak Passion deepen +1; wane reached 0 and stayed 0. Reload retained values. Maiming maximum Right Arm4→2 survived reload and saved account reopen. Luck1/2→2/2 via Start a new session, retained on reopen. Character deleted/reload verified; campaign delete accepted, but final saved absence unverified after environment reset. Screenshot removed by workspace maintenance. 33 current local scripts pass; no code changed. These are pre-Stone deployment observations (`play.js?v=74f8277601`, `app.js?v=56de852493`), not acceptance of the later UI. Claude to decide closeout; **4/8 pending that decision**.

## Claude closeout decision (2026-11-07): Subsystem 4 CLOSED, progress 5/8

Reviewed #172. Steps (g)–(i) pass with clear observations:
- **(g)** A +6 Experience Roll gain is only possible under the campaign's 1d6+1 option (the default 1d4+1 tops out at +5), so the option demonstrably applied. Passion Weak shift and the 0 floor held through reload.
- **(h)** The maiming maximum (Right Arm 4 → 2) survived reload and account reopen.
- **(i)** A new session refilled Luck 1/2 → 2/2.

Together with (a)–(f) in #164, every live gate in the closeout review is met. The remaining rows are GM-assisted by design or covered by regression tests.

**Accepted limitations:**
1. **Campaign cleanup:** the disposable campaign's deletion was submitted but not re-checked after a browser reset. This is test-data cleanup, not Subsystem 4 behaviour; the owner checks the campaign list and deletes **Disposable S4 Final Campaign** if it is still there. Campaign deletion itself belongs to Subsystem 8.
2. **Pre-Stone UI:** the passes ran before the Stone layout. That layout changed presentation only: the advancement code paths (Improve Skills, Advance time, location maximum, Luck) are unchanged and their tests still pass. The Stone walkthrough stays a separate pending live check.
3. **Formula placement:** "1d6+1" appears in the Improve Skills instructions, not on each history line. That is acceptable as is.


## New Stone deployment focused pass — 2026-11-06

**(g)–(i) PASS again**, with hazard tables and requested new desktop controls: [full report and three screenshots](advancement-stone-live-20261106.md). Natural ER17+INT16 versus24 gained+3→Willpower27; Weak Passion+1 then floor0; reload/history retained. Maiming Arm4→2 persisted; Luck1/2→2/2 via new session and saved account reopen. Settings colour switch, Athletics description and natural Dagger16 Success→Impale→Roll damage4/RightLeg all worked. No Critical occurred; equal Impale totals/DM0 limit this arithmetic spot-check. Both fixtures deleted/reload verified; previous #172 campaign absent too. All33 local scripts pass. play.js56772afe28/app.js9772b7a37c. UI observations and scope limits in report. Claude closed S4 in #173 during this follow-up; retain CLOSED and5/8. This adds newer presentation evidence and resolves the cleanup limitation.
