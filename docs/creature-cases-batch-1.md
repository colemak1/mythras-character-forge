# Subsystem 7 — Creatures: code-needed cases, batch 1

**Source:** user's private *Mythras Core Rulebook* (2e), **printed** pages (PDF index = printed + 1); source text checked, including the nonhuman hit-location tables. Paraphrases only. **Status:** proposed implementation inventory, **not** test or live evidence. Current subsystem register marks creature support unassessed; Claude should first compare each case to the current code and skip any already satisfied. This batch covers core mechanics and representative trait families, **not** every bestiary entry or the separate Games Mastery chapter (pp.278–293). Keep existing 5/8 progress unchanged.

| Code case | Given → expected behavior | Core |
|---|---|---|
| CRTR-B01 | An unintelligent wolf uses **fixed INT plus 2d6 Instinct**; compute INT-dependent skills, Action Points and Initiative from **INS** rather than pretending it has human INT. Keep sapient INT separate. | p.214 |
| CRTR-B02 | Import or generate a creature from its stat block: retain species dice/average characteristics, SIZ, movement, combat styles, natural weapons, armour, abilities, skills and special notes without forcing human defaults. Recalculate attributes from its actual characteristics. | pp.218–220 |
| CRTR-B03 | Creature has natural hide/scales plus worn gear: natural armour protects its locations but does **not** create the worn-armour Initiative penalty. Apply actual armour against injury. | p.219 |
| CRTR-B04 | Creature has nonhuman anatomy: roll d20 on the **selected species/anatomy** location table and assign that location's HP/armour/wounds. Never map a dragon wing or serpent tail to a human arm. Test boundaries across all anatomy tables. | pp.219, 276–277 |
| CRTR-B05 | Creature has ordinary claws or fangs but **lacks Formidable Natural Weapons**: cannot actively parry with those natural weapons; it may use natural armour or Evade. With the trait, allow natural-weapon parries. | p.216 |
| CRTR-B06 | Flying creature in the air: ordinary flight does not demand a roll; unusual aerial manoeuvres do, and its Fly skill can replace Evade while airborne. Grounded creature does not get this substitution. | p.216 |
| CRTR-B07 | Leaper wins its opposed leap: it also delivers one natural-weapon hit, not a second freely parryable ordinary strike. If it loses, do not award that bonus hit. | pp.104, 216 |
| CRTR-B08 | Grappler hits with a natural attack: trigger the extra grapple according to the trait and its parry restriction; do not grant every creature a free grapple. | p.216 |
| CRTR-B09 | Multi-headed creature: grant an extra combat action per additional functioning head, and remove that action as each head is disabled; losing a head does not automatically disable the entire body. | p.216 |
| CRTR-B10 | Breathe Flame: spend its combat action, check cone geometry and target locations, allow Evade to halve damage, and enforce the creature's breath cooldown/exhaustion condition; do not model as a single-location melee hit. | p.215 |
| CRTR-B11 | Trample: reject a target above **half** the trampler's SIZ; use Athletics and the trait's doubled base Damage Modifier / boosted attack Size; distinguish an AP-paid stationary trample from a free moving pass. | p.218 |
| CRTR-B12 | Venomous attack: venom does not automatically inject on every hit; apply **Inject Venom** eligibility and the creature's specific poison only when its delivery condition is met, separately from ordinary weapon damage. | pp.218, 97 |
| CRTR-B13 | Frenzy triggered by the creature's condition: resolve Willpower, limit actions while frenzied, suppress applicable pain/fatigue penalties and impose the end-of-frenzy fatigue outcome; don't treat Frenzy as a permanent flat skill bonus. | p.216 |
| CRTR-B14 | Undead with Serious/Major wounds: bypass the normal living-creature incapacitation and fatigue outcomes; track the binding location and destroy only under the stated condition. Do not give all undead normal human mortality. | p.218 |
| CRTR-B15 | Immunity / Vulnerable / Allergy against a specified source: check the **source type** before damage mitigation; immunity ignores its listed source, vulnerability bypasses applicable protection, allergy uses contact locations and the trait's armour distinction. | pp.215, 217–218 |
| CRTR-B16 | Camouflaged / Echolocation / Earth Sense: apply the actual Perception/Stealth difficulty or range restrictions; do not grant universal invisibility or detection beyond the creature's sensory mode. | pp.215–216 |
| CRTR-B17 | Intimidate trait: resolve the target's Willpower grades into hold/fall back/flee and maintain its encounter duration; not an automatic forced retreat merely on seeing the creature. | p.216 |
| CRTR-B18 | GM permits a sapient nonhuman PC: use that species' characteristic dice, alternate point-buy total, permitted minimums and anatomy; don't grant every creature unrestricted PC eligibility. | pp.218–219 |
| CRTR-B19 | Chaos Feature trait: roll its d100 feature on the **Core** table and persist the result and any dynamic consequences; do not treat the trait as a cosmetic label. | pp.215, 274–276 |
| CRTR-B20 | When importing a listed creature with unique abilities, poison, spellcasting or natural weapon effects, preserve the **entry-specific** mechanic and mark it GM-resolved until implemented; never substitute an invented generic effect. Add one child fixture per supported creature/ability. | pp.220–273 |

**Already correct / reuse (one line):** Existing human characteristic, damage, skill-roll and wound engines are reusable foundations (Subsystems 1–5), **not** proof of creature-specific coverage.

**Boundary:** First implement data/anatomy/INS (B01–B05), then combat traits (B06–B14), then resistances/senses/Chaos (B15–B19) and per-entry children (B20). No nonhuman PC or creature bestiary completion claim without species-by-species verification; GM advice, encounter balancing and optional GM procedures need a later inventory, not invented code.

## Implementation status, B01–B05 (Claude, 2026-11-08)

Where: GM Combat Tracker, "Add a creature from its stat block". Tests: `tests/creature-cases.cjs` (invented fixture, not Core data). Not live-checked. Progress stays **5/8**.

- **B01:** implemented. INS replaces INT for Action Points, Initiative and INT-based skill bases; sapient creatures keep INT. The spec's wording "fixed INT plus 2d6 Instinct" is read as Core p.214's INS-instead-of-INT; ChatGPT please confirm.
- **B02:** implemented as a pasted stat block (strict line formats; unreadable lines block adding). Keeps characteristic dice and values, Move, weapons, traits, skills and notes; recomputes AP, Initiative bonus, Damage Modifier, Healing Rate and MP from the actual characteristics. Location HP are taken as printed in the entry, not recomputed.
- **B03:** implemented. Natural armour adds no Initiative penalty; worn ENC uses Core p.58. Damage applied after natural + worn armour.
- **B04:** implemented with the creature's own d20 table (validated 1–20, no overlap or duplicate names). **Open:** the generic anatomy templates (pp.276–277) need their d20 ranges in this ledger or the rulebook uploaded before they can be offered as presets.
- **B05:** implemented as a parry eligibility shown per natural weapon (trait name "Formidable Natural Weapons", case-insensitive). The tracker records no parry rolls, so this is display/eligibility only.
