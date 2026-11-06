# Subsystem 6 — Magic case inventory, Batch 1

- **Source:** Mythras 2e Core Rulebook, printed pp. 112–129. Cases written and source-checked by ChatGPT on 2026-11-05.
- **App status:** mapped by Claude against the code on 2026-11-05. Claude has no copy of the rulebook, so it has not re-checked the page references.
- **Ownership:** ChatGPT verifies the rules; Claude implements and writes automated tests; ChatGPT checks the result live.
- **Rules for implementers:** keep GM adjudication where Core leaves something to the setting. Never switch on an optional rule silently, and never replace Core with a Sit'ota house rule. This inventory doesn't close the subsystem.

## Overlap with the cases in `magic-subsystem-cases.md`

ChatGPT also wrote 58 cases in PR #111 (`magic-subsystem-cases.md`, "batch 1" section). The Shared Magic and Folk Magic ones overlap with this file: MG-B01 = MG-033, MG-B02 = MG-034, MG-B03 = MG-040/041, MG-B04 = MG-044, MG-B05 = MG-043, FM-B01 = FM-002/003, FM-B02 = FM-004, FM-B03 = FM-007/008, FM-B04–B06 = FM-009–012, FM-B07 = FM-013, FM-B08 = FM-018. Status is tracked here for those. The Animism, Mysticism, Sorcery, Theism and organization cases (AN-B, MY-B, SO-B, TH-B, OR-B) are mapped separately.

## Status key

| Status | Meaning |
|---|---|
| **Pass** | The app does this, and an automated test covers it. |
| **Guidance** | The app shows the rule as GM guidance and doesn't calculate it. That matches the case where Core leaves it to the GM. |
| **GM-assisted** | Nothing in the app does this; the table resolves it. Acceptable only where the case allows GM handling. |
| **Not implemented** | The case expects app behaviour that doesn't exist yet. |
| **Decision** | Needs a ruling from the owner or ChatGPT before code changes. |

“Pass” in the case tables describes implementation/automated coverage, not blanket live acceptance. The signed-in session below supplies live evidence for FM-009–011, the 0 MP block and the card display; catalogue acceptance remains open.

## Summary

- Folk Magic casting costs, the 0 MP block, the single Folk Magic skill, and the 1 Turn / Intensity 1 / Magnitude 1 / range display pass, with tests in `tests/magic-folk-cases.cjs`.
- **Folk Magic spell catalogue implemented on main** (D-1, PR #116): all 70 Core spells with traits, descriptions and pages. **Live acceptance failed in the session below:** the builder still exposed the previous empty catalogue/manual-entry interface after reload. Effects remain GM-resolved.
- Magic Points are a manual counter. There are no recovery sources, no committed MP for ongoing magic, and no optional exhaustion rules. The owner decided to keep recovery manual (D-2).
- No active-spell tracking exists for Folk Magic: concentration, trigger, dismissal and duration (FM-015–017, FM-021, MG-039). The owner decided not to add it (D-3); Mysticism Talents keep their active state.

## A. General Magic — Core pp. 112–120

### Traditions and campaign configuration

| ID | Given | Core says | Expected app behaviour | App status |
|---|---|---|---|---|
| MG-001 | A campaign is configured with restricted magic. | p.112: The five disciplines are Folk Magic, Animism, Mysticism, Sorcery and Theism. A campaign need not include all five. | Allow the GM to control which disciplines are available. Do not automatically grant all five. | **Not implemented.** No grant is automatic (abilities need the skill), but campaign settings can't restrict disciplines. |
| MG-002 | A character joins a magical tradition. | p.113: Traditions teach magical knowledge, but membership doesn't necessarily grant magical ability. | Store membership and actual spellcasting access separately. | **Pass (by design).** Cult membership and magic entries are stored separately; access depends on the skill. No dedicated test. |
| MG-003 | An organization teaches multiple disciplines. | p.113: A tradition can combine two or more magical disciplines. | Support multiple disciplines within one organization without merging their skills or abilities. | **Guidance.** Disciplines stay separate; organizations aren't modelled as data. |
| MG-004 | A GM configures an organization's available abilities. | p.114: Suggested numbers are Low Magic 1d3, Medium 1d3+3, Magic Rich 1d3+6. | Offer as configurable suggestions, not mandatory limits. | **GM-assisted.** |
| MG-005 | A novice requests an advanced spell. | pp.114–115: Organizations may restrict abilities by rank and approval. | Respect GM-defined access; rank doesn't automatically grant every ability. | **GM-assisted.** Nothing is granted by rank. |
| MG-006 | GM permits ritual preparation to improve casting chances. | p.115: One minute's preparation may give Easy; one hour Very Easy. | Only when this optional rule is enabled, including its resistance interaction. | **GM-assisted.** The roller's manual difficulty grade covers it; the resistance interaction isn't tracked. |
| MG-007 | A campaign uses longer ritual casting. | p.115: Casting units may change from Turns to Rounds, Minutes, Hours or Days; optional accelerated casting with grade penalties. | Keep default timings unless configured; distinguish unit changes from skill penalties. | **GM-assisted.** Defaults are kept; no setting exists. |
| MG-008 | POW 14 but no usable energy source. | p.115: MP derive from POW as storage capacity, not guaranteed energy. | Show maximum 14 but respect the energy source. | **Pass (capacity)**: max MP = POW. Energy sources: **GM-assisted** by decision (D-2). |
| MG-009 | A campaign defines its MP source. | p.115: Self, Sacrifice, Magical Locations, Destruction, Consumption, Veneration. | Support a GM-defined source and recovery conditions; don't assume natural regeneration. | **GM-assisted.** No automatic regeneration exists; MP is adjusted by hand. |
| MG-010 | Caster can't access their energy source. | p.115: MP can't be recovered until the source is available. | Don't grant recovery merely because time passes. | **Pass (by design).** Nothing restores MP over time. No test. |
| MG-011 | Sacrificial energy is used. | p.116: Default yield is the creature's POW, subject to GM alteration. | GM-controlled awards; not every death is a usable sacrifice. | **GM-assisted.** |
| MG-012 | GM uses sacrifice-size guidelines. | p.117: Tiny 1 MP; small 1d3; medium 1d6; large 2d6; huge, magical or sapient 3d6+. | Optional GM reference, separate from the POW default. | **GM-assisted.** |
| MG-013 | Max 16 MP at a 25% shrine. | p.116: Location strengths 25/50/75/100%; this shrine allows recovery only up to 4 MP. | Apply the ceiling without deleting MP already held. | **GM-assisted** by decision (D-2). Rounding for odd maxima still needs a ruling. |
| MG-014 | A magical substance is destroyed or consumed. | p.116: Strength 25/50/75/100%. | Apply the resource's ceiling and rate. | **GM-assisted** by decision (D-2). |
| MG-015 | Veneration with 80, 500, 5,000 or 12,000 worshippers. | p.116: Strength 25/50/75/100% respectively. | Calculate the percentage from the participation band when enabled. | **GM-assisted** by decision (D-2). |
| MG-016 | Natural recovery via Sacrifice or Consumption. | p.117: Only Self, Magical Locations and Veneration permit natural recovery. | Require a new resource or ritual instead of rest recovery. | **GM-assisted.** No rest recovery exists to misapply. |
| MG-017 | Rest in unsafe conditions. | p.117: Natural recovery assumes complete rest, comfort and safety. | GM controls eligibility; no automatic restore. | **Pass (by design).** |
| MG-018 | GM picks Magic Rich, Medium or Low recovery. | p.117: 1 MP per hour, day or week; conjunctions are another option. | Apply only the selected schedule. | **GM-assisted** by decision (D-2). |
| MG-019 | Recharge ritual with sacrifice or consumables. | p.117: Normally at least one hour; haste risks losing the energy. | GM-adjustable guideline; record the outcome. | **GM-assisted.** |
| MG-020 | Several low-strength recharges in a row. | p.117: The Rule of Recovery stops ceilings adding together. | When enabled, don't add successive ceilings. | **GM-assisted** by decision (D-2). |
| MG-021 | Character reaches 0 MP (default rules). | p.117: No further magic, no other automatic consequences. | Block magic at 0 MP without Fatigue, damage or unconsciousness. | **Pass** for Folk Magic (test). Other MP traditions are blocked when cost exceeds MP. |
| MG-022 | Optional Fatigue Accrual. | p.117: One Fatigue level per MP spent. | Only when enabled. | **Not implemented.** Never applied, which is correct while disabled. |
| MG-023 | Optional Hit Point Attrition. | p.117: 1 HP to every location per attempt. | All locations; only when enabled. | **Not implemented.** Never applied. |
| MG-024 | Optional Unconsciousness. | p.117: Comatose at 0 MP until 1 MP recovers. | Track against actual MP recovery. | **Not implemented.** Never applied. |
| MG-025 | Optional Willpower test. | p.117: Willpower at 0 MP, each later attempt harder; failure gives 1dN days unconscious, N = number of checks. | Track grade, count and duration. | **Not implemented.** Never applied. |
| MG-026 | Optional Endurance or Die. | p.117: Endurance at 0 MP decides survival; a critical restores 1 MP. | Only with explicit GM configuration. | **Not implemented.** Never applied. |
| MG-027 | No magical training or permission. | p.118: Access normally comes from profession, training and setting. | Don't grant magic skills to everyone. | **Pass (by design).** Magic needs the relevant skill. |
| MG-028 | Starting magic skill of 20% or 21%. | p.118: One ability per 20% or part thereof. | 1 at 20%, 2 at 21%, subject to exceptions. | **Guidance.** The builder shows `ceil(skill/20)` as the starting allowance and warns when it's exceeded; tested at 41% → 3. |
| MG-029 | Learning an ability in play. | p.118: Folk 3 Experience Rolls + 1 week; others 5 + 1 month. | Record type, approval, Experience Rolls spent and study time. | **Not implemented.** New abilities can be added, but no XP cost or time is recorded. |
| MG-030 | Joining another tradition. | p.118: Same discipline, not opposed, GM approval; normally six months plus skill and ability costs. | Separate workflow with approval, training and costs. | **GM-assisted.** |
| MG-031 | Creating a new tradition. | p.119: 3 months and 7 Experience Rolls for the first ability, 6 months and 13 for the second, rising after. | GM-assisted development; no free abilities. | **GM-assisted.** |

### Casting, interruption and ongoing magic

| ID | Given | Core says | Expected app behaviour | App status |
|---|---|---|---|---|
| MG-032 | Caster can't think, speak, gesture or sense the target. | p.119: Each missing requirement makes the roll one grade harder. | Track each independently; grades stack. | **GM-assisted.** The player sets the grade by hand on the roller. |
| MG-033 | Caster tries to attack or run while preparing. | p.119: Walking pace and Free or Reactive Actions only. | Prevent incompatible actions or interrupt preparation. | **Not implemented.** Pending casts don't block other Play Mode actions. |
| MG-034 | Defensive reactions spend AP during a multi-turn cast. | p.119: Reactions may delay, not necessarily break, casting. | Keep preparation pending. | **Pass (by design).** Reactions don't cancel pending casts. No test. |
| MG-035 | Minor Wound while casting. | p.119: Willpower; failure makes casting one grade harder. | Prompt Willpower; record the penalty. | **Not implemented.** |
| MG-036 | Serious Wound while casting. | p.119: Willpower; success one grade harder, failure two. | Apply the right penalty. | **Not implemented.** |
| MG-037 | Major Wound while casting. | p.119: Casting automatically fails. | Fail the cast; no normal roll. | **Not implemented.** |
| MG-038 | Mental domination while casting. | p.119: Casting automatically fails. | Fail and record the cause. | **Not implemented.** |
| MG-039 | Dismissing your own magic. | p.119: Free Action, no roll. | Dismiss without a roll or MP. | **GM-assisted** by decision (D-3) for Folk Magic, Sorcery and Theism. Mysticism Talents can be ended. |
| MG-040 | Similar enhancements would stack. | p.120: Incompatible enhancements don't stack. | Prevent forbidden stacking; keep records. | **GM-assisted.** The app applies no spell effects. |
| MG-041 | Two incompatible effects are active. | p.120: Higher Intensity wins; at equal Intensity the newer replaces the older. | Resolve by Intensity and order. | **GM-assisted** (D-3). |
| MG-042 | Effect with Magnitude 3 and Intensity 5. | p.120: Magnitude is resistance to dispelling; Intensity is strength. | Track separately. | **Partial.** Folk Magic now shows both. Other traditions show Intensity; Sorcery shows Magnitude only as a Shaping level. |
| MG-043 | Hard roll with skill-derived Intensity or Magnitude. | p.120: Grades don't change those values. | Change the chance, not the potency. | **Pass** for Folk Magic range (test: range uses the skill, not the Hard chance). Mysticism limits also use the raw skill. |
| MG-044 | Caster maintains ongoing magic. | p.120: MP committed to active magic can't recover until it ends. | Track commitments separately; release on end. | **GM-assisted** by decision (D-2, D-3). |

## B. Folk Magic — Core pp. 121–129

### Access, casting and spell traits

| ID | Given | Core says | Expected app behaviour | App status |
|---|---|---|---|---|
| FM-001 | Seeking Folk Magic access. | p.121: Culture, career, cult, teacher or self-study, as the setting permits. | Configurable access; not universal. | **Pass (by design).** Needs the Folk Magic skill from any source. |
| FM-002 | Specialist career starts at Folk Magic 40%. | p.121: Specialists may start with one tenth of the skill in spells. | 4 spells here; rounding at non-multiples of ten still to verify. | **Guidance.** The builder mentions the one-tenth option but only calculates the standard allowance. Rounding: D-4. |
| FM-003 | A non-magical career gains Folk Magic. | pp.118, 121: Normal allowance, one per 20% or part. | Don't apply the specialist one-tenth automatically. | **Pass.** Only the standard allowance is calculated. |
| FM-004 | Learning a spell in play. | p.121: 3 Experience Rolls and one week. | Track time, rolls and permission. | **Not implemented** (as MG-029). |
| FM-005 | A teacher charges for a spell. | p.122: 100 silver suggested, adjustable or waived. | GM-editable tuition. | **GM-assisted.** Money is edited by hand. |
| FM-006 | Choosing Folk Magic through a career. | p.122: Career lists are suggestions the GM may change. | Match the printed table if shown; don't restrict to it. | **Pass (by design).** No list is shown or enforced (D-1). |
| FM-007 | A learned spell is cast. | p.122: One Turn to cast. | Advance one Turn and prompt the roll. | **Pass (display).** The card shows "1 Turn"; the roll happens immediately. Play Mode doesn't track Turns for Folk Magic. |
| FM-008 | Several spells known. | p.122: All use the one Folk Magic skill. | Same skill for every spell. | **Pass** (test). |
| FM-009 | Critical success. | p.122: Works, no MP. | Apply; spend 0 MP. | **Pass** (test). |
| FM-010 | Success. | p.122: Works, 1 MP. | Apply; spend 1 MP. | **Pass** (test). |
| FM-011 | Failure. | p.122: Fails, 1 MP. | No effect; spend 1 MP. | **Pass** (test). |
| FM-012 | Fumble. | p.122: Fails, 1d3 MP. | Roll 1d3 MP loss; no effect. | **Pass** (test). Never spends more MP than the caster has. |
| FM-013 | No special potency rule. | p.122: Intensity and Magnitude both 1. | Fixed at 1. | **Pass (display)** (test). |
| FM-014 | Learning more spells. | p.122: No universal maximum. | No global cap. | **Pass.** Only a warning above the starting allowance for new characters. |
| FM-015 | Spell without Concentration, Instant or a duration exception. | p.123: Lasts the scene or action. | Track scene or task duration. | **GM-assisted** by decision (D-3). |
| FM-016 | Concentration trait. | p.123: Lasts while the caster concentrates. | Track; end when broken. | **GM-assisted** by decision (D-3). |
| FM-017 | Instant trait. | p.123: Immediate, no ongoing duration. | Resolve at casting. | **Pass (by design).** Nothing ongoing is ever tracked. |
| FM-018 | Folk Magic 65%, unseen known target 60 m away. | p.123: Range is skill % in metres; an unseen known target is one grade harder. | Allow with the penalty; reject beyond range. | **Partial.** The card shows "ranged 65 m" (test); the visibility penalty and target distance are left to the player and GM. |
| FM-019 | Resist (Endurance), (Willpower) or (Evade). | p.123: Opposed roll; Evade costs an AP, others passive. | Prompt the right test; AP only for Evade. | **GM-assisted** (D-1). |
| FM-020 | Touch spell. | p.123: Contact during casting; carried gear can count. | Require contact; GM handles unwilling targets. | **GM-assisted.** |
| FM-021 | Trigger trait. | p.123: Effect can be delayed after casting; expires at scene end; no second cost. | Armed, triggered and expired states. | **GM-assisted** by decision (D-3). |

### Individual Folk Magic spells

**Catalogue implemented on main** (D-1): all 70 spells, with Core traits, descriptions and page numbers, come from `folk-magic-catalogue.json` (tests: `tests/magic-folk-catalogue.cjs`). Name, traits, description and specialisation have automated coverage; **their live display is not accepted yet**, because this session still received the previous interface. Spell **effects stay GM-assisted**: the app doesn't apply damage steps, durations or resistance automatically (D-3). The general casting cases above still apply to every spell.

| ID | Given | Core says | Expected app behaviour |
|---|---|---|---|
| FM-S01 | Alarm: a living creature with SIZ > 1 enters an alarmed location. | p.123: Alert regardless of distance; lasts until triggered or dismissed; MP committed meanwhile. | Track area or object, trigger, notification, end and MP commitment. |
| FM-S02 | Appraise: inanimate goods within the ENC/SIZ limit. | p.123: Reveals comparative quality or flaws, not their exact nature; total limit is POW. | Check size; give a quality assessment, not a diagnosis. |
| FM-S03 | Avert: countering active or incoming Folk Magic. | p.123: Dismisses another Folk Magic spell in range; usable reactively via Counter Magic. | Support dismissal and the reactive counter. |
| FM-S04 | Babble: the target speaks. | pp.123–124: Speech becomes unintelligible; thoughts unaffected. | Affect speech only. |
| FM-S05 | Beastcall (X): summon a specific non-sapient animal. | p.124: Animal may resist with Willpower; obstacles can make it fail. | Require an animal type, resistance and GM handling. |
| FM-S06 | Befuddle: target tries a constructive action. | p.124: Prevented, but self-defence allowed; attack or threat breaks it. | Restrict constructive actions; end on threat. |
| FM-S07 | Bladesharp: edged or piercing melee weapon. | p.124: Damage up one die step on the printed progression. | Exactly one valid step. |
| FM-S08 | Bludgeon: blunt weapon or tool. | p.124: Bladesharp's effect for blunt implements. | One die step. |
| FM-S09 | Breath: holding breath in a hazardous atmosphere. | p.124: Up to half the caster's POW in minutes; speaking ends it. | Track duration; end on speech. |
| FM-S10 | Bypass: crossing an Alarm boundary. | p.124: Suppresses that crossing's trigger; one casting per crossing. | Consume for one crossing; Alarm stays. |
| FM-S11 | Calculate: an observable quantity. | p.124: Exact quantity, weight or size; not quality or value. | Quantitative information only. |
| FM-S12 | Calm: affected person is threatened. | p.124: Dampens passions; can still defend or attack. | Emotional effect without disabling actions. |
| FM-S13 | Chill: cooling an object. | p.124: Up to POW/3 ENC; ice-water cold without freezing or damage. | Enforce ENC; no automatic damage. |
| FM-S14 | Cleanse: cleaning an area. | p.125: Removes grime and smells, up to POW m², without organizing. | Area limit; not Tidy. |
| FM-S15 | Cool: natural heat or heat magic. | p.125: Prevents heat Fatigue; heat-magic resistance one grade easier; SIZ up to POW×2. | Size limit; separate the two effects. |
| FM-S16 | Coordination: a dexterous task. | p.125: Reroll one suitable skill check, keep the better; spell is spent. | One reroll, best result, effect ends. |
| FM-S17 | Curse: combined with a harmful spell. | p.125: Makes it continuous; Curse MP stays committed until it ends or is dispelled. | Require the paired spell; track duration and MP. |
| FM-S18 | Darkness: area of darkness. | p.125: Dims non-magical light within POW m². | Track area; doesn't suppress magical light. |
| FM-S19 | Deflect: small particles or missiles. | p.125: Rain, sand, insects; not ordinary missile weapons. | No missile armour or parry. |
| FM-S20 | Demoralise: proactive skill tied to the dread. | p.125: One grade harder; direct assault by the subject breaks it. | Penalty on relevant actions only. |
| FM-S21 | Dishevel: making a person or area dirty. | p.125: Up to POW m²; cosmetic only. | No durability change. |
| FM-S22 | Disruption: living target or object. | p.125: 1d3 to one random location or the object's HP, ignoring armour. | Roll damage and location; bypass armour. |
| FM-S23 | Dry: removing moisture. | p.125: Object or person up to POW×2 SIZ. | Size limit; external moisture only. |
| FM-S24 | Dullblade: dulling a weapon. | p.125: Damage down one die step. | One step down; no forbidden stacking. |
| FM-S25 | Extinguish: candle, torch, small fire or magical blaze. | p.125: Modest mundane fires only. | Refuse or flag large or magical fires. |
| FM-S26 | Fanaticism: devotion to a subject. | p.126: Temporary Passion equal to the caster's Folk Magic; counters Demoralise. | Track a temporary Passion at that value. |
| FM-S27 | Find (X): searching for a category. | p.126: Each variant learned separately; range; blocked by dense material; no thoughts or emotions. | Store the exact variant; concentration and range. |
| FM-S28 | Firearrow: projectile. | p.126: +1d3 fire; impaling flesh puts it out; may ignite flammables per the caster's skill; wooden ammunition consumed. | Fire damage, ignition, ammunition loss. |
| FM-S29 | Fireblade: melee weapon or tool. | p.126: +1d3 fire; prolonged contact may ignite; wooden hafts consumed. | Fire damage and equipment effects; not a die step. |
| FM-S30 | Frostbite: an extremity. | p.126: Numbness makes skills using it one grade harder; no HP damage. | Localized penalty, not damage. |
| FM-S31 | Glamour: attractive appearance. | p.126: Draws attention; no fixed bonus. | No automatic skill bonus. |
| FM-S32 | Glue: bonding two objects. | p.126: Separating needs to beat a Brawn of 5× the caster's POW. | Calculate the bond; opposed attempt. |
| FM-S33 | Heal: Minor, Serious or Major Wound. | pp.126–127: Minor recovers all lost HP in the location; Serious and Major gain no HP but stop bleeding and stabilize. | Heal by category; never restore Serious/Major HP. |
| FM-S34 | Heat: heating an object. | p.127: Up to POW/3 ENC; living tissue not directly affected. | Size limit; no direct tissue damage. |
| FM-S35 | Ignite: flammable inorganic material. | p.127: A small amount ignites; ordinary fire rules after. | Restrict target; hand off to fire rules. |
| FM-S36 | Incognito: identifying the character. | p.127: Unremarkable features; voice, size and mannerisms unchanged. | Concealment only. |
| FM-S37 | Ironhand: touching harmful material. | p.127: Hands resist heat, cold, acid; worn gear not protected. | Limited contact protection. |
| FM-S38 | Knock: a mundane lock or bar. | p.127: Opens one mechanical fastening per casting; not magical locks. | One fastening per cast. |
| FM-S39 | Light: an object, or Light against Darkness. | p.127: Lantern-like light; cast against Darkness, both are consumed. | Track light and mutual cancellation. |
| FM-S40 | Lock: a lockable device. | p.127: Only the caster can normally open it; lasts until opened or dismissed; MP committed. | Secure; keep MP committed; remove at end. |
| FM-S41 | Magnify: viewing at a distance. | p.127: Appears twice as close. | Optical effect; no automatic Perception bonus. |
| FM-S42 | Might: a Brawn task. | p.127: Add the caster's POW to STR for Brawn, not Damage Modifier. | Effective STR for strength tasks only. |
| FM-S43 | Mimic: imitating a known person. | p.127: Voice and mannerisms of someone seen and heard; not appearance. | Require a model; voice, not looks. |
| FM-S44 | Mindspeech: telepathy. | p.127: Shared language required; beyond range fails. | Enforce range and language. |
| FM-S45 | Mobility: movement. | p.127: Movement +1d3 m. | Roll and track the increase. |
| FM-S46 | Pathway: heavy vegetation. | p.127: Overgrowth doesn't slow movement. | Ignore that hindrance only. |
| FM-S47 | Perfume: masking a smell. | p.128: Changes the smell, not harmful properties. | Sensory effect only. |
| FM-S48 | Pet: controlling a small creature. | p.128: SIZ and INT each at most half the caster's CHA; a loyal pet needn't resist. | Enforce both limits and the exception. |
| FM-S49 | Phantasm: shaping mist or leaves. | p.128: Insubstantial shapes, not solid. | Descriptive forms, no HP. |
| FM-S50 | Pierce: pointed weapon or tool. | p.128: Ignores the first 2 Armour Points. | 2 AP penetration. |
| FM-S51 | Polish: buffing an object. | p.128: Up to POW ENC/SIZ; finish only, not quality. | Size limit; appearance only. |
| FM-S52 | Preserve: organic matter. | p.128: 1d3 months; up to POW SIZ/ENC; halts, doesn't reverse, decay. | Track the period and limit. |
| FM-S53 | Protection: first qualifying physical damage. | p.128: Reduced by 1d3 after armour, then the spell ends; not fire or choking. | One-use reduction on eligible damage. |
| FM-S54 | Repair: a damaged object. | p.128: Restores 1d3 object HP per casting. | Object HP up to max; not living healing. |
| FM-S55 | Repugnance: making a target unpleasant. | p.128: Aversion through chosen senses; no fixed modifier. | Record the social effect; GM decides responses. |
| FM-S56 | Shock: target fails to Evade. | p.128: Extremity stunned 1d3 Turns; armour doesn't help. | Location, stun duration, ignore armour. |
| FM-S57 | Shove: pushing a target. | p.128: ENC/SIZ limited by POW; no direct damage; living targets resist with Endurance or Evade. | Limit, resistance, no automatic damage. |
| FM-S58 | Sleep: used in combat. | p.128: Automatically fails in combat; otherwise SIZ limit, 1d3 Rounds onset, lasts half the caster's POW in hours. | Reject in combat; track onset and duration. |
| FM-S59 | Slow: target fails resistance. | p.128: Movement −(1d3+3) m. | Rolled reduction. |
| FM-S60 | Speedart: projectile weapon. | p.128: Range ×1.5. | Range multiplier, not damage. |
| FM-S61 | Spiritshield: spirit attacks or possesses. | p.129: Spirit must win opposed Willpower against the caster's Folk Magic. | Prompt the opposition; not immunity. |
| FM-S62 | Tidy: disordered items. | p.129: Up to POW items; items over 3 ENC only repositioned. | Item count; full vs partial tidying. |
| FM-S63 | Tire: target fails Endurance. | p.129: One Fatigue level. | Fatigue +1 with normal effects. |
| FM-S64 | Translate: two creatures communicate. | p.129: Imperfect between sapient speakers; animals get simple emotion only. | Limited communication. |
| FM-S65 | Tune: an instrument. | p.129: Accurately tuned for the next performance. | No automatic skill bonus. |
| FM-S66 | Ventriloquism: projecting speech. | p.129: Projects within range without speaking; living targets resist with Willpower. | Projection and resisted control. |
| FM-S67 | Vigour: exertion or Tire. | p.129: Exertion Fatigue effects ignored while it lasts, return after; negates Tire. | Suppress, don't erase, Fatigue. |
| FM-S68 | Voice: speaking in noise. | p.129: Listeners compelled to listen; carries 10× the recipient's CHA in metres. | Attention and range; not obedience. |
| FM-S69 | Warmth: natural cold or cold magic. | p.129: Prevents natural cold; cold-magic resistance one grade easier; SIZ up to POW×2. | Separate effects; size limit. |
| FM-S70 | Witchsight: magic, invisibility, disguised beings. | p.129: Perceive active magic and hidden entities in range and sight; a resisting being uses opposed Willpower. | Range, line of sight, opposition. |

### Find (X) variants — children of FM-S27

Find (X) is in the catalogue with all six printed variants in its description. The player records the variant as the spell's specialisation, so each learned variant is stored separately, as p.126 requires (**Pass**, tested). Detection effects stay GM-assisted.

| ID | Given | Core says | Expected app behaviour |
|---|---|---|---|
| FM-F01 | Find Arrows known. | p.126: Locates missed ammunition fired by hunters. | That category only. |
| FM-F02 | Find Flaw known. | p.126: Identifies defects or damage in objects. | Flaw detection only. |
| FM-F03 | Find Livestock known. | p.126: Locates a specified animal type, which can resist with Willpower. | Require the animal; apply resistance. |
| FM-F04 | Find Loot known. | p.126: Precious metals and gems. | Those valuables only. |
| FM-F05 | Find Object known. | p.126: A lost personal possession. | Eligible personal objects only. |
| FM-F06 | Find Sickness known. | p.126: Presence of disease or illness. | Detect, not diagnose. |

## Decisions

| ID | Question | Outcome |
|---|---|---|
| D-1 | Build a Folk Magic spell catalogue? | **Yes** (owner, 2026-11-05). The owner has permission to use the rulebook text. ChatGPT supplies the data in the format in `folk-magic-catalogue-format.md`; Claude loads it. FM-S and FM-F cases become testable for name, traits and specialisation; effects stay GM-resolved unless a later decision says otherwise. |
| D-2 | Model MP sources and recovery? | **No**: recovery stays manual (owner, 2026-11-05). MG-008 to MG-020 and MG-044 remain GM-assisted by decision. |
| D-3 | Track active Folk, Sorcery and Theism effects? | **No** (owner, 2026-11-05). MG-039, MG-041, FM-015, FM-016 and FM-021 remain GM-assisted by decision. |
| D-4 | Rounding for specialist starting spells (FM-002) and recovery ceilings (MG-013). | ChatGPT recommends rounding up (35% → 4 spells) as an interpretation; see `decisions.md`. Awaiting owner confirmation. The app only shows this as GM guidance today. |
| D-5 | Automate casting interruptions (MG-033, MG-035 to 038)? | ChatGPT recommends leaving it to the GM; see `decisions.md`. Awaiting owner confirmation. |

## Signed-in live evidence — 2026-11-05 (America/Los_Angeles)

ChatGPT (Work), one continuous signed-in Chrome session on [the live site](https://colemak1.github.io/mythras-character-forge/). Account UI positively showed **SIGNED IN / Test Player**. Used the existing dedicated **Magic Audit — Paired Skills** fixture, changed only through normal builder and Play Mode controls. Folk Magic was **29%**, POW/max MP **11**; began these casts at **2/11 MP**, devotional pool **5/6**. No random results or account calls were mocked. Reload evidence is in `magic-subsystem-cases.md`.

### Catalogue acceptance: failed / follow-up required

- With Folk Magic acquired, the Magic step showed **Spells known (0)**, an empty list, the **Add a GM-approved spell name** field and the old note that the unverified Imperative catalogue had been removed. There were no 70 Core spell choices. A normal reload and an attempted hard refresh did not expose them.
- Entering **Beastcall (X)** manually was possible, but the row read **Player-recorded spell; consult the Core Rulebook and GM.** It had no Core traits, **Core p.124** citation or animal-type speciality field. The Play Mode card likewise had no catalogue traits. This manual fallback does **not** pass the catalogue picker/speciality acceptance check.
- GitHub reports PR #116's Pages run [42132964917](https://github.com/colemak1/mythras-character-forge/actions/runs/42132964917) completed successfully for **d5bc11a9d675d559537120299bdd957926d6de44**. The document's observed asset URLs included `js/data.js?v=41`, `js/render.js?v=72`, `js/cloud.js?v=43` and `js/play.js?v=64`. These are observations, not proof of the asset bodies or a verified deployed SHA.
- PR #116 changes `js/data.js` and `js/render.js` without changing their `index.html` version parameters. Stale assets are a plausible explanation, **not an established cause**. Claude should check the served bodies and asset invalidation, then repeat the 70-choice, Beastcall traits/page/speciality and Play Mode trait checks. Do not add another automatic publisher.

### Casting and display: passed on the observed live build

Manual **Beastcall (X)** used the single Folk Magic skill, **29%**. The card read **1 MP base · 1 Turn · Intensity 1 · Magnitude 1 · ranged 29 m**. This verifies the requested timing/potency/range display at Standard difficulty; it does not verify actual range enforcement or spell effects.

| Attempt | Live roll/result | MP before → after | Evidence / result |
|---|---|---|---|
| 1 | 67 vs 29%, Failure | 2 → 1 | “failed, 1 Magic Point”; FM-011 passed |
| 2 | 3 vs 29%, Critical | 1 → 1 | “cast, no Magic Points (Critical)”; FM-009 passed |
| 3 | 56 vs 29%, Failure | 1 → 0 | “failed, 1 Magic Point” |
| 4 | Refused before roll | 0 → 0 | “Not enough Magic Points to attempt Folk Magic (minimum 1 MP).” No new roll entry; MG-021/0 MP block passed |
| Setup | Manually pressed magic plus five times | 0 → 5 | Test resource adjustment; not automatic MP recovery |
| 5 | 90 vs 29%, Failure | 5 → 4 | “failed, 1 Magic Point” |
| 6 | 42 vs 29%, Failure | 4 → 3 | “failed, 1 Magic Point” |
| 7 | 21 vs 29%, Success | 3 → 2 | “cast, 1 Magic Point”; FM-010 passed |

No live Folk fumble occurred. Fumble cost remains automated evidence only. Final fixture: **2/11 MP**, devotional pool **5/6**, Exhort **45%**, Devotion (Audit Cult) **29%**, Folk Magic **29%**, manual Beastcall (X), and no pending preparations. Prior non-Folk ability entries were retained. This batch does not close Subsystem 6 or change **3/8** progress.

### Five catalogue/source spot checks: passed for main's data, not live UI

Source: user's uploaded **`pdfcoffee.com_mythras-2e-2-pdf-free.pdf`**, Mythras 2e Core. Parsed PDF text was searched first; its glyph encoding was garbled, so **rendered printed pp.124 and 128** (PDF pages 125 and 129) were inspected visually. Compared names, traits, page references and numeric rules against `docs/folk-magic-catalogue.json` at **d5bc11a**. The generated `FOLK_MAGIC`/JSON sync is also covered by the passing catalogue test. The absent live picker prevented these five from being checked as live catalogue cards.

| Spell | Printed page | Verified numeric detail | Result |
|---|---|---|---|
| Bladesharp | 124 | Dagger 1d6+1; great axe **2d8+2**; sequence **1d4>1d6>1d8>1d10>2d6>2d8>2d10** | Match; all three occurrences of digit **8** are present |
| Breath | 124 | Maximum duration half caster POW in minutes | Match |
| Pierce | 128 | Ignores the first **two** Armour Points | Match |
| Sleep | 128 | SIZ ceiling caster POW; duration half POW hours; **1d3 Rounds** before effect; combat casting fails | Match |
| Speedart | 128 | Effective range **1.5 times** normal weapon distance | Match |

No dropped digits or additional numeric transcription defects were found in these five entries. This is a five-entry spot check, not a complete second audit of all 70 descriptions.

### Validation

All **17** `tests/*.cjs` files ran with the repository-prescribed loop on **d5bc11a** and passed; no `FAIL` markers. This includes `magic-folk-cases.cjs`, `magic-folk-catalogue.cjs` and `unified-routes.cjs`. The tests do not override the failed live catalogue acceptance above. Documentation only changed in this session.
