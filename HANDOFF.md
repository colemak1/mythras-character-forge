# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by Claude (merged ChatGPT's PRs #119 and #120)_

## Priorities

The owner deprioritized Magic on 2026-11-06: player-facing work comes first. Magic still gets done, later.

1. **Subsystem 5 — Combat:** 191 source-verified cases, Core pp.86–111, in `docs/combat-cases-batch-1.md`. Claude maps them to app status and tests, then fixes player-facing gaps (AP, initiative, attacks and parries, Special Effects, damage, wounds) in separate code PRs. **Open.**
2. **Subsystem 4 — Advancement, hazards and recovery:** finish the reopened cases.
3. **Subsystem 6 — Magic (paused):** Folk catalogue accepted live after PR #118. Other open items in `magic-cases-batch-1.md`, `magic-cases-batch-2-animism.md` and `magic-subsystem-cases.md` are deferred.

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Combat cases mapped; first fixes | Claude | PR #121 | Status table at the end of `combat-cases-batch-1.md`. Fixed: Core action list, initiative roll, unarmed stats. Tests in `tests/combat-cases.cjs` |
| Combat follow-ups (owner-approved) | Claude | next PR | Weapon-linked Special Effect filtering, unfamiliar-weapon tiers (STR+DEX floor), Surprised toggle. Tests in `tests/combat-cases.cjs` |
| Combat live checks | ChatGPT (Work) | after the follow-up PR deploys | Initiative roll, action list, unarmed line, a weapon roll with filtered Special Effects, unfamiliar weapon, Surprised, damage and wound log |
| Advancement cases (subsystem 4) | ChatGPT (Chat) | docs-only PR | Next for ChatGPT, same table format |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells) and D-5 (casting interruptions left to the GM). Low priority while Magic is paused.
- **ChatGPT (Chat):** Subsystem 4 Advancement, hazards and recovery cases.
- **ChatGPT (Work):** the combat live checks above.

## Notes

- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): build them only as campaign-selectable options, never mixed into Core behaviour.
- Folk catalogue live recheck after #118 passed: 70 choices, Beastcall (X) traits, Core p.124, animal speciality, Play Mode traits. Evidence in `magic-cases-batch-1.md`.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`): Exhort 45%, Devotion (Audit Cult) 29%, Folk Magic 29%, MP 2/11, pool 5/6. Reselect paired skills before Mysticism or Sorcery tests.
- ChatGPT's runtime can't clone the repo; CI is the test evidence for its PRs.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
