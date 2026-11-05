# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 by Claude_

## Priorities

1. **Subsystem 6 — Magic.** Complete the Core case inventory with page references (`docs/magic-subsystem-cases.md`). Open bug: intermittent loss of in-progress preparation after reload, not fully reproduced.
2. **Subsystem 4 — Advancement, hazards and recovery.** Finish the reopened case inventory and list missing mechanics.
3. **Subsystem 5 — Combat.** Verify actions, Special Effects, wounds and situational rules.

Practice Combat feature work is paused until rule correctness catches up (see `docs/decisions.md`).

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Magic case inventory (subsystem 6) | ChatGPT | docs only | Not started; next up |
| Reproduce and fix the magic preparation reload bug | Claude | — | Waiting for a reproduction case from ChatGPT, or Claude investigates directly |

## Waiting on someone

- **ChatGPT → Claude:** rule cases for subsystem 6, as "given X → Core p.N says Y" rows in `docs/magic-subsystem-cases.md`.
- **Owner:** merge the setup PR (CI, this file, `AGENTS.md`, merged `CHANGELOG.md`).

## Notes

- All Practice Combat and deployment code moved from ChatGPT to Claude on 2026-11-05.
- Signed-in live testing needs a ChatGPT Work session with browser access. Claude's sessions cannot reach the deployed site.
