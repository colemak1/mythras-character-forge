# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 by ChatGPT_

## Priorities

1. **Subsystem 6 — Magic.** First source-verification batch delivered: **58** Core-page acceptance cases in `docs/magic-subsystem-cases.md` (PR #111). Next: individual spell/Talent/spirit/miracle/organization children, interactions and implementation/live evidence. **Not closed.**
2. **Subsystem 4 — Advancement, hazards and recovery.** Finish reopened source-case inventory and missing mechanics.
3. **Subsystem 5 — Combat.** Verify individual actions, Special Effects, wounds and situational rules.

Practice Combat feature work remains paused until rule correctness catches up (`docs/decisions.md`). Progress remains **3/8**, with groups 4–8 open.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Magic case specification — batch 1 | ChatGPT | `audit/magic-source-cases-and-reload-repro` / PR #111 | **58 source-verified Given → Core page cases and reload reproduction delivered**. No production code changed. Further ability child cases still needed. |
| Magic case implementation and automated regression checks | Claude | TBD | Review PR #111's cases; implement supported behavior and tests without assuming that source-verified cases already pass. |
| Preparation-reload regression | Claude → ChatGPT Work | PR #110 | Claude identified the **1.5s account-save delay** and reports a fix with tests. Signed-in deployed retest still needed: immediate reload during Mysticism, Sorcery and Theism preparations, plus recovery accept/decline and save integrity. Historical reproduction in `docs/magic-subsystem-cases.md`. |

## Waiting on someone

- **Owner:** merge setup/fix PR #110 first, then PR #111 (currently stacked on #110; retarget to `main` after #110 merges if needed).
- **Claude:** review the 58 case specifications, create implementation/tests and report disagreements with exact printed Core page references.
- **ChatGPT Work:** independently recheck the deployed reload fix when browser/sign-in access is available. ChatGPT to continue individual ability child-case inventory in subsequent batches.

## Notes

- GitHub connector can read/write source files and PRs from ChatGPT; interactive signed-in acceptance testing requires a Work browser session.
- Complete local `tests/*.cjs` execution was **not possible this session** because the runtime could not clone GitHub (network/DNS unavailable). PR CI and Claude's test run must be checked; no test pass is claimed.
- Claude owns production code and deployment; ChatGPT owns Core verification and specs. See `AGENTS.md`.
