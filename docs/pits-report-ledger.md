# Pits fight report ledger

One row per report from the `pits-reports` branch (`reports/`, see `docs/pits-reports.md`). Claude and ChatGPT both
write here; take a report by putting your name in **Who** before diagnosing it. Newest first.

**Status:** open, diagnosing, fixed (with the commit or PR), not a fault, stale page, rules question (for Chat).

| Report file | Note (short) | Who | Status | Finding | Fix |
|---|---|---|---|---|---|
| [`20261114-195425-9374a0c7.json`](pits-records/20261114-195425-9374a0c7.json) | live resets / choppy finish | ChatGPT (Work) | diagnosing | FR-06/07, Severity 3: owner-reported visual; default route, no spring parameter. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-195014-d319ec78.json`](pits-records/20261114-195014-d319ec78.json) | target marker off body part | ChatGPT (Work) | diagnosing | FR-05, Severity 3: owner-reported visual; stage coordinates absent. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-194925-1e948e3a.json`](pits-records/20261114-194925-1e948e3a.json) | 95% Trip odds | ChatGPT (Work) | diagnosing | FR-04, Severity 3: comparator already uses higher successful roll; 59 versus Brawn 49 yields 95% in existing engine. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-191037-0aa0e36b.json`](pits-records/20261114-191037-0aa0e36b.json) | Lost #4 note | ChatGPT (Work) | diagnosing | FR-01: pin finally recognised; missing explanation/animation. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-191018-d306724a.json`](pits-records/20261114-191018-d306724a.json) | Lost #4 | ChatGPT (Work) | diagnosing | FR-01: pin escape rolling; result not yet shown at the mark. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-190951-59d95df7.json`](pits-records/20261114-190951-59d95df7.json) | hit / trip / hit again | ChatGPT (Work) | diagnosing | FR-03: one engine hit, misordered presentation and separate Trip movement. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-190842-73af63e1.json`](pits-records/20261114-190842-73af63e1.json) | Lost #3 note | ChatGPT (Work) | diagnosing | FR-02: Trip result unclear; paired with 6215d805. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-190820-6215d805.json`](pits-records/20261114-190820-6215d805.json) | Lost #3 | ChatGPT (Work) | diagnosing | FR-02/03: Trip resisted; hit text precedes Trip and damage dice. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-190755-f1c514e9.json`](pits-records/20261114-190755-f1c514e9.json) | Lost #2 note | ChatGPT (Work) | diagnosing | FR-01: cannot parry; paired with 7e81d526. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-190744-7e81d526.json`](pits-records/20261114-190744-7e81d526.json) | Lost #2 | ChatGPT (Work) | diagnosing | FR-01: weapon remains pinned when next defence is offered. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-190727-7a13db21.json`](pits-records/20261114-190727-7a13db21.json) | Lost #1 note | ChatGPT (Work) | diagnosing | FR-01: cannot attack / missing second effect; paired with a3bff8a7. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| [`20261114-190707-a3bff8a7.json`](pits-records/20261114-190707-a3bff8a7.json) | Lost #1 | ChatGPT (Work) | diagnosing | FR-01: Pin Weapon missing from recap; Attack restriction has a recorded cause. | See [2026-11-14 batch](pits-reports-review-20261114.md); next: Claude. |
| `20261114-045813-120c8f7f.json` | blade isnt actually hitting body | Claude | fixed | Both chest wounds were to a fighter sat on the floor by a Trip. The cut was written for a standing target, so the arm could not reach down: the blade stopped about 57 units above the chest (the arm's reach limit). | The attacker's wind-up and blow aim low against a fighter on the floor (`pits-writer.js`, `LOW_AIM`); test in `tests/pits-spring-live.cjs` (fails at 56.6 before). |
