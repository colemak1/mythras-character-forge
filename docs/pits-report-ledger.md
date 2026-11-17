# Pits fight report ledger

One row per report from the `pits-reports` branch (`reports/`, see `docs/pits-reports.md`). Claude and ChatGPT both
write here; take a report by putting your name in **Who** before diagnosing it. Newest first.

**Status:** open, diagnosing, fixed (with the commit or PR), not a fault, stale page, rules question (for Chat).

| Report file | Note (short) | Who | Status | Finding | Fix |
|---|---|---|---|---|---|
| `20261117-032326-ea7eb029.json` | Lost #1 note: why did I just win | Claude | fixed | FR-15, Sev 2. Head Serious Wound, Endurance failed: the loser goes down only after its concurrent attack (tied Initiative), so Victory follows a parried blow and the knockout line is cut off. | the result names the cause ("falls unconscious: Serious Wound to Head") after the concurrent action. This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261117-032318-8e47c64f.json` | Lost #1: Kethan Voss wins | Claude | fixed | FR-15 (as above). Also: right arm disabled, then a concurrent attack at 32% and later left-hand attacks at 48%. |  off-hand and concurrent-attack percentages to Chat (R1). This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261115-001152-f5132896.json` | replay keeps pausing | Claude | likely fixed | Spring stage. The cinematic replay (2026-11-15) runs as a film without stops. | Owner recheck only. |
| `20261115-000956-46c8f6e6.json` | picked up weapon, still had to ready it | Claude | fixed | FR-14, Sev 3. Core p.92: pick up, then ready, two actions. Rule right; the button doesn't say so. | label Pick Up (1 of 2) / Ready (2 of 2). This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261115-000931-57f1b581.json` | Lost #3 | Claude | open | Paired with 000956 and 000902 (prone, pick-up). | See those rows. |
| `20261115-000902-468080a9.json` | should be prone, figure isn't | Claude | likely fixed | Successful Evade ends prone; spring stage did not draw it. Cinematic audit CA-01 (#342) draws prone from state. | Owner recheck only. |
| `20261115-000759-bd7faf73.json` | Lost #2 note: not obvious I'm stunned | Claude | fixed | FR-13, Sev 2. Serious Wound stun (cannot attack 3 turns) shows only as "Stunned or pressed" on Attack. | Stunned chip with turns left; Attack reason names it. This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261115-000741-ce85a2b6.json` | Lost #2 | Claude | open | Paired with 000759. | See 000759. |
| `20261115-000640-76aa2d2e.json` | Lost #1 note: did I resist the disarm? too fast | Claude | fixed | FR-12, Sev 3. Dice now hold 1.4 s (2026-11-17). "Keeps weapon" is only in the story text. | "Disarm resisted" told as its own line on the stage. This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261115-000618-7f896883.json` | Lost #1 | Claude | open | Paired with 000640. | See 000640. |
| `20261114-235839-90a50c4e.json` | Lost #4 note: why prone? | Claude | fixed | FR-11, Sev 2. Evade ends prone (and Arise is logged before the fall). Neither the cost nor the order is told. | Evade says it ends prone; fall logged before Arise. This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261114-235832-7bfa6a40.json` | Lost #4 | Claude | open | Paired with 235839. | See 235839. |
| `20261114-235648-ad4634ad.json` | Lost #3 note: make AP clearer | Claude | fixed | FR-10, Sev 2. Defender had 0 AP; the log says it "preserves Action Points" (`practice-combat.html` no-defence line), which is wrong. | "has no Action Points left: cannot parry or evade"; AP shown on the plates. This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261114-235620-c17f9e07.json` | Lost #3 | Claude | open | Paired with 235648. | See 235648. |
| `20261114-235608-3ba6fb9b.json` | Lost #2 note: parry bypass unclear | Claude | fixed | FR-09, Sev 2. Circumvent Parry is in the story only; a new player sees a good parry and damage. | the opponent's Special Effect choices called out on the stage, with one line of what each did. This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261114-235515-bf5abe9b.json` | Lost #2 | Claude | open | Paired with 235608. | See 235608. |
| `20261114-235443-429be9e6.json` | Lost #1 note: fell before roll, then stood | Claude | fixed | FR-08. Spring stage drew the fall early (cinematic stage now ties it to the beat). Arise via defensive opening not explained. | Plan G1 (as FR-11). This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261114-235443-caf4179e.json` | Lost #1 | Claude | open | Paired with 235443-429be9e6. | See that row. |
| `20261114-211141-765fcbb4.json` | evaded, never looked prone | Claude | likely fixed | As 000902 (CA-01). | Owner recheck only. |
| `20261114-211110-d7fbade2.json` | Lost #3: bout over | Claude | fixed | No note. Head Major Wound; same question as FR-15 likely. | Plan G2. This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261114-210930-f7d4b76a.json` | Lost #2 | Claude | open | No note; evaded, no damage. | Covered by FR-11. |
| `20261114-210857-157d4e44.json` | Lost #1 note: why am I opposing standing | Claude | fixed | FR-08b, Sev 3. Opponent evaded prone; player asked for an opposed Brawn roll (Regain Footing while engaged) with no explanation. | the roll says "Border Deserter tries to stand; resist with Brawn". This PR; tests `tests/pits-report-fixes-2.cjs`. |
| `20261114-210829-528a32f6.json` | Lost #1 | Claude | open | Paired with 210857. | See 210857. |
| [`20261114-195425-9374a0c7.json`](pits-records/20261114-195425-9374a0c7.json) | live resets / choppy finish | ChatGPT (Work), Claude | diagnosing | FR-06/07, Severity 3: owner-reported visual; default route, no spring parameter. | FR-06 fixed: no neutral reset between beats or after Press Advantage. FR-07 open: rear-knee jump (62 px) at the start of some finishing blows, also on `main`. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-195014-d319ec78.json`](pits-records/20261114-195014-d319ec78.json) | target marker off body part | ChatGPT (Work), Claude | fixed | FR-05, Severity 3: owner-reported visual; stage coordinates absent. | Marker follows the drawn part; SIZ scale no longer misplaces it. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-194925-1e948e3a.json`](pits-records/20261114-194925-1e948e3a.json) | 95% Trip odds | ChatGPT (Work), Claude | fixed | FR-04, Severity 3: comparator already uses higher successful roll; 59 versus Brawn 49 yields 95% in existing engine. | Panel explains odds against the roll made and the faces that resist; rule unchanged. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-191037-0aa0e36b.json`](pits-records/20261114-191037-0aa0e36b.json) | Lost #4 note | ChatGPT (Work), Claude | fixed | FR-01: pin finally recognised; missing explanation/animation. | Pin kept in its exchange; Still pinned line; reasons on Attack/Parry; escape told. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-191018-d306724a.json`](pits-records/20261114-191018-d306724a.json) | Lost #4 | ChatGPT (Work), Claude | fixed | FR-01: pin escape rolling; result not yet shown at the mark. | Pin kept in its exchange; Still pinned line; reasons on Attack/Parry; escape told. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-190951-59d95df7.json`](pits-records/20261114-190951-59d95df7.json) | hit / trip / hit again | ChatGPT (Work), Claude | fixed | FR-03: one engine hit, misordered presentation and separate Trip movement. | Offensive Trip keeps engine order; one blow carries it. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-190842-73af63e1.json`](pits-records/20261114-190842-73af63e1.json) | Lost #3 note | ChatGPT (Work), Claude | fixed | FR-02: Trip result unclear; paired with 6215d805. | Trip told plainly with both rolls. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-190820-6215d805.json`](pits-records/20261114-190820-6215d805.json) | Lost #3 | ChatGPT (Work), Claude | fixed | FR-02/03: Trip resisted; hit text precedes Trip and damage dice. | Trip told plainly with both rolls. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-190755-f1c514e9.json`](pits-records/20261114-190755-f1c514e9.json) | Lost #2 note | ChatGPT (Work), Claude | fixed | FR-01: cannot parry; paired with 7e81d526. | Pin kept in its exchange; Still pinned line; reasons on Attack/Parry; escape told. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-190744-7e81d526.json`](pits-records/20261114-190744-7e81d526.json) | Lost #2 | ChatGPT (Work), Claude | fixed | FR-01: weapon remains pinned when next defence is offered. | Pin kept in its exchange; Still pinned line; reasons on Attack/Parry; escape told. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-190727-7a13db21.json`](pits-records/20261114-190727-7a13db21.json) | Lost #1 note | ChatGPT (Work), Claude | fixed | FR-01: cannot attack / missing second effect; paired with a3bff8a7. | Pin kept in its exchange; Still pinned line; reasons on Attack/Parry; escape told. This PR; tests `tests/pits-report-fixes.cjs`. |
| [`20261114-190707-a3bff8a7.json`](pits-records/20261114-190707-a3bff8a7.json) | Lost #1 | ChatGPT (Work), Claude | fixed | FR-01: Pin Weapon missing from recap; Attack restriction has a recorded cause. | Pin kept in its exchange; Still pinned line; reasons on Attack/Parry; escape told. This PR; tests `tests/pits-report-fixes.cjs`. |
| `20261114-045813-120c8f7f.json` | blade isnt actually hitting body | Claude | fixed | Both chest wounds were to a fighter sat on the floor by a Trip. The cut was written for a standing target, so the arm could not reach down: the blade stopped about 57 units above the chest (the arm's reach limit). | The attacker's wind-up and blow aim low against a fighter on the floor (`pits-writer.js`, `LOW_AIM`); test in `tests/pits-spring-live.cjs` (fails at 56.6 before). |

## Ideas

Suggestions sent with the Pits **Idea** button (`[Idea]` notes). One row each: date, who, the idea, and what the owner decided.

| Date | From | Idea | Decision |
|---|---|---|---|
