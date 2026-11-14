# Pits reports and Lost? review — 2026-11-14

Reviewed all **13 saved submissions** available at retrieval: 5 ordinary reports, 4 Lost? snapshots and 4 matching notes. Twelve submissions are new since the existing ledger. The last submission was received **11:54:25 PST / 19:54:25 UTC**. This is a record/code diagnosis, not a new visual playthrough or an independent Core rules audit.

Source: read-only query of the site's `pits_fight_reports`, excluding account IDs; originals of the 12 new submissions are in `docs/pits-records/` under the filenames below. Follow-up notes are paired by mark number, mark timestamp and fighters, not counted as new incidents. The earlier exported report remains [on the reports branch](https://github.com/colemak1/mythras-character-forge/blob/pits-reports/reports/20261114-045813-120c8f7f.json).

## Fix list for Claude

| ID | Finding and evidence | Severity / status | Requested change and acceptance |
|---|---|---|---|
| FR-01 | **Pin Weapon disappears from the explanation.** Lost #1 asks why Attack is unavailable and what the second effect was; Lost #2 asks why Parry is unavailable; Lost #4 finally identifies the pin. Log 7 records Pin Weapon, log 8 Bypass Armour. Lost #1's actual story/recent contains Bypass Armour and the wound but omits Pin Weapon. | **2, confirmed presentation fault.** The restrictions have an engine cause; no evidence here that the restriction itself is wrong. | Keep both selected effects and their lasting consequences in the exchange, Lost? recap and action/defence explanation. Say which weapon is pinned, who pinned it, which actions it blocks, and how to free it. Reproduce the critical 2 versus failed parry 69: both Pin Weapon and Bypass Armour must remain visible before the next choice. |
| FR-02 | **A resisted Trip is hard to understand.** Lost #3: “looks like he tried to trip me and failed but not reall sure.” Log 12 attack 15/45; log 15 resistance 45/53, “remains standing”; log 17 right-leg hit, armour absorbs all damage. | **2, clarity fault supported by snapshot.** Resistance succeeded in this record. | Say “You resist the trip and stay standing”; show the two rolls, then the hit/armour result in a clear sequence. State that the Trip was an effect of this exchange. Keep the result readable before the next choice. |
| FR-03 | **One attack reads as multiple blows.** Ordinary report 19:09:51 says leg hit → Trip attempt → leg hit again. The tape actually presents hit log 17 **before** the Trip resistance roll/log 15 and then hit-location/damage dice for that same hit. Only one damage application exists in the engine log. | **2, confirmed presentation-order fault; duplicate-looking motion is owner-reported.** | Resolve needed rolls before the corresponding physical outcome. Draw one attack/contact with its Trip consequence; a failed Trip must not produce a second damaging-looking strike. Verify both resisted and successful offensive Trips, and preserve the distinct defensive-counter case. |
| FR-04 | **95% effect odds look implausible and need explanation.** Report 19:49:25 ends at log 33, after the player's successful attack **59/67**. Current `pbResist` already uses higher rolls within equal successful grades. With first opponent Brawn 49, it returns 95%: only criticals 1–5 resist; ordinary successes 6–49 cannot beat 59. | **3, alleged calculation error not established.** This is a worked check of the existing implementation, not a new Core ruling. | Do not change opposed-roll rules merely to reduce this percentage. Explain that these are conditional odds against the **already rolled 59**, show the resisting skill and winning faces. Check all skill options and modifiers against the actual pending state. If changing rules, verify the uploaded Core first. |
| FR-05 | **Hit-location target marker is off the body part.** Report 19:50:14; log 34 is Choose Location: Head, following the same 59 attack. | **3, owner-reported visual fault; coordinates unavailable.** | Reproduce Head selection while the defender holds its current pose. Anchor the reticle to the drawn joint/segment throughout its lifetime, including camera/scale changes. Inspect `psBodyPt`, `psReticle` and both locate paths in `pits-stage.js`. |
| FR-06 | **Live figures reset to neutral; whole-fight replay avoids those resets.** Report 19:54:25 expressly prefers replay continuity and says fluidity is essential. | **3, owner-reported; no frame capture in these records. High owner priority.** | Compare the same recorded exchanges live and in replay; preserve the finishing pose through every choice and roll, then start the next movement from it. No automatic neutral reset between beats or rounds. Test the route actually reported as well as the spring trial. |
| FR-07 | **The final animation is choppy.** Same 19:54:25 report; current bout ends at logs 71–76: head hit, Major Wound, concurrent-turn handling, Delay, fight end. The note does not identify an exact frame. | **3, owner-reported; exact transition unverified. High owner priority.** | Reproduce the ending and check continuous movement through hit, wound, concurrent action and collapse, in live play and replay. Preserve the engine's concurrent-action semantics while removing visible gaps/snaps. Ask for a specific clip only if the supplied record cannot isolate it. |

## Confirmed code causes and route limits

- **Pin omission:** `experiments/pits-arena.js:79` includes `Pin Weapon` in `PA_BREAK`, so `paExchanges()` cuts off the exchange at the pin. `pbSince()` in `experiments/pits-bottom.js:153` keeps just two later non-system lines. The pin falls out while Bypass Armour and damage survive. A minimal fixture using the recorded lines reproduces precisely that omission. Also inspect `pitsLegalActions()` in `pits-view.js:42`, which reduces an unavailable Attack to “Weapon unusable”; explain the actual cause. `pitsStageCue()` currently has no Pin Weapon cue, supporting the reported lack of a dedicated pin animation.
- **Trip ordering:** `pitsStageOrder()` in `experiments/pits-stage.js:257` moves the blow ahead of either kind of Trip without distinguishing offensive from defensive ownership. The saved tape shows exactly that movement: log 17, Trip roll, log 15, location roll/log 16, damage roll. `pitsStageBeat()` folds an offensive Disarm into its blow, but has no equivalent Trip consumption; Trip has a separate leg-strike stand-in. Fix the order and the shared movement together.
- **Reported route:** every new report has `page=experiments/practice-combat.html`, with **no `?stage=spring`**. Their `stage` arrays are empty; all four Lost? marks have `stageClock=null`. `PS_SPRING` explicitly requires that query parameter (`pits-stage.js:334`), and automatic stage-record creation is spring-only. The first, already-fixed report did use `?stage=spring`. Do not assume the new visual reports concern the spring writer, or declare a spring-only fix accepted for this route. Do not promote the trial without the owner's release decision.
- **Build:** all 12 new submissions report `arena=d9e43ed972;motion=5c6cf25c54;spring=d6e69e0c95;writer=e371f2e1b2;spring-live=bcba3a2354;stage=16f0fafc9e`. These six stamps match the inspected `main` at `6e53f0f7c29ce153ea3ab6937d68672ac44f9361`; no stale-script mismatch is established. The stamp omits inline arena code, bottom-deck code and the shared rules file, so it does not certify those versions.
- **Record boundaries:** the last report contains prior-bout log history but current-bout `presented` and fighter metadata. Its current opponent carries a spear; the earlier opponent carried a mace. Keep encounter boundaries when reproducing. The records contain text/dice, not frames or full engine-state restoration data.

## Every submission accounted for

Times and filename prefixes below are UTC. Filenames live in `docs/pits-records/`, except the first (existing exported report).

| Time | File | Disposition |
|---|---|---|
| 04:58:13 | `20261114-045813-120c8f7f.json` | Existing ledger: prone-target reach fixed by Claude. Not reopened or visually reaccepted here. |
| 19:07:07 | `20261114-190707-a3bff8a7.json` | Lost #1 snapshot → FR-01; log 7 omitted from visible explanation. |
| 19:07:27 | `20261114-190727-7a13db21.json` | Lost #1 note → FR-01; unavailable Attack / missing second effect. |
| 19:07:44 | `20261114-190744-7e81d526.json` | Lost #2 snapshot → FR-01; next attack with weapon still pinned. |
| 19:07:55 | `20261114-190755-f1c514e9.json` | Lost #2 note → FR-01; unavailable Parry. |
| 19:08:20 | `20261114-190820-6215d805.json` | Lost #3 snapshot → FR-02 and FR-03; resisted Trip and misordered tape. |
| 19:08:42 | `20261114-190842-73af63e1.json` | Lost #3 note → FR-02; unclear Trip outcome. |
| 19:09:51 | `20261114-190951-59d95df7.json` | Ordinary report → FR-03; hit/Trip/hit appearance. |
| 19:10:18 | `20261114-191018-d306724a.json` | Lost #4 snapshot → FR-01; pin-escape rolls playing. Only log 23 shown; log 24 escape result is not yet visible. |
| 19:10:37 | `20261114-191037-0aa0e36b.json` | Lost #4 note → FR-01; pin finally recognised, no clear text/animation. |
| 19:49:25 | `20261114-194925-1e948e3a.json` | Ordinary report → FR-04; 95% allegation checked, no calculation fault established. |
| 19:50:14 | `20261114-195014-d319ec78.json` | Ordinary report → FR-05; misplaced location marker. |
| 19:54:25 | `20261114-195425-9374a0c7.json` | Ordinary report → FR-06 and FR-07; resets and choppy finish. |

## Validation

All 72 top-level `tests/*.cjs` scripts completed with no failures (1,183 PASS lines). The minimal recorded-line fixture reproduced the missing Pin Weapon recap; face-by-face odds checks returned 95% for resistance 49 against success 59, and confirmed that successful 45 beats successful 15. All 12 attached JSONs match the retrieved originals. These checks establish record/code findings, not visual acceptance.

## Handoff

Claude: address FR-01–03 with targeted regressions; reproduce FR-05–07 with fluidity as the owner's visual priority; clarify FR-04 without changing the opposed comparator on this evidence. Preserve the earlier fixed report. The export branch still listed only one report when checked; the attached 12 originals make this batch independently readable without an export key.

Session readiness **13/14**; feature completeness **8/8 built, 8 closed**, unchanged. This batch compiles player evidence and identifies presentation fixes; it does not claim new live acceptance.
