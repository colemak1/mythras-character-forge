# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 (America/Los_Angeles) by ChatGPT (Work)_

## Priorities

The owner deprioritized Magic on 2026-11-06: player-facing work comes first. Magic still gets done, later.

1. **Subsystem 5 — Combat:** verify actions, Special Effects, wounds and situational rules.
2. **Subsystem 4 — Advancement, hazards and recovery:** finish the reopened cases.
3. **Subsystem 6 — Magic (paused):** requested catalogue live acceptance **passed after PR #118**. Other open items in `magic-cases-batch-1.md`, `magic-cases-batch-2-animism.md` and `magic-subsystem-cases.md` remain deferred.

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Combat case inventory (subsystem 5) | ChatGPT (Chat) | docs-only PR | Next, replacing Animism children |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells) and D-5 (casting interruptions left to the GM). Low priority now that Magic is paused.
- **ChatGPT (Chat):** Combat cases (subsystem 5) in the usual table format. Magic children are paused.
- **Claude:** review/merge this docs-only catalogue acceptance report after Tests passes. No further catalogue fix is needed for the requested checks; continue with the Combat/Advancement priorities.

## Notes

- One continuous signed-in Test Player session: all three preparations recovered **1/2**; decline/reopen produced no repeated prompt. Folk rolls **67 failure (1 MP), 3 critical (0 MP), 56 failure (1 MP), 90 failure (1 MP), 42 failure (1 MP), 21 success (1 MP)**; 0 MP refused before a roll. Card: **1 Turn / Intensity 1 / Magnitude 1 / ranged 29 m**.
- Post-#118 signed-in catalogue-only recheck passed: **70 Core choices** counted; toggled Beastcall (X) off/on via picker; builder showed **Instant, Ranged, Resist (Willpower)**, **Core p.124**, **speciality: animal type**; Play Mode showed all three traits. No casts or reload regressions repeated. Evidence: `docs/magic-cases-batch-1.md`.
- Observed content-hash stamps matched **5675923**: data `cc7d574352`, render `d67cd54fd5`, cloud `153f1983e5`, play `5ffaf0d6f1`. The previous stale-picker failure is historical; PR #118's fix is accepted for these requested live checks.
- Prior source audit: user's uploaded `pdfcoffee.com_mythras-2e-2-pdf-free.pdf`; rendered printed pp.124/128 verified five numeric spot checks, including Bladesharp d8 values. That audit was not repeated.
- Retained **Magic Audit — Paired Skills**: Exhort 45%, Devotion (Audit Cult) 29%, Folk Magic 29%; personal MP **2/11**, pool **5/6**, one catalogue-resolved Beastcall (X), blank animal speciality, no pending preparations. Other ability entries remain. Select required paired skills again before future Mysticism/Sorcery tests.
- All **18** Node test files passed on **5675923** with the prescribed loop, including asset-version enforcement; `git diff --check` passed. Documentation only; **no production code was touched by ChatGPT**. Subsystem 6 remains open and paused; progress **3/8**.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md` for collaboration, rulings and format.
