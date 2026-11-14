# Pits prototype visual check — 2026-11-13

Browser: Work cloud Chrome (CDP), desktop, 1348 × 926. Read AGENTS.md and HANDOFF.md first. Source: `claude/go-wf0bsg`, checked against `c146e87`. All three supplied raw.githack previews loaded; no sign-in, blocked link or load retry. Each was played at Normal and Half with decision stops and Loop unchecked. Nothing was changed or deployed in the app.

**Scope limit:** observations were successive browser screenshots, not a continuous video stream. PASS means no fault visible in the received frames. FAIL / unverified is Severity 3 evidence missing, not a confirmed animation bug. The ten-beat capture missed beats 4–5 at Normal and its later Half-speed frames were truncated by the tool. Do not treat this as full visual acceptance.

| Check | 1. Ten-beat Normal / Half | 2. Thrust Normal / Half | 3. Shields Normal / Half |
|---|---|---|---|
| A. Loads and plays through ending without visible app error | PASS / PASS | FAIL, unverified S3 / FAIL, unverified S3 | PASS / PASS |
| B. Continuous; no freeze, pose snap, limb/blade jump | FAIL, unverified S3 / FAIL, unverified S3 | FAIL, unverified S3 / FAIL, unverified S3 | FAIL, unverified S3 / FAIL, unverified S3 |
| C. No blade through opponent except landed hit | FAIL, unverified S3 / FAIL, unverified S3 | PASS / PASS | PASS / PASS |
| D. Feet do not slide on floor | FAIL, unverified S3 / FAIL, unverified S3 | PASS / PASS | PASS / PASS |
| E. Dagger clearly shorter | — | PASS / PASS | — |
| F. Beat 7 sword-arm thrust: attempted parry too late | — | PASS / PASS | — |
| G. Round shields forward; shield blocks on shields | — | — | PASS / PASS |
| H. Beat 6 shield shove knocks opponent back a step | — | — | PASS / PASS |
| I. Beat 10 thigh cut: buckler attempts late defence | — | — | PASS / PASS |

Unverified failures: B on all pages cannot exclude brief freezes/jumps between captured frames; no definite snap was identified. Page 1 C/D have the capture gaps above. Page 2 A reached collapse (beat 9) and the survivor's final guard at both speeds, but navigation occurred before the final automatic Play/stopped state was confirmed. No visible study error was encountered; console errors inspected on pages 1 and 3 came from the browser extension, not the study.

**Additional confirmed visual failure — Severity 2:** own-blade/head overlap (outside C, which concerns the opponent). Page 2, beat 5 recovery into beat 6's opening guard: the dagger crosses A's head circle while held overhead. Page 3, beat 6 chamber/contact and beat 9 chamber: A's sword runs across A's face/head circle. Seen in both speeds; clearest at Half. Adjust the chamber/recovery path or depth presentation so the weapon visibly clears its wielder.

The dagger length, late sword cover, front-facing shields, shove/back-step and late low buckler reach are readable. No confirmed Severity 1. These findings apply only to these prototypes, not the live Pits or every weapon family.

Validation: all 66 top-level `tests/*.cjs` scripts run with the AGENTS command; result recorded in the PR. Session readiness remains **13/14**; feature completeness **8/8 built, 8 closed**. Next: Claude — address own-head overlap and retain the unverified limits; no live promotion from this report.
