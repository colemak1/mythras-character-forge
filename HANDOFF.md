# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated: 2026-11-05 by ChatGPT (Chat)_

## Priorities

1. **Subsystem 6 — Magic:** `docs/magic-cases-batch-1.md` covers General/Folk Magic and status; `docs/magic-subsystem-cases.md` has the initial 58 cross-tradition cases. New docs-only PR **#114** supplies all 70 Folk Magic catalogue entries (Core pp.123–129) in `docs/folk-magic-catalogue.json`. New independent docs-only PR **#115** starts Animism with 66 cases in `docs/magic-cases-batch-2-animism.md`. Both require Claude review/merging; individual remaining abilities/interactions and live verification are still open. **Subsystem 6 is not closed.**
2. **Subsystem 4 — Advancement, hazards and recovery:** finish reopened cases.
3. **Subsystem 5 — Combat:** verify actions, Special Effects, wounds and situations.

Practice Combat features remain paused. Subsystem progress remains **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Folk Magic catalogue / 70 Core spells | ChatGPT (Chat) → Claude | PR #114, `docs/folk-magic-catalogue.json` | Complete source data in prescribed schema; Claude to review/merge and separately load in `js/data.js` with tests. Do not add active-effect tracking (D-3). |
| D-4 specialist/recovery rounding | ChatGPT (Chat) → Claude/owner | PR #114 `docs/decisions.md` | Recommend rounding up (Core pp.118,148,155 examples/conventions); **pp.121/116 do not explicitly specify fractional rounding**, so log as interpretation rather than verbatim Core. Recovery remains manual (D-2). |
| D-5 casting interruption automation | ChatGPT (Chat) → owner | PR #114 `docs/decisions.md` | Recommend GM adjudication, concise guidance and manual cancel/fail; **owner confirmation pending**. Do not automatically infer casting interruption from HP changes. |
| Animism child cases, initial 66 | ChatGPT (Chat) → Claude | PR #115, `docs/magic-cases-batch-2-animism.md` | Source cases delivered; remaining spirit abilities, example spirit-stat tables and interactions are still open for further inventory. |
| Cross-tradition case status/test mapping | Claude | `docs/magic-subsystem-cases.md` | Review existing AN-B/MY-B/SO-B/TH-B/OR-B cases and avoid duplicate IDs/counts. |
| Preparation-reload regression | Claude → ChatGPT (Work) | PR #110 merged/deployed | Code fix with tests; signed-in live test still pending for immediate reload in Mysticism, Sorcery, Theism and recovery prompt accept/decline. |

## Waiting on someone

- **Claude:** read this handoff; review and merge PR #114 (catalogue) and PR #115 (Animism) after Tests check; implement Folk catalogue load with tests in **Claude-owned** code branch. Review exact sources and flag questionable entries rather than silently changing them.
- **Owner:** confirm or adjust D-5 recommendation; D-4 is a documented interpretation awaiting owner/Claude confirmation.
- **ChatGPT (Chat):** continue remaining Animism ability and example-type children in a later source batch; proceed to Mysticism/Sorcery/Theism child cases afterward.
- **ChatGPT (Work):** batch signed-in live checks with the reload regression when Work browser access is available.

## Notes

- The two PRs are independent branches off `main` and change documentation/data only. **No production code was touched by ChatGPT.**
- Source audit used the user-supplied Mythras 2e Core PDF; the p.138 Spirit Combat table was inspected visually.
- The source JSON validates as 70 unique spells. Local full Node regression suite **not run** in this chat (GitHub clone unavailable); CI/Claude should verify before merging.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md` for collaboration, rulings and format.
