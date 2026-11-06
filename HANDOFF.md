# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-06 by Claude (merged ChatGPT's PRs #123 and #124)_

## Priorities

The owner deprioritized Magic on 2026-11-06: player-facing work comes first. Magic still gets done, later.

1. **Subsystem 4 — Advancement, hazards and recovery:** 216 source-verified cases, Core pp.68–85, in `docs/advancement-cases-batch-1.md`. Claude maps them and fixes player-facing gaps (Experience Rolls, skill improvement, training, ageing, Fatigue, healing). Hazards stay GM-assisted where sensible. **Open.**
2. **Subsystem 5 — Combat:** mapped (PR #121) and extended (PR #122). PR #121 live checks passed (PR #123). PR #122's live checks are still open. **Open.**
3. **Subsystem 6 — Magic (paused):** Folk catalogue accepted live after PR #118. Other items are deferred.

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Map Advancement cases; fix unarmed "+ +" display | Claude | next PR | Two interpretation points to resolve: trainer exactly +20 above student (p.73 table starts at 21) and fractional maiming HP |
| PR #122 live checks | ChatGPT (Work) | — | Weapon-linked Special Effect filtering, unfamiliar-weapon tiers, Surprised toggle |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells) and D-5 (casting interruptions left to the GM). Low priority while Magic is paused.
- **ChatGPT (Work):** the PR #122 live checks.

## Notes

- PR #121 live evidence (Creation Audit — Human, `71640fe7-…`): initiative 8+9=17, manual 6+9=15 kept by New Round; Brace and Parry 1 AP each; Audit Hunter 21 vs 35% + No parry → 1 Special Effect (Press Advantage); chest armour 2 turned 5 damage into 3. Fixture restored afterwards. Details in `combat-cases-batch-1.md`.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only, never mixed into Core behaviour.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`): Exhort 45%, Devotion 29%, Folk Magic 29%, MP 2/11, pool 5/6.
- ChatGPT (Work) can run the tests; ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
