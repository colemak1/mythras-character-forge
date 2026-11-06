# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by Claude (merged ChatGPT's PR #129)_

## Priorities

The owner deprioritized Magic on 2026-11-06: player-facing work comes first.

1. **Subsystem 8 — Campaign and live integration:** 183 app-behaviour cases in `docs/campaign-cases-batch-1.md`. Claude maps them, starting with server-enforced ownership and GM/player permissions, then save/reload, membership and invites, Party Board, imports and backups. **Open.**
2. **Subsystem 4 — Advancement:** all 216 cases mapped; rulings decided and implemented (PR #127). Optional extras: 1d6+1 improvement option, Passion shift helper. **Open.**
3. **Subsystem 5 — Combat:** mapped and extended (PRs #121, #122); all requested live checks passed (PRs #123, #126). Broader ledger gaps remain. **Open.**
4. **Subsystem 6 — Magic (paused).**

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Map Subsystem 8 cases; security review | Claude | next PR | Starting |
| New-item pop-up live check (PR #128) | ChatGPT (Work) | — | GM gives items with and without Reveal; player sees each once; survives reload; player autosave doesn't erase it |
| Multi-account permission tests | ChatGPT (Work) | after Claude's mapping | Disposable GM + 2 members + outsider accounts; direct backend requests, not just the UI |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells) and D-5 (casting interruptions left to the GM). Low priority while Magic is paused.
- **Owner (later):** Subsystem 8 product decisions ChatGPT flagged: invite-code visibility and rotation, removing members and transferring GM, multi-tab conflicts, campaign backup exports.

## Notes

- Combat live evidence (Creation Audit — Human, `71640fe7-…`): see `combat-cases-batch-1.md`. Fixture restored after each batch.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`).
- ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs; ChatGPT (Work) can run the tests.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
