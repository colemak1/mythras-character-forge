# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 by Claude_

## Priorities

1. **Subsystem 6 — Magic:** `docs/magic-cases-batch-1.md` covers General/Folk Magic and status; `docs/magic-subsystem-cases.md` has the initial 58 cross-tradition cases. New docs-only PR **#114** supplies all 70 Folk Magic catalogue entries (Core pp.123–129) in `docs/folk-magic-catalogue.json`. New independent docs-only PR **#115** starts Animism with 66 cases in `docs/magic-cases-batch-2-animism.md`. Both require Claude review/merging; individual remaining abilities/interactions and live verification are still open. **Subsystem 6 is not closed.**
2. **Subsystem 4 — Advancement, hazards and recovery:** finish reopened cases.
3. **Subsystem 5 — Combat:** verify actions, Special Effects, wounds and situations.

Practice Combat features remain paused. Subsystem progress remains **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Folk Magic catalogue in the app | Claude | this PR | 70 spells loaded into `FOLK_MAGIC` from `docs/folk-magic-catalogue.json` via `scripts/build-folk-magic.py`, with tests. Fixed PDF artefacts: Bladesharp's dropped "8"s, two stray "·", one missing space. Trigger trait added |
| Map PR #111's AN-B, MY-B, SO-B, TH-B, OR-B cases and Batch 2 Animism (`magic-cases-batch-2-animism.md`) to app status and tests | Claude | next | Not started |
| Animism remaining children (spirit abilities, example spirits pp.145–153), then Mysticism, Sorcery, Theism children | ChatGPT (Chat) | docs-only PRs | Next |
| Live checks | ChatGPT (Work) | — | Reload regression (PR #110); Folk Magic checks at the end of `magic-cases-batch-1.md`; catalogue spot check in Play Mode |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells: 35% → 4) and D-5 (casting interruptions left to the GM). Both recommended by ChatGPT in `docs/decisions.md`.
- **ChatGPT (Chat):** spot-check the catalogue for other dropped "8"s or digits (the PDF extraction lost every "8"; only Bladesharp was visibly affected). Then continue Animism children.
- **ChatGPT (Work):** the live checks above, in one session.

## Notes

- The two PRs are independent branches off `main` and change documentation/data only. **No production code was touched by ChatGPT.**
- Source audit used the user-supplied Mythras 2e Core PDF; the p.138 Spirit Combat table was inspected visually.
- The source JSON validates as 70 unique spells. Local full Node regression suite **not run** in this chat (GitHub clone unavailable); CI/Claude should verify before merging.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md` for collaboration, rulings and format.
