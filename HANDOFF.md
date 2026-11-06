# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by ChatGPT (Chat)_

## Priorities

The owner deprioritized Magic on 2026-11-06: player-facing work comes first. Magic still gets done, later.

1. **Subsystem 5 — Combat:** 191 source-verified cases covering Core pp.86–111 in `docs/combat-cases-batch-1.md` (ChatGPT docs-only PR pending review). Claude to map existing app behavior, add focused tests/fixes and schedule live acceptance. **Still open.**
2. **Subsystem 4 — Advancement, hazards and recovery:** finish the reopened cases.
3. **Subsystem 6 — Magic (paused after the catalogue check):** catalogue live acceptance, then the open items listed in `magic-cases-batch-1.md`, `magic-cases-batch-2-animism.md` and `magic-subsystem-cases.md`.

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Stale live assets (catalogue not showing) | Claude | this PR | Cause: `?v=` cache stamps in `index.html` were hand-numbered and weren't bumped for PRs #110, #112 and #116, so browsers could keep old JS. Now content-hashed by `scripts/stamp-assets.py`, enforced by `tests/asset-versions.cjs` |
| Folk catalogue live acceptance | ChatGPT (Work) | after this PR deploys | 70 choices in the picker; Beastcall (X) traits, Core p.124, animal speciality; Play Mode traits |
| Combat case inventory (subsystem 5) | ChatGPT (Chat) → Claude | `docs/subsystem-5-combat-cases-batch1-20261106` (docs-only PR) | **191 cases drafted and source-verified**, including every one of 43 named Special Effects; Claude to review, map cases to app/tests and implement in separate code branch. Subsystem 5 open. |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells) and D-5 (casting interruptions left to the GM). Low priority now that Magic is paused.
- **Claude:** review the Combat source-case PR (`docs/combat-cases-batch-1.md`) once CI is green; map IDs to Pass/Guidance/GM-assisted/Not implemented/Decision, then implement prioritized player-facing fixes and tests separately. Magic children remain paused.
- **ChatGPT (Work):** the catalogue acceptance above.

## Notes

- Combat batch 1 source: uploaded Mythras 2e Core pp.86–111, supporting attribute p.8 and differential-roll p.51. **191 source cases** across nine groups, **43 individual Special Effects**. Source/case inventory is not app verification, and progress remains **3/8**. Only docs and HANDOFF/CHANGELOG changed; no production code, workflows or tests edited. Local Node suite unavailable because this runtime cannot clone GitHub; check PR CI.


- One continuous signed-in Test Player session: all three preparations recovered **1/2**; decline/reopen produced no repeated prompt. Folk rolls **67 failure (1 MP), 3 critical (0 MP), 56 failure (1 MP), 90 failure (1 MP), 42 failure (1 MP), 21 success (1 MP)**; 0 MP refused before a roll. Card: **1 Turn / Intensity 1 / Magnitude 1 / ranged 29 m**.
- Source: user's uploaded `pdfcoffee.com_mythras-2e-2-pdf-free.pdf`; garbled parsed text was verified visually against printed pp.124/128. Five source-data spot checks passed, including all Bladesharp d8 values; live catalogue cards were unavailable.
- Retained **Magic Audit — Paired Skills**: Exhort 45%, Devotion (Audit Cult) 29%, Folk Magic 29%; personal MP **2/11**, pool **5/6**, manual Beastcall (X), no pending preparations. Select the required paired skills again before future Mysticism/Sorcery tests. Other ability entries are retained.
- All **17** Node test files passed on **d5bc11a** with the prescribed loop. This session changes documentation only; **no production code was touched by ChatGPT**. Passing tests and successful Pages run do not certify the observed live catalogue.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md` for collaboration, rulings and format.
