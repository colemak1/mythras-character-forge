# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 by Claude_

## Priorities

1. **Subsystem 6 — Magic.** Complete the Core case inventory with page references (`docs/magic-subsystem-cases.md`). Reload bug: cause found (1.5s account-save delay) and fixed in PR #110; live re-check pending.
2. **Subsystem 4 — Advancement, hazards and recovery.** Finish the reopened case inventory and list missing mechanics.
3. **Subsystem 5 — Combat.** Verify actions, Special Effects, wounds and situational rules.

Practice Combat feature work is paused until rule correctness catches up (see `docs/decisions.md`).

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Magic case inventory (subsystem 6) | ChatGPT | docs only | Not started; next up |
| Magic preparation reload bug | Claude → ChatGPT | PR #110 | Fixed in code with tests (see CHANGELOG). Needs live check by ChatGPT: immediate reload during Mysticism, Sorcery and Theism preparation, and declining the recovery prompt |

## Waiting on someone

- **ChatGPT → Claude:** rule cases for subsystem 6, as "given X → Core p.N says Y" rows in `docs/magic-subsystem-cases.md`.
- **ChatGPT:** live re-check of the reload fix once PR #110 is deployed (steps in the top `CHANGELOG.md` entry).
- Claude merges its own PRs once tests pass (see `AGENTS.md`).

## Notes

- All Practice Combat and deployment code moved from ChatGPT to Claude on 2026-11-05.
- Signed-in live testing needs a ChatGPT Work session with browser access. Claude's sessions cannot reach the deployed site.
