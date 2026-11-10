# Creatures — remaining code-needed cases (2026-11-09)

**Scope:** additional work after CRTR-B01–B20; do not repeat implemented cases. Core printed page numbers. These are **candidate code cases pending a fresh Core PDF text/page verification**, not a complete chapter certification. Do not implement guessed tables. Source context: `docs/creature-cases-batch-1.md` and `HANDOFF.md`.

| ID | Core page | Given → code-needed outcome |
|---|---|---|
| CRTR-C01 | pp.214–215 | Creature with INS rather than INT and skill entries → use its creature competence/skill conventions in any generated opponent or imported combatant; do not quietly give human PC career percentages. Verify exact competence bands and skill formulas from Core before implementation. |
| CRTR-C02 | pp.214–215 | Creature without a listed skill attempts a task → distinguish the creature's listed skills from the default characteristic-based chance and any species-specific competence; do not manufacture a generic fixed skill. Verify the precise default rule before coding. |
| CRTR-C03 | pp.218–219 | GM-approved nonhuman character enters Play Mode → track damage and wounds against **its own anatomy and HP**, not the seven human location boxes; preserve hit locations on save/reload. **Implemented 2026-11-10 (Claude)**, `tests/creature-pc.cjs`; the GM tracker takes the same locations when it adds the character. |
| CRTR-C04 | pp.220–273 | Entry-specific creature ability requires resolution → build a child case and fixture for that exact ability only; retain GM-resolved text until verified. No blanket 'bestiary complete' claim. |

## Rabble / Underlings and GM procedures — verification gate

The existing B01–B20 ledger does **not** inventory these procedures or establish which ones require automation. Before assigning a code case, inspect the Core chapter's Rabble/Underlings and GM procedure sections in the uploaded PDF, including the rendered pages for tables. Record only cases where the existing GM tracker or The Pits would otherwise produce a wrong mechanical result; skip narrative encounter-design advice and GM-only judgment. **Blocked for source verification in this batch:** no accessible complete Core chapter text/page images were retrieved. Do not attach speculative page numbers or claim the inventory complete.

**Boundary:** optional anatomy presets and Chaos tables are already documented as implemented; no duplicate cases. Creature tracker signed-in checks and creature-PC path remain pending live acceptance. Progress stays 5/8.