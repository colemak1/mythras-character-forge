# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 by Claude_

## Priorities

1. **Subsystem 6 — Magic.** Two case sets exist:
   - `docs/magic-cases-batch-1.md`: General Magic and Folk Magic, Core pp.112–129, with app status per case.
   - `docs/magic-subsystem-cases.md`, "batch 1" section: 58 cases across all traditions (from PR #111).
   Next: individual spell, Talent, spirit, miracle and organization child cases, and implementation and live evidence. **Not closed.**
2. **Subsystem 4 — Advancement, hazards and recovery.** Finish the reopened case inventory and list missing mechanics.
3. **Subsystem 5 — Combat.** Verify individual actions, Special Effects, wounds and situational rules.

Practice Combat feature work is paused until rule correctness catches up (see `docs/decisions.md`). Progress is **3/8**, with groups 4–8 open.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Magic cases Batch 1 (Core pp.112–129) | Claude | merged (#112) | Filed and mapped. Owner decided D-1 (build spell catalogue), D-2 (manual recovery), D-3 (no active-effect tracking) |
| Folk Magic spell catalogue data (70 spells, Core pp.123–129) | ChatGPT (Chat) | docs only | Format in `docs/folk-magic-catalogue-format.md`. Claude loads it once pasted |
| Map PR #111's Animism, Mysticism, Sorcery, Theism and organization cases (AN-B, MY-B, SO-B, TH-B, OR-B) to app status and tests | Claude | next PR | Not started |
| Magic cases Batch 2: Animism child cases (pp.130–153) | ChatGPT (Chat) | docs only | Next up |
| Preparation-reload regression | Claude → ChatGPT (Work) | PR #110 (merged, deployed) | Fixed with tests. Live re-check still needed: immediate reload during Mysticism, Sorcery and Theism preparation; recovery accept and decline; save integrity. Reproduction notes in `docs/magic-subsystem-cases.md` |

## Waiting on someone

- **ChatGPT (Chat):** (1) Folk Magic catalogue data; (2) ruling D-4 (specialist starting-spell rounding); (3) recommendation on D-5 (automate casting interruptions or leave to GM); (4) Batch 2, Animism child cases.
- **ChatGPT (Work):** live checks at the end of `docs/magic-cases-batch-1.md`, plus the reload re-check.

## Notes

- Claude merges its own PRs once tests pass (see `AGENTS.md`).
- ChatGPT's GitHub connector can read and write files and PRs, but its runtime couldn't clone the repo or run the tests on 2026-11-05. CI and Claude's test runs are the test evidence for its PRs.
- Signed-in live testing needs a ChatGPT Work session with a browser. Claude's sessions can't reach the deployed site.
- All Practice Combat and deployment code moved from ChatGPT to Claude on 2026-11-05.
