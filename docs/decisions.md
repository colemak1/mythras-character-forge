# Project decisions

Standing rulings and product decisions. Add an entry whenever something is agreed, with the date and where it came from. Rule-by-rule interpretations belong in the relevant `*-cases.md` ledger.

| Decision | Status | Notes |
|---|---|---|
| Mythras Core is authoritative; Sit'ota house rules are kept separate and labelled | Confirmed 2026-11-05 | Also in `master-core-rules-checklist.md` |
| Optional Range rules are enabled | Confirmed 2026-11-05 | Needs a check that the app's range handling matches this |
| Keep the 1–4 Cultural Combat Style allocation as an explicit house-rule option | Confirmed 2026-11-05 | Also in `master-core-rules-checklist.md` and `core-culture-cases.md` (CU-01b) |
| Player dice rolls are prompted, not resolved automatically | Confirmed 2026-11-05 | Practice Combat uses manual d100 prompts |
| Practice Combat is a roguelite gauntlet: saved characters, increasingly difficult opponents, contextual combat teaching; not a story mode | Confirmed 2026-11-05 | |
| Rule correctness (subsystems 4–8) takes priority over new Practice Combat features | Confirmed 2026-11-05 | See `subsystem-plan.md` |
| Claude owns all production code; ChatGPT owns rule verification, case specs and live acceptance testing | Confirmed 2026-11-05 | See `AGENTS.md` |
| The owner has explicit permission to use Mythras Core rulebook text directly in the app | Confirmed 2026-11-05 (owner) | ChatGPT supplies text and data from the book; Claude builds the features |
| D-1: build the Folk Magic spell catalogue from Core pp.123–129 | Approved 2026-11-05 | ChatGPT supplies the data (`docs/folk-magic-catalogue-format.md`); Claude loads it into `FOLK_MAGIC` |
| D-2: Magic Point recovery stays manual | Decided 2026-11-05 (owner) | The owner's campaign uses unusual recovery methods. No sources, schedules or automatic recovery. Committed MP for ongoing magic (MG-044) is also left to the table |
| D-3: no tracking of active Folk, Sorcery or Theism effects | Decided 2026-11-05 (owner) | Duration, concentration, trigger and dismissal stay at the table, to keep scope down. The existing Mysticism active-Talent toggle stays |
| D-4: Rounding — specialist Folk Magic starting spells and fractional recovery ceilings | ChatGPT source interpretation, 2026-11-05; owner/Claude to confirm | Core p.121 says 'one tenth' for specialists without explicit rounding; p.118 says one per 20% 'or part thereof', p.155 gives 34% → Intensity 2 and p.148 says 'rounding up as usual'. Recommend **round up**: 35% Folk Magic → 4 spells. Core p.116 shrine example is 25% of 16 MP → 4, not a fractional example; recommend round up 25% of 15 MP → 4 as an interpretation. MP recovery remains manual (D-2). |
| D-5: casting interruptions | ChatGPT recommendation, 2026-11-05; pending owner confirmation | Core p.119: Minor/Serious Wounds can require Willpower and grade changes; Major Wound or domination fails casting. For lean scope leave detection, tests and failure adjudication to GM; provide contextual rule guidance/manual cancel/fail, not automatic HP-driven interruption logic. |
| Magic is deprioritized: work that directly affects players at the table comes first | Decided 2026-11-06 (owner) | Magic still gets implemented, after combat, advancement and other player-facing work. Finish only the in-flight catalogue check |
| Mythras Companion rules are optional | Decided 2026-11-06 (owner) | Build Companion content only as campaign-selectable options, never mixed into Core behaviour |
| Trainer exactly 20% better than the student uses the first Training Improvement row (1d2) | Decided 2026-11-06 (owner delegated to Claude) | Core p.73 text says "at least 20%" while the table starts at 21–30%. Advancement case A4-T02 |
| Permanent injury (maiming): fractional HP lost rounds up | Decided 2026-11-06 (owner delegated to Claude) | Core p.80 gives thirds without a rounding rule; rounding up follows the book's usual convention and D-4. Location maximum never below 1. Cases A4-H24, H25 |
| After Subsystem 8's critical work, pause subsystem audits for a Play Mode usability overhaul | Decided 2026-11-06 (owner) | Proposal first (`play-mode-ux-proposal.md`); no redesign code before approval; implement in batches preserving the engine; resume audits afterwards |
| Play Mode redesign direction approved: clean D&D Beyond-style layout, Skills as default tab, physics dice from Practice Combat, short tips; a player style picker later | Decided 2026-11-06 (owner) | See `play-mode-ux-proposal.md`; themes are token sets under `data-pm-style` |
| Play Mode Advance Time menu: rest one day (Minor Wounds heal Healing Rate), recover one Fatigue level, end the fight, new session (refill Luck); MP stays manual | Decided 2026-11-06 (owner) | Serious/Major recovery stays per location (week/month, Core p.80) |
| Ranged weapons cannot Parry; Play Mode shows Attack only on ranged weapon cards (shields still parry incoming missiles, Core p.107) | Decided 2026-11-06 (owner) | Combat cases C5-B2-X11 |
| Play Mode polish is on the back burner until the owner is at a PC; audits resume | Decided 2026-11-06 (owner) | Phone-width check and remaining Play Mode notes wait |
| Skill improvement 1d6+1 is an optional campaign rule; Core 1d4+1 stays the default | Decided 2026-11-06 (owner) | Core p.72. The GM sets it in Campaign rules. It applies to skills and Passions; standalone characters use 1d4+1. Advancement case X14 |
| Add the Passion Deepening and Waning helper (Weak 1d10, Moderate 1d10+5, Strong 1d10+10) | Decided 2026-11-06 (owner delegated to Claude) | Core p.82. The GM picks the strength and direction; waning stops at 0. Advancement case X19 |
| v0 joins as a design-mockup assistant only | Decided 2026-11-06 (owner) | v0 never commits. Claude rebuilds the chosen mockup in the existing code; see `AGENTS.md` |

