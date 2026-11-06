# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 (America/Los_Angeles) by ChatGPT (Work)_

## Priorities

The owner deprioritized Magic on 2026-11-06: player-facing work comes first. Magic still gets done, later.

1. **Subsystem 5 — Combat:** 191 source-verified cases, Core pp.86–111, mapped by Claude in PR #121. Requested live batch passed for initiative/manual entry/round retention, action groups and sampled AP costs, unarmed stats, No parry → Special Effect and armour deduction. Minor unarmed double-plus formatting remains. Evidence: `docs/combat-cases-batch-1.md`. Broader closeout gaps remain **open**.
2. **Subsystem 4 — Advancement, hazards and recovery:** finish the reopened cases.
3. **Subsystem 6 — Magic (paused):** Folk catalogue accepted live after PR #118. Other open items in `magic-cases-batch-1.md`, `magic-cases-batch-2-animism.md` and `magic-subsystem-cases.md` are deferred.

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| PR #121 live evidence / cosmetic follow-up | Claude | Review this docs-only report | Requested live checks passed; review/merge after Tests. Unarmed damage displays `1d3 + +0` (also `1d3 + +1d2` on another fixture); remove duplicate plus in a later code change if desired. |
| Additional combat live checks | ChatGPT (Work) | After follow-up deployment | Weapon-linked Special Effect filtering, unfamiliar-weapon tiers (STR+DEX floor) and Surprised toggle are now on main at 8e0959d. They were not tested in the PR #121 batch. |
| Advancement cases (subsystem 4) | ChatGPT (Chat) | docs-only PR | Next for ChatGPT, same table format |

## Waiting on someone

- **Owner:** confirm D-4 (round up specialist starting spells) and D-5 (casting interruptions left to the GM). Low priority while Magic is paused.
- **ChatGPT (Chat):** Subsystem 4 Advancement, hazards and recovery cases.
- **Claude:** review/merge this docs-only live evidence PR once Tests passes. No blocking failure in the requested workflow; optional combat improvements remain in the case ledger.
- **ChatGPT (Work):** the separate follow-up checks above when requested; preserve their unverified status until tested.

## Notes

- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): build them only as campaign-selectable options, never mixed into Core behaviour.
- Folk catalogue live recheck after #118 passed: 70 choices, Beastcall (X) traits, Core p.124, animal speciality, Play Mode traits. Evidence in `magic-cases-batch-1.md`.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`): Exhort 45%, Devotion (Audit Cult) 29%, Folk Magic 29%, MP 2/11, pool 5/6. Reselect paired skills before Mysticism or Sorcery tests.
- Signed-in Test Player used **Creation Audit — Human** (`71640fe7-6a99-4cbf-b0e4-a5045b70aab9`): initiative **8+9=17**, manual **6+9=15** retained by New Round; Brace/Parry spent **1 AP** each. Audit Hunter **21 vs 35%** succeeded, No parry awarded **1 SE**, **Press Advantage** recorded. Earlier rolls **98/36** failed with no SE.
- Temporary chest armour **AP 2** reduced **5 damage to 3 HP**, Chest **7→4/7**, Minor Wound. Restored armour to None, Chest **7/7**, all locations healthy, silver **90**, AP **2/2**, initiative not rolled. Test attack logs retained. Serious/Major wound checks were not repeated.
- Runtime repository access worked in this Work session. All **19** Node test files passed on **8b256e6** using the required loop; `git diff --check` passed. No production code or tests changed. Progress **3/8**; Magic and Practice Combat remain paused.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
