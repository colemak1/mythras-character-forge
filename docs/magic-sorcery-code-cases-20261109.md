# Magic batch 4 — Sorcery: code-needed cases

**Source:** *Mythras 2e Core*, printed pp.161–177; indexed PDF p.161 checked; existing `docs/magic-subsystem-cases.md` SO-B01–12. **Implementation comparison:** `js/engine.js` already enforces Shaping five components, budget, Combine distinct spells/source guard, lower Invocation and outcome cost. Do not duplicate MAG-N01–03/N10.

| ID | Core page | Required code delta and acceptance |
|---|---|---|
| SO-C01 (built 2026-11-11, `tests/magic-learning.cjs`) | **pp.118, 161** | When **learning a new Sorcery spell**, distinguish acquisition from merely recording a spell name. Core's learning procedure for non-Folk magical abilities needs **5 Experience Rolls and one month** of study plus source/teacher/GM approval. Provide a confirmed learning action and a nonspendable reference-entry state; do not auto-charge for imported legacy records. |
| SO-C02 (open: needs the p.119 action list) | **p.165** | On **multi-turn Invocation preparation**, enforce the Core p.119 restrictions against incompatible ordinary actions, with an explicit GM-adjudicated interruption prompt. Reacting does not automatically cancel casting; injurious interruption uses D-5. Persist a pending cast without a second early MP charge after reload. |
| SO-C03 (no code until optional components are offered) | **pp.163, 165** | If **optional Shaping components** (e.g. alternate casting-speed/duration rules) are ever offered, they must be a separate campaign option and must not change the five default components. Block an optional-only component when the option is off, preserving existing legacy data for review. |

**Excluded by D-3:** live tracking of multiple active Sorcery effects and Concentration-spell overlap. The existing notes explicitly leave ongoing effects to the table; do **not** turn SO-B11 into compulsory automated tracking. Individual spell entries pp.166–177 stay GM-resolved until individual child cases are approved. Progress 5/8.