# Mythras Forge — Master Core Rules Correction Checklist

**Master backlog v1.0 · October 27, 2026**  
**Repository:** https://github.com/colemak1/mythras-character-forge  
**Audited `main` commit:** `6d2e63918276371c5cdd562b6b84c8e7695dc74d` (**confirmed unchanged during consolidation**)  
**Rules authority:** the user's uploaded *Mythras 2e Core Rulebook*; page numbers below are the **printed** page numbers.  
**Scope:** the four completed static audit handoffs, deduplicated and reprioritized.  
**Status:** planning/handoff only. No code changed or tests run during this consolidation.

## Current implementation status — baseline reconciliation

The original audit findings below describe the audited snapshot, not necessarily current behaviour. The following reflects merged work through PR #55 plus the wound-incident change in this branch. “Partial” means the listed remainder is still open, not that the whole rule has been verified in production.

| Items | Status | Remaining work |
|---|---|---|
| MCR-05, 06, 09, 27, 28 | Implemented in PR #30 | Signed-in production verification and full rules coverage remain. |
| MCR-10, 17 | Minimum guidance implemented in PR #30 | Source-specific recovery workflow and optional parry assistance remain. |
| MCR-01–03 | Implemented in PR #34, verification incomplete | Shaping rounding beyond the printed example and combined-spell circumstances need review. |
| MCR-04, 07 | Partially addressed in PR #41 | Check remaining rounding boundaries and specialist Folk allowance. |
| MCR-11 | Implemented in PR #42 | Real-character production verification remains. |
| MCR-12 | Partially implemented in PR #48 | Fractional rounding and separate multiple-cult pools remain GM-managed. |
| MCR-08 | Partial: ageing review guidance in PR #49 | Checks and characteristic changes are not automated; GM review and production verification remain. |
| MCR-13 | Partially implemented in PRs #45 and #55 | Category costs implemented; rounding, interruption and signed-in persistence remain. |
| MCR-15 | Guidance in PR #44 | Creation-mode distinction, prerequisites and GM override remain. |
| MCR-23 | Partially implemented in PR #43 | Passion fumble tracking, XP-based reductions and real-account verification remain. |
| MCR-14, 18, 22, 26 | Partial or open | Check current implementation and Core; remaining prerequisites, combat, lasting injury and characteristic advancement need work. |
| MCR-16 | Independent armour locations in PR #50 | Signed-in migration verification remains. |
| MCR-19 | Assisted contested-roll calculator in PR #52 | Applying results to combat remains manual. |
| MCR-20 | Recovery assistance in PR #51 | Elapsed time and some healing modifiers remain manual. |
| MCR-21 | Wound incident tracking in this branch | Conditions, direct-damage events and real-account verification remain. |
| MCR-24 | Professional-skill learning in PR #53 | User reports it works; signed-in persistence and remaining prerequisites require further verification. |
| MCR-25 | Mentor training in PR #54 | Exact 20-point boundary requires GM adjudication; live verification remains. |

The previously failing homepage and Update 23 tests are being repaired in the baseline branch. The campaign-load failure was a real missing error path; the test can now verify that failed reads show a retry rather than an empty campaign list. Signed-in live-service verification is still outstanding.

## What this document is

This is the **single working backlog** for correcting Mythras Forge's *Core-rule implementation*. It incorporates the reports below, keeps their original issue IDs for traceability, and ranks work by risk of a wrong result *during character creation or play*, not by visual polish or how easy an item is to code.

**Labels:**
- **RULE ERROR:** current implementation or player-facing rules claim conflicts with the checked Core text. Correct promptly.
- **ENFORCEMENT GAP:** Forge can accept or resolve a configuration that Core does not permit. It may need a validated override for existing data.
- **ASSISTED-PLAY GAP:** a Core mechanic is currently handed to players/GM manually. This is not inherently a bug, provided the interface says so.
- **TEXT / HOUSE RULE:** messaging or deliberate group customization; do not silently erase a useful house-rule option.

**Priority:** **P0 = erroneous game result or illegal Core character/spell**; **P1 = significant gameplay/rules ambiguity or prerequisite**; **P2 = completeness and reliable table assistance**; **P3 = wording, comments, polish**. Not every P0 must block homepage design/deployment; it is a *rules-correctness* priority.

**Important baseline already working (spot-checked, not whole-book certified):** STR+DEX Combat Style base; human attribute calculations in sampled bands; seven independent *current-HP* boxes; basic armour-after-damage math; d20 hit locations; Serious/Major thresholds; armour initiative penalty; skill improvement `d100+INT` gain formula; standard differential-result table; physical-exertion Fatigue table; distinct magic result-dependent MP costs; Sorcery's existing multi-turn tracker; official age-based Background Event workflow. **Retain** these rather than rewriting them unnecessarily.

---

## P0 — Fix incorrect outcomes first

- [ ] **MCR-01 · Sorcery Shaping categories (MAG-01).** **RULE ERROR.** Core p.162 uses **Combine, Duration, Magnitude, Range, Targets**; current UI and `sorceryLevels()` offer **Intensity** in place of Combine, with `combineExtra` stored separately. Files: `js/data.js`, `js/engine.js`, `js/app.js`, `js/render.js`. **Pass:** Intensity cannot be shaped in strict Core; Combine counts as Shaping; old records with Intensity or `combineExtra` are preserved/flagged for review rather than quietly converted to other components.
- [ ] **MCR-02 · Sorcery Shaping point budget (MAG-02).** **ENFORCEMENT GAP.** Core pp.161–162; Shaping 47% grants five points, but allocations are accepted without checking capacity. Files: `js/engine.js` `sorceryCost`, `magicCastPreflight`; `js/app.js` Shaping handlers. **Pass:** five points at 47% works, six fails **before** the cast starts and again at resolution; imported/outdated entries are checked; unshaped Invocation remains possible where legal.
- [ ] **MCR-03 · Sorcery Combine difficulty (MAG-03).** **RULE ERROR.** Core p.162: each additional combined spell raises Invocation difficulty by one grade. The code adds MP cost but not the difficulty. Files: `js/engine.js`, `js/app.js` `castMagic`. **Pass:** 2/3 spells cause +1/+2 harder grades, correctly composed with other grade modifiers; log and effective success threshold match.
- [ ] **MCR-04 · Mysticism individual Intensity calculation (MAG-04).** **RULE ERROR.** Core pp.155–157 printed worked example permits Intensity **2** at Mysticism **34%**; `mysticismLimits()` floors to **1**. Files: `js/engine.js`, `tests/rules-smoke.cjs`. **Pass:** 34% permits 2; boundary tests at 1, 19, 20, 21, 34, 40, 63 confirm the correct book rounding; combined Meditation limit remains distinct. **Verify precise rounding language before finalizing all boundaries.**
- [ ] **MCR-05 · Conditional CHA Experience Modifier (HRA-01).** **RULE ERROR.** Core p.72; `APP.xpAward()` applies CHA adjustment automatically to every award. Files: `js/app.js`, `js/play.js`. **Pass:** GM-visible, off-by-default **Apply Experience Modifier** selection; CHA 13, award 3 -> 3 if off / 4 if on; CHA 6 -> 3 if off / 2 if on; existing banked XP unaffected.
- [ ] **MCR-06 · Remove unauthorized once-per-skill XP cap (HRA-02).** **HOUSE RESTRICTION MISLABELED CORE.** Core p.72 does not impose the app's `usedThisRun` prohibition. Files: `js/app.js` `xpSpend`, `js/play.js` `xpModalHtml`, save migration. **Pass:** two separate improvement attempts on the same skill can spend two banked rolls in Core mode; second roll uses updated %. Optional house restriction only if expressly toggled on.
- [ ] **MCR-07 · Replace 1d4+1 starting Folk spells (MAG-07).** **RULE ERROR.** Core pp.118, 121 has skill-related starting allowances; `folkMagicPicker()` and `rollStartingFolk()` claim **1d4+1** is Core. Files: `js/render.js`, `js/app.js`. **Pass:** starting allowance follows book/GM-approved path, including specialist-career exception; no 1d4+1 labeled RAW; empty spell catalogue must not block players from recording approved spell names.

## P1 — Correct critical prerequisites and misleading play rules

- [ ] **MCR-08 · Ageing for older characters (CORE-Ageing).** **ENFORCEMENT GAP.** Core pp.34, 70–71: older characters can receive bonus skill points without any ageing checks/record. Files: `js/engine.js`, `js/render.js`, `js/app.js`. **Pass:** older human (e.g. age 44) is guided through or explicitly GM-overrides applicable rolls; resulting characteristic adjustments update derived numbers and persist; reloading does not reroll or double-apply. Existing saves remain available.
- [ ] **MCR-09 · Serious Wound action lock says rounds, not turns (CW-01).** **RULE-TEXT ERROR.** Core p.110 requires **1d3 turns**, not `1d3 rounds`. File: `js/play.js` `playWoundEffectText`. **Pass:** change exactly this text and test it; do **not** change the distinct Major Wound treatment deadline that truly uses combat rounds.
- [ ] **MCR-10 · Fatigue recovery depends on cause (HRA-03).** **MISLEADING RESULT.** Core pp.71,79: physical-exertion recovery uses Recovery Period / Healing Rate; blood loss generally one level/day starting the day after bleeding stops; asphyxiation normally one level/min after it ends. Files: `js/play.js` `fatigueRecoveryText`, `pmFatiguePanel`. **Pass minimum:** label estimate **physical exertion only** and show exceptions. **Pass full:** source selector uses appropriate timing; no automatic recovery while source persists.
- [ ] **MCR-11 · Animism spirit POW eligibility (MAG-09).** **ENFORCEMENT GAP.** Core pp.131,136: maximum controllable spirit POW is three times Binding's critical range. Files: `js/engine.js` `spiritCommandPreflight`, `js/app.js` `commandSpirit`. **Pass:** Binding 45%, spirit POW 15 eligible, POW 16 cannot be rolled as a successful ordinary command; invalid/missing POW prompts review.
- [ ] **MCR-12 · Theism Devotional Pool limits (MAG-08).** **ENFORCEMENT GAP.** Core p.180 caps pool by Theist cult rank and POW, with multi-cult considerations. Files: `js/app.js` `devotional`, `js/engine.js` `devotionalMax`, cult UI. **Pass:** Initiate POW 12 cannot create an unrestricted 12-MP pool in strict Core; show cap and available balance separately; rank change and legacy oversized pools are non-destructive, clearly marked for GM review. Confirm rulebook rounding before applying caps.
- [ ] **MCR-13 · Mysticism preparation and cast prerequisites (MAG-05).** **ASSISTED-PLAY / ENFORCEMENT GAP.** Core pp.155–157: one preparation turn per Intensity, roll on last turn, individual/combined active ceilings, category-dependent base MP cost. Files: `js/app.js` `castMagic`, `toggleTalent`; `js/engine.js` `magicCastPreflight`, `mysticismActivationCheck`. **Pass:** Intensity 3 cannot resolve immediately; illegal intensities blocked at cast time; failure cannot automatically set active status; proper category cost validated; continuation/cancel works after reload.
- [ ] **MCR-14 · Theism Exhortation turns and rank costs (MAG-06).** **ASSISTED-PLAY / ENFORCEMENT GAP.** Core p.181: Initiate/Acolyte/Priest invocations require 1/2/3 turns and corresponding rank-dependent normal pool cost; multiple instances affect both. Files: `js/app.js` `castMagic`, `js/engine.js`, magic editor. **Pass:** Acolyte miracle rolls only on second turn and normally costs 2 MP; keep existing different Critical/Failure/Fumble cost outcomes; interruption and edit/reload handled.
- [ ] **MCR-15 · Starting access for other magic traditions (MAG-10).** **CREATION ENFORCEMENT GAP.** Core pp.118,155,163,179; unlimited new miracle/spirit/spell/talent entries do not separate beginning characters from experienced ones. Files: `js/render.js` `knownMagicEditor`, creation validation. **Pass:** show applicable starting allowance and prerequisite for each tradition, flag excess in Core creation mode without deleting existing/imported content; GM override available.

## P2 — Make table use robust; manual GM handling stays valid until added

- [ ] **MCR-16 · Seven independent armour locations (CW-02).** **MODELING LIMITATION.** Core pp.10,58,109; split shared `Each Arm`/`Each Leg` armour into Right/Left while retaining optional **Both** shortcut. Files: `js/data.js`, `js/engine.js`, `js/render.js`, `js/play.js`, `js/app.js`. **Pass:** legacy armour duplicated non-destructively on import; identical 4-damage hits against AP 5 right arm / AP 0 left arm take 0/4 HP; ENC, cost, initiative, exports and persistence remain correct.
- [ ] **MCR-17 · Clarify parry-before-armour damage input (CW-03).** **RULES-RISK UX.** Core pp.94–95,110. Existing `playApplyDamage` subtracts location AP but doesn't calculate successful parry Size reductions. Files: `js/play.js` `pmLocDetail`, `js/app.js`. **Pass minimum:** field says **damage after parry and other reductions, before armour** with compact reference; leave manual damage value possible. Optional separate parry calculator should be tested for weapon Size and rounding.
- [ ] **MCR-18 · Defensive Special Effects and eligibility (CW-05 / CORE-SpecialEffects).** **ASSISTED-PLAY GAP**, previously listed twice and now **one issue**. Core pp.95–100; chooser currently gates on offensive flag. Files: `js/play.js` `selectedEffectRoll`, `canPickEffectForRoll`, `js/app.js` `playChooseEffect`. **Pass:** winning defence can choose eligible defensive effects; attack-only effects cannot be chosen defensively; weapon/critical/fumble restrictions enforced when knowable; table-only circumstances left to GM; save log has exchange context.
- [ ] **MCR-19 · Opposed/differential rolls above 100% (CORE-Opposed100).** **ASSISTED-PLAY GAP.** Core p.51 shared adjustment absent from current manual opponent-tier workflow. Files: `js/app.js`, `js/play.js`, `js/engine.js`. **Pass:** optional guided path accepts both effective skill % and rolls, correctly normalizes >100% before determining tier/differential effects; manual tier entry retained for tabletop dice.
- [ ] **MCR-20 · Natural wound recovery schedule (HRA-04).** **ASSISTED-PLAY GAP.** Core p.80: Minor/day, Serious/week, Major/month by Healing Rate, with activity penalties and severity transitions. Files: `js/app.js` `playHeal`, `js/play.js`. **Pass:** optional downtime recovery applies appropriate increments per location; 0 HP remains Serious; positive HP becomes Minor; no retroactive faster rate; manual `+heal` and GM overrides remain.
- [ ] **MCR-21 · Persistent wound consequences (CW-04).** **ASSISTED-PLAY GAP.** Core p.110: opposing Endurance outcomes, unusable limbs, consciousness, offensive interruption, treatment deadline not stored. Files: `js/play.js`, `js/app.js`, state normalization. **Pass:** optional wound-event records survive export/import/cloud; attach condition and duration to the incident rather than only current HP; no live-clock forced death or silent loss of player control.
- [ ] **MCR-22 · Major treatment and lasting maiming (HRA-05).** **ASSISTED-PLAY GAP**, related to MCR-20/21 but independently testable. Core p.80. **Pass:** guided natural Major healing requires GM-confirmed treatment; optional permanent location max-HP override recalculates future wound thresholds and persists; manual overrides always available.
- [ ] **MCR-23 · Improve Passions with Experience Rolls (HRA-06a).** **ADVANCEMENT GAP.** Core p.72; current XP modal only targets `allEntries()` skills. **Pass:** existing Passions can use correct advancement roll, spend one banked roll and persist gains without corrupting skill allocations.
- [ ] **MCR-24 · Learn new Professional Skills in play (HRA-06b).** **ADVANCEMENT GAP.** Core p.73; current professional list derives mainly from character creation. **Pass:** GM-approved one-month education and 3-XP-roll procedure adds a persistent learned skill, calculated from correct base, without retroactively changing Culture/Career/Bonus pools.
- [ ] **MCR-25 · Mentor training (HRA-06c).** **ADVANCEMENT GAP.** Core p.73; a separate week-long training procedure and teacher prerequisites apply. **Pass:** weekly training options follow proper training table, experience prerequisites and repeat-training gate; offer manual GM approval.
- [ ] **MCR-26 · Characteristic advancement/maintenance (HRA-06d).** **ADVANCEMENT GAP.** Core pp.72–73; characteristic gains, their continuing XP maintenance, species maxima and optional purchase scheme are absent. **Pass:** legal raises recalculate skills and attributes, rule out mundane SIZ increase, persist maintenance obligations; *optional* page-73 purchase scheme is labeled optional.

## P3 — Small credibility cleanups (can be included in first patch)

- [ ] **MCR-27 · Combat Style provisional-warning text (CORE-StyleWarning).** **RULE-TEXT ERROR, low code risk.** Core p.12 unambiguously uses STR+DEX. `js/engine.js` nonetheless marks style entries `provisional:true`; `js/play.js` says base isn't specified. **Pass:** delete warning, keep unchanged correct numerical formula; STR 12 + DEX 14 gives uninvested 26%.
- [ ] **MCR-28 · Outdated Background Events source comment (CORE-BackgroundEvents).** **COMMENT ERROR.** Core pp.18–20 does contain official events, while the app correctly has a separate Core roll workflow and clearly labeled *house* Life Events. File: `js/data.js`. **Pass:** correct comment only; leave official workflow and house content separate, avoid republishing book table in the public site.

---

## Practical development order (small reviewable pull requests)

**PR 1 — XP correctness and fast fixes**: MCR-05, 06, 09, 10 (minimum text fix), 17 (minimum label), 27, 28. These are focused changes with high value and low migration risk; test banked XP and read-only account behavior. **First Codex task.**

**PR 2 — Sorcery Core repair**: MCR-01, 02, 03. Treat them as one cohesive domain change because all three affect the same data model. Add reversible legacy-save handling; verify old character imports and currently casting Sorcery states.

**PR 3 — Mysticism and starting Folk correctness**: MCR-04 and 07. Validate exact rounding and specialist-creation exception from the book before coding. Keep this separate from adding new cast-turn UI.

**PR 4 — Magic eligibility rules**: MCR-11, 12, 15. Provide visible GM review rather than destructive migrations. Add static and UI checks for POW/rank/skill limits.

**PR 5 — Multi-turn casting flows**: MCR-13 and 14. Reuse, but do not regress, the existing Sorcery turn-tracker pattern. Test failed rolls, interruptions, game reloads, zero points, and turn progression.

**PR 6 — Character ageing and armour storage**: MCR-08 and 16 should preferably be *separate PRs*, since each touches persisted character state. Each must include a versioned normalization/migration and export/reimport tests.

**PR 7 — Combat assistance**: MCR-18, 19; MCR-21 after deciding wound-event schema. Do not confuse attack/defence or silently presume parries. Confirm exact result matrix with Core before coding.

**PR 8+ — Downtime and long-term campaign play**: MCR-20, 22, 23–26 as individually scoped features. Prefer Passions and new Professional Skills first if group needs advancement soon.

### Definition of done for *every* PR

- [ ] Quote the relevant **printed Core page numbers** in the PR description (brief paraphrase only for public code/docs).
- [ ] Separate **Core rules** from Sit'ota-specific house rules; never remove an intentional house rule without user approval. The existing 1–4 cultural Combat Style allocation option must remain an explicit house-rule setting.
- [ ] Add deterministic regression cases for the new numeric behavior and invalid inputs. Include boundary checks, not just one happy path.
- [ ] Run repository's full automated test scripts and state the exact results; do not say “tests passed” without actually running them.
- [ ] Preserve the current hosted app and player data. Test versioned schema migration, `localStorage`/JSON import, cloud roundtrip where applicable, and owner/party/GM permissions.
- [ ] Review in an isolated branch/PR; avoid direct writes to `main`. Merge only after user's approval.
- [ ] Deliver a **simple changelog**: what changed, what to test, what remains manual, and any new house-rule toggle.
- [ ] Do not mix this backlog with the **New Sit'ota homepage/world guide deployment**, which is a separate release awaiting GitHub write-capable tooling.

## Known exclusions / still unaudited (do not equate checklist completion with 100% accuracy)

These four reports are targeted subsystem audits, **not** an exhaustive comparison of every Core rule. A future evidence-based verification pass should still cover: all Standard/Professional skill bases and specialist cases; full cultural/career allocations; all weapons, armour construction/material and reach/size exceptions; complete Special Effects prerequisites and stackability; combined fatigue/encumbrance/armour/difficulty interactions; First Aid and poisons/disease; magic resistance/disruption/durations/MP recovery/rituals; persistence and signed-in production workflows. Supplemental sourcebooks stay lower priority until Core behavior is stable.

### Source reports (retain for evidence and worked scenarios)

1. `mythras-forge-core-rules-audit-2026-10-27.md` — character generation, ageing, opposed >100, Combat Style warning, Background Events.
2. `mythras-forge-combat-wounds-audit-2026-10-27.md` — per-location damage/armour, wounds, parries, defensive Special Effects.
3. `mythras-forge-healing-recovery-advancement-audit-2026-10-27.md` — XP, Fatigue source, natural recovery, training and lasting injuries.
4. `mythras-forge-magic-rules-audit-2026-10-27.md` — Folk Magic, Animism, Mysticism, Sorcery, Theism.

### Ready-to-copy first Codex prompt

> Work on `colemak1/mythras-character-forge` in a **new review branch**, not `main`. Implement **PR 1** from `mythras-forge-master-core-rules-checklist-2026-10-27.md` (MCR-05, 06, 09, minimum MCR-10, minimum MCR-17, 27, 28). Use the uploaded Mythras Core Rulebook as rules authority and the master report's acceptance cases. Preserve the existing character creator, live site, saves, Supabase/auth, and Sit'ota house-rule options. Add source-page-based regression tests, run the repository's full suite, and give me a short changelog plus specific browser test steps. Create a pull request for review; do not merge until I approve.

## Status update protocol

Each time a PR merges, update this document: check off completed issue IDs, record PR URL, merge SHA and test results, and add any newly discovered failure under the appropriate tier. **Do not claim a task completed merely because code exists**—mark it done only after the behavior is tested and the user's production/merge approval is respected.


## Batch 1 status

MCR-05, 06, 09, minimum 10, minimum 17, 27, and 28 were merged in PR #30. Production verification and checklist reconciliation remain to be confirmed. The skill-allocation soft lock was also addressed in that branch.

## Passion advancement — merged, production verification pending

MCR-23: PR #43 (merge ac1b6c707ddaeac34eb1a9c74d4b7a05396405e3) adds Passion Experience Roll improvements using Core p.72, preserving older records and character exports. A separate manual change supports GM-directed changes during play (p.82) without spending rolls. The GM determines event-driven adjustments; automatic fumble tracking and Experience Roll-based reductions remain unimplemented. Production verification is pending.

## Sorcery repair — merged, rounding verification outstanding

MCR-01, 02 and 03 were merged in PR #34 (merge `bfc26497b2a441c0de760435af70c49b07665347`), with automated tests passing. Legacy Intensity and combined-spell records require explicit review. Core pp.161–162 and p.165 were checked against the scanned rulebook; legacy casting trackers must be cancelled and restarted. Combined-spell identity, common targets and differing Invocation skills remain GM checks. The app rounds Shaping up; rounding at values other than the printed 47% example remains unverified and the items stay unchecked pending resolution and production testing.

## Mysticism and Folk Magic — merged, verification outstanding

MCR-04 and MCR-07 changes were merged in PR #41 (`add8c44c5042d522b2b96bc46957e90d70671701`). Visually checked uploaded Core pp.118, 121, 155 and 157: the general starting allowance counts each 20% or part, specialist Folk careers use one tenth, and Mysticism 34% has individual Intensity 2. Rounding at other Mysticism and specialist Folk boundaries remains unverified; specialist allowance is GM-managed. Automated tests cover the book's example, default allowance guidance, and manually recorded spells. Leave items unchecked pending production verification and resolution of those remaining questions.

## Animism and Theism eligibility — merged, production verification pending

MCR-11: bound-spirit command check merged in PR #42 (merge e9e66b5c02adbded2cdafd78e9283a8ae00aa51a) verifies POW against three times the Binding critical range, with missing POW requiring review. Visually checked Core pp.38, 131 and 136. MCR-12: guidance based on Core p.180 was merged; rank-specific caps and multiple pools are not yet modeled or enforced. Existing pools are unchanged. MCR-15 remains unfinished. Keep items unchecked pending production testing.

## Mysticism preparation — review pending

MCR-13: Core p.156 was visually checked. Proposed tracker records one preparation turn per Intensity, rolls on the last turn and rechecks recorded individual and combined limits. Cancellation, edited entries and reloads are supported. Active markers remain manual and a failed roll does not set one. GM must manage interruption, action points and Talent category/cost. Limits use existing calculations whose rounding remains under review. Category-specific cost validation and production verification remain unfinished.

## Starting magic guidance — merged, production verification pending

MCR-15: Core pp.118,155,163,179 were visually checked. PR #44 (merge f03f21f4367172cc0559f0e8e590092f89ba31dd) added creator guidance showing the general skill-based allowance and tradition-specific starting restrictions; excess named records for mysticism, sorcery and theism prompt GM review. This does not track whether abilities were learned later and does not enforce prerequisites or delete records. Animism spirit-record counts cannot reliably identify starting abilities. Creation-mode validation and GM override remain unfinished.

## Theism exhortation — merged, production verification pending

MCR-14: Core p.181 was visually checked. PR #47 (merge 475456c446615cbc2aea028e79be6c742c73cbf9) records the miracle's cult level and number of instances, calculates full cost and turns, and rolls on the last turn. Legacy costs are preserved and require review before casting. GM manages interruptions and confirms access. Multiple-cult tracking, signed-in persistence, and production verification remain unfinished. Keep the item unchecked pending live testing.

## Devotional Pool rank check — merged, production verification pending

MCR-12: Core p.180 was visually checked. PR #48 (merge 91da8239b4f71354ea6e083046d5f8d147b0dda9) added a rank explicitly confirmed for the currently tracked pool. Whole-number limits reject new increases above the cap; an existing oversized pool is preserved and must be reviewed before casting. Unconfirmed rank or fractional result does not silently impose a rounding rule. The existing tracker still supports only one pool; combined multi-cult totals and fractional rounding require GM handling. Real-account and production verification are outstanding.

## Ageing review — merged, production verification pending

MCR-08: Visually checked Core pp.34,70–71. PR #49 (merge d6c861750a3f45b925d07383114873a352af7858) records the GM's review or override against the age and species, and leaves existing characteristics untouched. Tests and penalties remain manual: direct characteristic changes would conflict with the current builder's rolled-range and points-buy validation. The acceptance requirement for persisted characteristic effects and updated derived values remains open.

## Individual armour locations — merged, production verification pending

MCR-16: Core p.58 visually checked. PR #50 (merge fdb438b754d604fd608e8fb2c0c6642fc6163bee) models each limb independently, retaining a both-limbs shortcut. Legacy shared entries are copied to left and right only when those locations are missing; originals remain in saved data. Regression cases cover damage, ENC, cost, Initiative and JSON reload. Real-account cloud and production verification are outstanding.

## Recovery assistance — merged and deployed (PR #51)

MCR-10: fatigue recovery guidance can be filtered by cause; the player/GM still determines when the cause has ended and adjusts fatigue manually. MCR-20: proposed natural healing applies one interval using the current wound severity, Healing Rate and a GM-entered strenuous-activity reduction. Major Wounds require confirmation of successful treatment (Core p.80). MCR-22: wound text now correctly refers to successful Healing treatment; lasting injury and permanent maximum-HP changes remain manual. No elapsed time is assumed or recorded, Pulp/Paragon adjustments remain GM-managed, and signed-in live persistence remains unverified.

## Contested-roll calculator — ready for review

MCR-19: Core pp.50–51 visually checked. An optional calculator accepts both modified skills and rolls, applies the shared excess over 100 before resolving either roll, and reports both opposed and differential results. It leaves the combat roll log and manual tier entry unchanged; applying its result to combat remains manual. The optional rounded subtraction rule is not applied. Real-account and production verification remain outstanding.

## Learning professional skills — implementation in review

MCR-24: Core p.73 visually checked. The advancement screen can add a GM-approved Professional Skill after a confirmed month of study, spending 3 banked Experience Rolls and preserving creation allocations. Specialities remain distinct, duplicates are rejected, and normal skill displays and improvement use the characteristic base. Education, money and prerequisites are confirmed at the table; live signed-in persistence is not yet verified.

## Mentor training — implementation in review

MCR-25: Core p.73 visually checked. Confirmed week-long training uses the mentor/student difference and teacher result to select the chart step; the skill must then be improved with an Experience Roll before further training. Time, payment, teacher roll and availability remain GM-managed. The text permits a 20-point difference but the chart begins at 21; the app flags exactly 20 for GM adjudication instead of assuming a chart row. Live signed-in persistence remains unverified.

## Mysticism category costs — implementation in review

MCR-13: Core pp.155–157 visually checked. Players confirm category; augment costs 1 MP per intensity, invoke costs 2 MP at Intensity 1, and enhance costs 3 MP per intensity. Legacy manually recorded costs remain saved but do not determine the new calculated cost; unreviewed entries require category confirmation. Existing interrupted preparation must be cancelled and restarted after review. Activation remains manual, and rounding, interruption and real-account persistence remain open.

## Wound incidents — implementation in review

MCR-21: Core p.110 visually checked. Each attack entered through Apply Damage that causes a Serious or Major Wound creates a saved incident with actual post-armour damage, manual opposed-Endurance outcome, treatment status, notes and optional Serious interruption duration. Incidents can be resolved or reopened independently of current HP; deadlines are reminders, not automatic clocks. Direct HP adjustments do not presume an attack or create an incident. Condition enforcement, live-account verification and legacy wounds without incident records remain open.

## Defensive Special Effects — implementation in review

MCR-18: Core pp.94–96 visually checked. Combat rolls require an explicit attack/defence role for effect selection; eligible defence-only and shared effects are available when the defender wins. Critical and fumble requirements use the correct participant. Evade can be marked as defence, and an attacker may explicitly record an unopposed attack as no parry. Weapon and situational eligibility remain GM-confirmed; actual combat outcome and parry reductions are not inferred. Live-account verification remains open.

## Permanent injury maximums — implementation in review

MCR-22: Core p.80 visually checked. A GM-confirmed per-location maximum adjusts wound thresholds, recovery, sheets and party vitals without changing the stored wound or creation characteristics. Fractional reductions, injury result, absent limb hit locations, time and magical restoration remain GM decisions; the app does not roll or infer them. Real-account persistence is unverified.

## Parry calculation — implementation in review

MCR-17: Core pp.94–95 visually checked. An optional calculator shows remaining damage before armour for successful, failed or absent parries using effective weapon sizes. It does not infer the defence, apply Special Effects, apply armour, or change HP. Odd half-damage results are displayed exactly pending GM rounding; live browser verification remains open.
