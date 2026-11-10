# Creatures — verified remaining code cases (2026-11-09)

**Source priority:** project-indexed *Mythras 2e Core Rulebook*, printed pp.111, 214 and 218–219 (PDF viewer pages printed+1); checked parsed text, and rendered p.214. Existing baseline: `docs/creature-cases-batch-1.md`, implementation B01–B20. This supplements, rather than restates, that ledger. This is **not** a claim that the GM tracker already has a Rabble/Underlings mode. These are code cases **if** that optional mode is offered; do not silently convert ordinary creature combatants into them.

| ID | Core page | Given → code-needed result / acceptance |
|---|---|---|
| CRTR-C21 | **p.111** | GM deliberately selects **Rabble** rather than a normal combatant → derive a *single simplified HP threshold* from one fifth of average species CON+SIZ, **rounded up**. Do not use the normal per-location HP/wound engine for this mode. Test fractions and a normal-creature control. |
| CRTR-C22 | **p.111** | Rabble takes its first positive damage → immediately ceases fighting. Below threshold it flees; at/above threshold it collapses; at least double threshold it dies. Rabble cannot choose Special Effects. Do not apply normal Serious/Major recovery thresholds to it. |
| CRTR-C23 | **p.111** | Rabble group reaches **one-third dead or wounded** → remaining members flee. Track group membership and wounded/dead counts; do not treat a single individual as the whole group. A threshold-crossing test should not fire early. |
| CRTR-C24 | **p.111** | GM deliberately selects **Underling** → use the simplified one-fifth-of-average-CON+SIZ HP figure, retain normal Special Effect eligibility, and keep its **two-injury** withdrawal counter distinct from current HP. Unlike Rabble's text, the Underling line does not expressly state a rounding method: use project rounding decision D-4 and label this as interpretation. |
| CRTR-C25 | **p.111** | Underling receives an injury reaching the HP threshold → automatically fails the applicable Serious Wound Endurance test; double threshold → death. After **two injuries**, cease fighting and withdraw if possible. Do not accidentally apply Rabble's first-hit flight rule. |
| CRTR-C26 | **p.111** | Half a group of Underlings are dead or wounded → the rest withdraw. Track this separately from Rabble's one-third morale trigger. |
| CRTR-C27 (**already built as CRTR-C03, PR #245**) | **pp.218–219** | A GM-authorized creature PC with a nonhuman body plan is damaged in Play Mode → resolve and persist its **actual named hit locations, armour and per-location HP** rather than the seven human boxes. The Pits currently refuses creature PCs; do not silently admit them. |

## Creature competence and GM procedures — reconciliation

- **Core p.214:** the ordinary creature uses the same characteristics, attributes and skills as PCs, except for the specified INT/INS treatment; the Core does **not** supply a universal alternate “creature competence” skill-rating table on this page. B01/B02 already cover creature skill and mind-data handling. **No new duplicate code case.**
- **Core p.111:** Rabble and Underlings are **optional combat simplifications** intended for expendable foes, not the default creature construction procedure. Cases C21–C26 are the remaining actionable GM encounter procedures that would require code *if surfaced in the combat tracker*; otherwise these are explicitly unsupported optional modes.
- **Games Master chapter, pp.278 onward:** tactical preparation, encounter design and general GM advice do not become code requirements simply because they appear in Core. No automatic encounter balancing or arbitrary competence generator is proposed. Additional specific procedures require their own source-checked, reproducible case before code is requested.
- **B20 per-entry powers, Core pp.220–273:** preserved as GM-resolved until a particular mechanic is approved for automation; do not invent blanket automation for dozens of distinct abilities.

**Evidence boundary:** source checks only, not a current implementation/test pass. No changes to `docs/subsystem-plan.md`: 5/8. Nonhuman location implementation still requires owner scope approval per `HANDOFF.md`.

**Claude review (2026-11-10):** accepted as a source-checked inventory. C27 is CRTR-C03, built in #245. C21–C26 describe an optional GM tracker mode that doesn't exist; building it would widen GM-managed scope, so it waits for an owner decision ("offer Rabble/Underlings in the tracker?"). Until then they are recorded as unsupported optional rules, not open defects.

**Claude, built (2026-11-10):** the owner's 8/8 plan put Rabble/Underlings in scope (HANDOFF, "Rabble/Underlings included"). C21–C26 are in the GM tracker as an optional "Fights as" choice per creature; normal creatures are unchanged. Group = same creature name and mode. Underling rounding follows D-4 (project reading). Tests: `tests/creature-cases.cjs`. Not live-checked.
