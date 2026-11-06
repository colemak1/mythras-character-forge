# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 by ChatGPT (Work; America/Los_Angeles)_

## Priorities

1. **Subsystem 6 — Magic:** PRs **#114–116 are merged**: 70 Core Folk spells and initial 66 Animism cases. **Live catalogue acceptance is still open:** the signed-in browser continued to show the old empty picker/manual-entry interface after reload despite a successful #116 Pages run. See `docs/magic-cases-batch-1.md`. PR #110 immediate-reload recovery passed for Mysticism, Sorcery and Theism, including decline/no-repeat; see `docs/magic-subsystem-cases.md`. **Subsystem 6 is not closed.**
2. **Subsystem 4 — Advancement, hazards and recovery:** finish reopened cases.
3. **Subsystem 5 — Combat:** verify actions, Special Effects, wounds and situations.

Practice Combat features remain paused. Subsystem progress remains **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Resolve live Folk catalogue mismatch | Claude | Follow-up to merged #116 | Main has 70 spells and passing tests, but live builder exposed none; manual Beastcall (X) had no traits/page/speciality. Check served asset bodies/invalidation: #116 changes data/render without bumping their index version parameters. Stale assets are a hypothesis, not a confirmed cause. |
| Map PR #111's AN-B, MY-B, SO-B, TH-B, OR-B cases and Batch 2 Animism (`magic-cases-batch-2-animism.md`) to app status and tests | Claude | next | Not started |
| Animism remaining children (spirit abilities, example spirits pp.145–153), then Mysticism, Sorcery, Theism children | ChatGPT (Chat) | docs-only PRs | Next |
| Catalogue acceptance after served-build correction | ChatGPT (Work) | After Claude follow-up | Recheck all 70 choices, Beastcall traits/Core p.124/animal speciality, Play Mode traits and five catalogue cards. Existing live casting costs/card metadata and reload checks passed; no need to repeat those solely for documentation. |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells: 35% → 4) and D-5 (casting interruptions left to the GM). Both recommended by ChatGPT in `docs/decisions.md`.
- **Claude:** review/merge this docs-only evidence PR once Tests passes; investigate the served catalogue mismatch in a separate code PR, then hand back for the remaining catalogue acceptance.
- **ChatGPT (Chat):** continue remaining Animism children, then the other traditions. Five-entry numeric spot check is complete (Bladesharp, Breath, Pierce, Sleep, Speedart); no additional defects found.

## Notes

- One continuous signed-in Test Player session: all three preparations recovered **1/2**; decline/reopen produced no repeated prompt. Folk rolls **67 failure (1 MP), 3 critical (0 MP), 56 failure (1 MP), 90 failure (1 MP), 42 failure (1 MP), 21 success (1 MP)**; 0 MP refused before a roll. Card: **1 Turn / Intensity 1 / Magnitude 1 / ranged 29 m**.
- Source: user's uploaded `pdfcoffee.com_mythras-2e-2-pdf-free.pdf`; garbled parsed text was verified visually against printed pp.124/128. Five source-data spot checks passed, including all Bladesharp d8 values; live catalogue cards were unavailable.
- Retained **Magic Audit — Paired Skills**: Exhort 45%, Devotion (Audit Cult) 29%, Folk Magic 29%; personal MP **2/11**, pool **5/6**, manual Beastcall (X), no pending preparations. Select the required paired skills again before future Mysticism/Sorcery tests. Other ability entries are retained.
- All **17** Node test files passed on **d5bc11a** with the prescribed loop. This session changes documentation only; **no production code was touched by ChatGPT**. Passing tests and successful Pages run do not certify the observed live catalogue.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md` for collaboration, rulings and format.
