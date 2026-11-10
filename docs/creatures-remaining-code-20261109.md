# Creatures — remaining code-needed cases (source reconciliation, 2026-11-09)

**Primary source:** user's project-indexed *Mythras 2e Core Rulebook*, printed pp.110–111, 214, 218–219; parsed text cross-checked against available rendered pages. p.111 is **Combat: Optional Rules — Rabble & Underlings**, not a mandatory Creatures-chapter procedure. Baseline: `docs/creature-cases-batch-1.md`, `docs/decisions.md`, `HANDOFF.md`. **Status: source specs, not live/automated acceptance.**

## Remaining required code: creature-character wound classification

| ID | Core page | Given → expected result |
|---|---|---|
| CRTR-C03-W | **p.110; pp.214, 218–219** | A nonhuman PC suffers a Serious/Major Wound to a Wing, Tail, or other appendage → **do not force it into the torso/head branch because its name does not end in Arm or Leg.** Ask/record the GM's function-based class (limb-equivalent vs vital/non-limb) and the appropriate consequence. Wing that enables flight can be disabled without inventing a human-arm drop-item result; a locomotor/prehensile Tail may be limb-equivalent, while a nonfunctional tail need not be. Preserve the choice with saved anatomy; keep human arms/legs/head unchanged. Core p.110 does **not** explicitly classify every wing/tail; this is a required GM-guided interpretation, **not** a universal Core label. Test separate wing, tail, arm, leg, and head locations. |

CRTR-C03 location HP tracking itself is implemented in PR #245; **only this residual wound-classification case** remains.

## Optional code batch *only if* a Rabble/Underlings mode is approved

These procedures must not be applied to ordinary creature tracker entries. If Forge adds the optional mode, the following **all need code**; otherwise the section is an explicit **exclusion, not a blocker** for normal creature tracking.

| ID | Core page | Given → expected result |
|---|---|---|
| CRTR-R01 | **p.111** | GM selects Rabble → a shared simple HP threshold for each individual is **ceil((species' average CON + average SIZ)/5)**; do not substitute normal per-location HP. No offensive or defensive Special Effects for Rabble. |
| CRTR-R02 | **p.111** | Rabble takes positive damage after armour → leaves fight at first injury. Damage below HP threshold: flee; at least HP: collapse; at least twice HP: die. Zero damage does nothing; preserve location of injury for descriptive effects. |
| CRTR-R03 | **p.111** | Rabble group reaches one-third **dead or wounded** → remaining fighters flee. Use a reliable group counter and trigger once the threshold is met (e.g. one of three; two of six). |
| CRTR-U01 | **p.111** | GM selects Underling → use a one-fifth-of-average-(CON+SIZ) simple HP threshold instead of per-location HP; **allow Special Effects**; distinguish two-injury withdrawal from single-hit Rabble routing. The Underling text gives no explicit rounding direction: if fractional, apply the existing D-4 project round-up policy as a **project interpretation**, not a quotation. |
| CRTR-U02 | **p.111** | Underling receives damage reaching/exceeding its threshold → automatically fails the opposed Endurance check and suffers the Serious Wound consequence in the struck location; twice threshold → death. After **two injuries**, cease fighting and withdraw if possible. Record the two injury events even though there is only one simple HP figure. |
| CRTR-U03 | **p.111** | When at least **half** an Underling group are dead or wounded → remaining fighters withdraw. Keep this distinct from the one-third Rabble rule. |

## Source review and exclusions — no code cases

- **CRTR-C01 / C02 removed as non-cases.** Core p.214 says creatures generally use the normal characteristics, attributes and skills, with the specified INT/INS distinction. For non-sapient creatures INS substitutes for INT in derived characteristic-based calculations; there is **no additional universal creature competence-band or default percentage generator** on pp.214–215. That requirement would have been invented. Existing CRTR-B01/B02 cover the actual source-backed distinction; keep explicit stat-block skills and ordinary defaults. An unlisted *Professional* skill must not be silently treated as trained.
- **CRTR-C04:** entry-specific powers remain GM-resolved unless an individually verified, requested automation case is written (Core pp.220–273). No blanket creature-ability engine requested.
- **GM procedures:** the GM chapter's encounter pacing and descriptive guidance do not imply mandatory code. Rabble/Underlings are the concrete optional combat mechanics identified (p.111); do not infer automatic morale or encounter balancing for normal combatants.
- **Not duplicated:** B01–B20 (existing work), existing anatomy plans/Chaos table, CRTR-C03 basic nonhuman HP tracking.

**Gate:** source rules documented; no tests executed, no live acceptance, and **Subsystem 7 remains open; project progress 5/8**. Claude should implement CRTR-C03-W as a GM-prompted fix. Rabble/Underlings await explicit product scope approval before production code.