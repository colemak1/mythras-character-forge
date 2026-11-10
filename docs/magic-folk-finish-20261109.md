# Magic follow-up — Folk Magic finish (batch 1, 2026-11-09)

**Authority:** Mythras Core printed pp.112–129; existing source-checked inventory `docs/magic-cases-batch-1.md`, `docs/magic-subsystem-cases.md`, decisions D-1 through D-5. **Scope:** code-needed only; no repetition of accepted 70-spell catalogue or normal 0 MP block. Source-specific rule wording must be rechecked against the uploaded PDF before implementation.

| ID | Core page | Given → expected change |
|---|---|---|
| FM-F01 | p.121 | Specialist Folk Magic start with a fractional one-tenth skill allowance → round up per D-4 (35% → 4), persist through creation and reload. **Already built (D-4).** |
| FM-F02 | pp.118–119 | Casting is interrupted by a Minor/Serious/Major Wound or mental domination → provide the GM-prompted interruption choices and apply D-5's Willpower/difficulty/failure results; never infer timing from HP alone. **Implemented 2026-11-10 (Claude)**, `tests/magic-casting-hurt.cjs`. |
| FM-F03 | pp.49–50, 118–119 | A casting grade changes a fractional skill threshold → use the same project-wide rounding decision as D-CE2 and test a boundary roll. **Implemented 2026-11-10 (Claude)** with D-CE2 (80% at Hard is 54). |

**Intentionally excluded by owner:** automatic MP recovery (D-2), active Folk Magic spell-effect tracking (D-3), and inventing spell-specific automatic outcomes. The catalogue's 70 choices and Beastcall example already have scoped live evidence; do not rewrite them.

**Next tradition batch:** Animism, after checking existing AN-B and MAG-N cases against current code, retaining only code-needed deltas. Then Mysticism, Sorcery, Theism/cults, organisations, one batch at a time. This document does not close Subsystem 6.