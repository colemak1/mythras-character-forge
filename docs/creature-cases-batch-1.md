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

## ChatGPT one-pass review of merged PR #223 (2026-11-08)

**B01 ruling confirmed — Core printed p.214, “Intelligence and Instinct”:** an instinctive creature's **INS substitutes for INT** where the game uses that characteristic; it is not an extra INT added to a fixed INT score. Thus AP, Initiative and INT-based skill calculations use INS; sapient creatures retain INT. The earlier B01 example phrase “fixed INT plus 2d6 Instinct” should **not** be implemented as adding fixed INT to INS. The code's `creatureMind`, `creatureAttributes` and `creatureSkillBase` follow the substitution interpretation.

**Scoped static review — no blocking discrepancy found** in the B01–B05 diff of merged PR #223 (`6fdc43e56c252b795356ea653dc1c0690f76a5d9`):
- **B01:** mind substitution used for AP, Initiative and characteristic-based skill bases; tests include sapient INT and instinctive INS.
- **B02:** line parser retains characteristic dice/values, locations, natural weapons, traits, skills, movement and notes; missing or unparsed lines block adding. Invented fixture, not a Core bestiary entry. The importer uses a **specific one-line-per-field transcription format**, not arbitrary OCR or automatic parsing of Core's printed multi-column layout; describe it as *manual transcription into a supported format*, not universal paste support.
- **B03:** natural/worn armour combined per location for basic damage; only worn ENC contributes to Initiative penalty.
- **B04:** d20 location table checked for complete, nonoverlapping coverage, and rolled against the imported creature table, not human locations. Generic anatomy **presets are not implemented**.
- **B05:** natural-weapon parry eligibility reflects Formidable Natural Weapons; the GM tracker does **not** roll parries, so this is display/eligibility, not full creature combat automation.

**Anatomy templates, Core printed pp.276–277:** optional future presets only. Exact ranges **not added here** because the rendered tables could not be reliably retrieved and verified in this review. Do not invent ranges from memory; verify rendered source pages before adding templates.

**Review scope:** read PR diff and tests once; did not independently execute tests or perform deployed signed-in acceptance. Keep **5/8**, Creatures open; B06–B14 next if prioritized.

## Implementation status, B06–B14 (Claude, 2026-11-09)

GM-assisted controls on the creature card, shown only for traits the creature has (matched by name at the start of a `Trait:` entry, e.g. "Multi-headed (3)"). Tests: `tests/creature-cases.cjs`. Not live-checked. Progress stays **5/8**.

- **B06:** Airborne switch; Fly replaces Evade only while airborne and only with the Flying trait. Manoeuvre rolls stay GM-called.
- **B07:** won/lost leap; only a win adds one natural-weapon hit (the first natural weapon listed).
- **B08:** guidance only (trait-specific grapple and parry restriction per entry).
- **B09:** AP max = base AP + working heads − 1, recomputed when damage is applied; "head" = a location whose name contains "Head"; a head at 0 HP or below stops counting. **To confirm:** whether a head stops working at 0 HP or only when the location is disabled by a Serious/Major Wound.
- **B10:** 1 AP per breath; recovery turns entered from the entry and counted down on the creature's turns; refused while recovering or without AP. Cone geometry, per-target locations and Evade halving stay GM-resolved (no halving arithmetic, avoiding an unruled rounding).
- **B11:** target SIZ × 2 > creature SIZ → refused. Doubled base Damage Modifier and Size boost are shown, not computed into a damage roll.
- **B12:** venom offered only when damage after armour > 0 (Inject Venom, p.97); the poison itself is GM-resolved. **To confirm:** that "got through armour" is the right delivery condition in general.
- **B13:** Frenzied state; ending prompts the trait's fatigue. Willpower trigger and action limits are GM-resolved.
- **B14:** binding location (one of its locations) and entry destroy condition recorded; card states wounds don't incapacitate or fatigue it. The tracker never marks a creature dead automatically.

## ChatGPT one-pass rules review of PR #225 (2026-11-08)

**Source:** private *Mythras Core Rulebook* (2e), printed **p.216** (Multi-Headed), **p.218** (Venomous and Inject Venom), with related combat/wound rules. The relevant text was verified from the uploaded Core PDF (parsed text decoded to check the exact clauses); no Core material is reproduced verbatim here. PR #225 was **open at review time**; this is one static diff-and-test review, not an independent test run or live acceptance.

**B09 — correction required (Core p.216):** An extra head's Combat Action is lost when that individual head is **incapacitated or severed**. **HP reaching 0 alone is not the stated trigger.** A location at 0 HP has a Serious Wound, but its incapacitation must be resolved under the wound rules; a severed head is also disabled. Current `creatureHeads` automatically removes a head at `cur <= 0` and does not record an explicit incapacitated/severed state. **Claude fix:** track per-head incapacitation/severance or obtain GM confirmation and count functioning heads accordingly; test a 0-HP head still functional pending adjudication and an incapacitated/severed head losing its action. Keep the shared body unaffected while another head remains active.

**B12 — correction required (Core p.218, Venomous / Inject Venom):** **“Damage got through armour” is not the general venom-delivery rule.** The book describes an ordinary venomous strike as not automatically injecting poison, and the **Inject Venom** Special Effect as deliberately finding a gap in protection **instead of inflicting attack damage**. Thus a zero-damage Inject Venom can deliver poison despite armour. The current `creatureVenomEligible(c,damageThrough)` predicate `damageThrough > 0` and the card's “Nothing got through: no venom” are incorrect when Inject Venom was selected. **Claude fix:** ask whether the eligible Inject Venom effect was selected/resolved, distinguish it from ordinary damaging attacks, and apply the creature's entry-specific poison with the GM. Do not infer that any positive-damage hit automatically delivers venom. Tests: zero-damage successful Inject Venom permitted; ordinary damaging hit without the effect not auto-injected; no eligible effect/failed attack does not inject.

**Other B06–B14 controls:** Scoped GM-assisted controls and tests generally align with their stated limited scope (Flying substitution, won Leaper bonus, Grappler guidance, breath AP/recovery with cone GM-resolved, half-SIZ Trample check, Frenzy state, Undead notes). **Not a full automated trait implementation:** B07 does not resolve opposed leap, B08 is guidance only, B10 geometry and damage remain GM-resolved, B11 Athletics and damage are GM-resolved, B13 Willpower and action restrictions are GM-resolved, and B14 binding/destruction is recorded rather than enforced. Keep this boundary explicit; no full Core automation claim.

**Chaos Feature d100 (Core pp.274–276) and anatomy d20 tables (pp.276–277):** exact tables **not added**. Their rendered page images were not reliably accessible during this review; table transcription from scrambled parsed PDF text is unsafe. Verify rendered tables before implementing or documenting ranges/results. Do not substitute invented entries.

**Disposition:** **B09 and B12 require code/test corrections** before the scoped review can pass. **Progress stays 5/8**, Creatures open.

## B09 / B12 corrections (Claude, 2026-11-09)

Implemented ChatGPT's #225 corrections (p.216, pp.97/218); tests in `tests/creature-cases.cjs`:
- **B09:** heads lose their action only when the GM marks them incapacitated or severed (`cs.headsOut`); a 0-HP head stays working and is flagged for wound resolution. Marks are reversible and limited to head locations.
- **B12:** venom only via "Inject Venom chosen" (no damage, armour irrelevant); damaging ordinary hits never inject; no trait → nothing. The entry's poison stays GM-resolved.
- Chaos Feature (pp.274–276) and anatomy (pp.276–277) tables: still waiting for verified page images. Progress stays **5/8**.

## ChatGPT one-pass static review of merged PR #227 (2026-11-08)

**Result: pass for both requested corrections**, against the private *Mythras Core Rulebook* (2e), printed **p.216** (Multi-Headed) and **pp.97, 218** (Inject Venom). Reviewed merged PR #227 diff and changed tests once; did not independently run tests or perform live acceptance.

- **B09 — pass:** `creatureHeads` now counts heads until the GM explicitly marks them incapacitated or severed in `cs.headsOut`; a head at 0 HP remains active but triggers a wound-resolution warning. `creatureSyncAp` uses those marks; UI allows reversing a mark, and non-head locations are refused. Updated tests cover 0 HP, disabling and restoring a head.
- **B12 — pass within GM-assisted scope:** an ordinary damaging hit no longer delivers venom; a separate `Inject Venom chosen` control explicitly represents choosing the Special Effect instead of inflicting attack damage, independent of armour. Creature-specific poison remains GM-resolved. Updated tests cover damaging ordinary hits, selected/unselected effect and absence of Venomous trait. **Scope limitation:** the control relies on the GM to confirm a successful attack and legitimate Special Effect; it is not an integrated combat-exchange validator.

**B15–B19 source blocker:** Chaos Feature **d100 table (Core printed pp.274–276)** and optional generic anatomy **d20 tables (pp.276–277)** require verified rendered page images before transcription. This review attempted to access the existing uploaded Core PDF through Files, but page-image retrieval and raw-file materialization were unavailable. **Owner action:** upload clear screenshots or photos of printed pp.274–277 (including complete table headers and rows) to this chat; alternatively attach an accessible Core PDF to this conversation. Do not invent or decode tabular ranges from scrambled parsed text. B15–B18 can proceed without those tables; B19 and anatomy presets cannot be specified exactly yet.

**Progress remains 5/8; Creatures stays open.**

## Implementation status, B15–B18 (Claude, 2026-11-09)

GM tracker creature card; tests in `tests/creature-cases.cjs`. Not live-checked. Progress stays **5/8**.

- **B15:** source checked before armour. Immunity (listed source) → 0 damage; Vulnerable (listed source) → armour ignored, damage otherwise unchanged; Allergy → normal damage plus a GM note on contact and armour. Source matching is a whole word or the exact listed term ("silver sword" matches silver; "firearm" doesn't match fire). **To confirm:** whether Vulnerable does more than bypass armour (e.g. extra damage) in Core; nothing extra is applied now.
- **B16:** guidance only for Camouflaged / Echolocation / Earth Sense: the sense, its range from the entry, no universal detection. No grade numbers are invented.
- **B17:** per-target Willpower outcome (Critical: ignores for the encounter; Success: holds; Failure: falls back next round; Fumble: flees), kept until the GM ends the encounter. Any grade modifier on the Willpower roll stays with the GM. **To confirm:** this outcome table against Core p.216 (it matches the Intimidate text already used for formation traits in `js/data.js`).
- **B18 (partial):** eligibility only: INS creatures refused; sapient INT creatures need the GM's permission. **Needs spec:** the Core alternate point-buy total, permitted minimums and how nonhuman anatomy enters the builder (pp.218–219), before a builder path is made. The existing builder species (Classic Fantasy Imperative SRD) are unchanged and are not Core creatures.
- **B19 and anatomy presets:** see below.

## Source check and B18/B19/anatomy, Claude, 2026-11-09

Checked against the owner's Core PDF (printed pp.8, 216, 218–219, 274–277). Paraphrases only.

- **B15 confirmed (p.218):** Vulnerable means protection can't reduce damage from the listed source. Nothing extra is added, which matches the build.
- **B17 confirmed (p.216):** Willpower outcomes are Critical: ignores further intimidation that encounter; Success: holds; Failure: falls back next round; Fumble: flees. The effect lasts while the creature keeps acting threateningly. Matches the build.
- **B18 (pp.8, 218–219):** any creature with INT 8+ may be a PC if the GM allows it. With Points Build, the pool is the species' average characteristics added up and rounded up. Each characteristic stays within its dice range (Core p.8 rule: no lower than the minimum, no higher than the maximum), and all points are spent. Implemented as `creaturePointsBuild` / `creaturePointsCheck` and shown on the GM tracker card. **Open:** a builder path that creates a PC from a creature (culture and career "as normal" per p.218) isn't built. The INT 8+ floor isn't enforced yet: eligibility needs INT and GM permission only.
- **B19 (pp.274–276):** the 50-row d100 Chaos Feature table (pairs 01–02 … 99–00) is in `CHAOS_FEATURES`, with summaries in our own words. A creature with the Chaos Feature trait can roll on it. Results are kept on the combatant, and the GM applies each effect; none is automated.
- **Anatomy presets (pp.276–277):** all 13 body plans (Arachnid, Centaurid, Draconic, Insect, Dorsal Finned Aquatic, Tailed Biped, Winged Quadruped, Pachyderm, Tailed Quadruped, Serpentine, Winged Biped, Tailed Arachnid, Winged Insect) are in `CREATURE_ANATOMY`, and each was checked to cover d20 1–20 exactly once. The import can start from a plan; each location's HP must be filled in before the creature can be added.

Progress stays **5/8** until Subsystem 7 is audited live.

## Implementation status, B18 builder path and B20 (Claude, 2026-11-09)

Tests in `tests/creature-pc.cjs`. Not live-checked. Progress stays **5/8**.

- **B18 builder path (Core pp.8, 218–219):** on the Concept step, "Play a creature your GM approved" takes the creature's stat block (the GM tracker's "Copy stat block for the player" gives it once the GM ticks permission) and a "My GM approved" checkbox. Refused: INS creatures, INT below 8, missing dice for any of the seven characteristics, no Move. Once used, the creature is the species: its own dice for rolling, its dice ranges, its Points Build pool (averages added up, rounded up; no +6), its Move and its anatomy table. Culture, career and the rest are as normal. The character's own INT can't go below 8 (reading recorded in `docs/decisions.md`; **to confirm**). Saved creatures are re-checked on load; a save without approval or with INT below 8 falls back to human.
- **Anatomy limits:** the sheet and Play Mode show the creature's own d20 table with natural armour and the entry's HP (GM confirms HP for the character's CON+SIZ). Play Mode's HP tracking and The Pits still use the seven human locations; The Pits refuses creature characters. Nonhuman location tracking in Play Mode is a later item.
- **B20 (pp.220–273):** stat blocks accept `Ability: Name: text`, `Poison: Name: text`, `Magic: text` (or `Spells: Tradition: text`) and `Weapon effect: Weapon: text` (must match a Weapon line). Each is kept as entered, shown on the tracker card and on a creature character's traits as GM-resolved. Traits with no tracker controls are listed as GM-resolved too. One child fixture per kind (ability, poison, magic, spells, weapon effect). No per-entry effect is automated; each needs its own case spec first.

## ChatGPT one-pass review of merged PR #239 (2026-11-09)

**B18: scoped static review PASS**, Core printed pp.8, 218–219. An individual creature PC must have **INT 8+**, not merely belong to a sapient species whose typical INT is 8+; the p.218 eligibility clause refers to the creature being played. A species may still produce lower-INT individuals, but those individuals do not qualify as PCs under this rule. GM approval remains required. PR #239 checks the creature entry's INT and imposes an 8 minimum on the PC's own INT, while retaining species dice/ranges, the nonhuman average-sum Points Build pool, Move, anatomy, and normal culture/career. The handoff/export and restore checks were reviewed in the diff, not live-tested. **Known limit:** Play Mode HP still uses human locations (species table shown separately), and The Pits refuses creature PCs; do not count creature-specific Play Mode wounds as complete.

**B20: scoped static review PASS** for *preservation and GM-resolved display*, not automated effects. Ability, Poison, Magic/Spells and weapon-matched Weapon effect entries are retained and displayed; unhandled traits remain GM-resolved. Per-entry mechanics still require separate Core cases before automation. The new regression tests were inspected but **not independently run**; live checks remain with ChatGPT (Work).

**B19/anatomy:** Claude reports checking the source PDF and adding 50 Chaos Feature d100 entries and 13 d20 body plans. This review did **not** independently verify every table row against rendered Core pp.274–277; avoid claiming an independent table transcription audit. Progress remains **5/8**.

## PR #230 follow-ups (Claude, 2026-11-10)

PR #230's review (older than the source check above) asked for two fixes. Its text is folded in here, and the PR closed.

- **B15 Vulnerable:** #230 reads Core p.218 as natural (and magical) protection only, not worn armour. Built that way now: the listed source skips natural armour; worn armour still counts. The earlier Claude source check paraphrased it as "protection", which doesn't settle this. **Chat: confirm against p.218 in one line;** magical protection isn't tracked on the card.
- **B17 Intimidate:** a Critical now covers the creature and its brethren (tracker creatures with the same name, not other species); "stopped threatening" ends the fear outcomes while Critical immunity lasts the encounter (Core p.216; the same wording is in the Street Mob formation trait in `js/data.js`).
