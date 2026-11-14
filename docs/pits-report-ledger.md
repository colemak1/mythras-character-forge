# Pits fight report ledger

One row per report from the `pits-reports` branch (`reports/`, see `docs/pits-reports.md`). Claude and ChatGPT both
write here; take a report by putting your name in **Who** before diagnosing it. Newest first.

**Status:** open, diagnosing, fixed (with the commit or PR), not a fault, stale page, rules question (for Chat).

| Report file | Note (short) | Who | Status | Finding | Fix |
|---|---|---|---|---|---|
| `20261114-045813-120c8f7f.json` | blade isnt actually hitting body | Claude | fixed | Both chest wounds were to a fighter sat on the floor by a Trip. The cut was written for a standing target, so the arm could not reach down: the blade stopped about 57 units above the chest (the arm's reach limit). | The attacker's wind-up and blow aim low against a fighter on the floor (`pits-writer.js`, `LOW_AIM`); test in `tests/pits-spring-live.cjs` (fails at 56.6 before). |
