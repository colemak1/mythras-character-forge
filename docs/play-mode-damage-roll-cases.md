# Play Mode damage roll: cases for rules review

**Status:** implemented by Claude 2026-11-07 (owner approved the helper). **ChatGPT (Chat) to verify each row against Core and give page references.** Tests: `tests/play-stone-design.cjs`.

The helper sits in the combat card's last step ("Resolve"). It only rolls and shows; it never changes HP. Text on the card: "before parry and armour. A successful parry blocks by weapon size (Core pp.94–95); armour then reduces what is left."

| # | Given | The app does | Needs checking |
|---|---|---|---|
| R1 | Attack roll Success or Critical, weapon recorded | Offers "Roll damage" once Special Effects are chosen | Is damage rolled for every successful attack, including one the opponent parries successfully? (The card says parry then reduces it.) |
| R2 | Melee weapon | Weapon damage + Damage Modifier (STR+SIZ table) | Page reference |
| R3 | Ranged weapon | Adds the Damage Modifier only when the weapon table's DM column is Y | Page reference for the DM column |
| R4 | Negative Damage Modifier larger than the roll | Total floored at 0 | Can damage go below 0? Page reference |
| R5 | Hit location | d20: 1–3 R. Leg, 4–6 L. Leg, 7–9 Abdomen, 10–12 Chest, 13–15 R. Arm, 16–18 L. Arm, 19–20 Head | Page reference (humanoids only; creatures are Subsystem 7) |
| R6 | Maximise Damage picked (stacks) | One weapon die per pick set to its maximum, largest die first; Damage Modifier still rolled | Matches the effect text (Core p.?); not for natural weapons (Unarmed) |
| R7 | Impale picked | Shows a second weapon-damage roll: "use the better weapon roll if it gets through armour" | Does the second roll include the Damage Modifier? |
| R8 | Choose Location picked | Shows the d20 location "(or choose, Choose Location)" | — |
| R9 | Changing the opponent result or the Special Effects after rolling | The damage roll is cleared | — |
| R10 | Failed attack, parry or evade roll, or no weapon recorded | No damage roll offered | — |

## ChatGPT Core source verdict — R1–R10

**Reference:** user-uploaded *Mythras 2e Core Rulebook*, printed pp.9, 65, 94–98, 109–110. **Original page images inspected**, especially the pp.94–95 damage/parry sequence, p.97 Impale, p.98 Maximise Damage, p.109 humanoid locations and p.110 damage resolution. Application snapshot checked: `js/play.js` at `27e895d22c3c3a1017af04c71cafe9de405341cc` and corresponding `js/app.js` on `main`. This is a source and code inspection, not a browser acceptance pass.

| Case | Verdict | Printed Core basis | App status and exact correction |
|---|---|---|---|
| **R1 — Successful attack vs parry** | **CORRECT with qualification** | **pp.94–95,110:** After attack/parry comparison and chosen Special Effects, a successful/critical attacker can roll damage; a successful parry blocks **all** if defending Size ≥ attacking, **half** if one smaller, **none** if two or more smaller, before armour. The defender may earn Special Effects independently of whether damage occurs. | **HANDLED:** A pre-parry damage roll is valid even if a successful same/larger Size parry later eliminates HP damage. Keep wording that the helper never applies damage automatically. Do **not** imply every attack success causes HP loss. |
| **R2 — Melee modifier** | **CORRECT** | **pp.9,94,109–110:** Weapon damage is modified by attacker’s STR+SIZ Damage Modifier (including a negative modifier). | **HANDLED:** Compute weapon dice and Damage Modifier separately before reductions. |
| **R3 — Ranged modifier** | **CORRECT** | **p.65** ranged weapon table marks whether Damage Modifier is applied (Y/N); **pp.109–110** apply listed weapon damage before protection. | **HANDLED:** Use the per-weapon Y/N, not an unconditional DM for all ranged weapons. |
| **R4 — Negative damage floor** | **CORRECT** | **p.9** explicitly rules that a negative Damage Modifier reducing the attack to zero or below inflicts **no damage**. **p.110** subtracts damage only when remaining damage is positive. | **HANDLED:** Clamp total to 0, never allow negative damage/healing from an attack. |
| **R5 — Humanoid d20 table** | **CORRECT** | **p.109** Humanoid Hit Locations: 1–3 right leg; 4–6 left leg; 7–9 abdomen; 10–12 chest; 13–15 right arm; 16–18 left arm; 19–20 head. | **HANDLED** for humanoids; other anatomy remains Subsystem 7. |
| **R6 — Maximise Damage** | **INCORRECT natural-weapon exclusion** | **p.98** explicitly **allows natural weapons**, maximises **one weapon damage die per earned effect**, and leaves Damage Modifier rolled normally. The effect can stack. **p.95** supports stacked choices. | **NEEDS CODE:** `pmRollDamageFor` currently uses `w.natural?0:...`, so an eligible Unarmed/natural-weapon critical cannot get its die maximised. Remove that exception and correct the player-facing effect description that says it “cannot be used with natural weapons”. Where mixed-size dice exist, Core permits choosing which die to maximise; the automatic largest-die-first priority is a possible selection, not a Core-mandated ordering. Add tests for natural 1d3 and stacked 2d6 or mixed dice. |
| **R7 — Impale’s second roll and Damage Modifier** | **RULE CORRECT, RESULT DISPLAY INCOMPLETE** | **p.97** tells the attacker to roll **weapon damage twice and choose which result** to use; the post-hit impalement option applies only if armour is penetrated and a wound results. **pp.9,94,110** identify Damage Modifier as a separate addition in the normal damage order. **p.98** separately removes DM only from the damage on *withdrawal*. | **NEEDS CODE/COPY:** The second roll should **reroll weapon dice, not Damage Modifier**. Roll DM **once**, then add it to the **selected weapon-dice result**. Current `pmRollDamageFor` correctly rolls DM once but computes/display `total` from only the *first* weapon roll even when the second is higher (e.g. weapon 3 vs 7, DM +2 should allow **9**, not displayed 5). Show the chosen/better valid attack total before parry and armour; remove “use the better weapon roll **if it gets through armour**”, which makes choice appear conditional or late. Choosing the roll precedes checking penetration; leaving the weapon embedded requires an actual wound. |
| **R8 — Choose Location** | **NEEDS clearer override** | **pp.95–96,109:** Special Effects are selected **before** damage and location; Choose Location replaces a random hit-location roll when the effect is legal. Ranged usage has separate restrictions (p.96). | **NEEDS CODE/COPY:** Current helper still rolls and highlights a d20 location and appends “(or choose, Choose Location)”. When chosen, prominently show the **chosen** location as authoritative (a simple selector or explicit GM/manual field), not the random d20 result. For no Choose Location, retain the p.109 d20 table. |
| **R9 — Invalidate obsolete result** | **GOOD APP INVARIANT** | **p.95** orders Special Effect choices before damage/location; the book does not describe software roll-log invalidation. | **HANDLED (code checked):** `js/app.js` clears stored damage when opponent result or chosen effect changes. No additional Core-specific rule claimed; test that fresh roll uses revised conditions. |
| **R10 — Do not offer normal attack damage** | **GOOD HELPER SCOPE** | **pp.94–95,109:** Only successful/critical **attacker** rolls proceed to their normal attack damage; some defensive effects can inflict damage separately (e.g. Accidental Injury, p.96). | **HANDLED:** A failed attacker roll, defender Parry/Evade roll or missing weapon should not invoke the *attacker weapon-damage helper*. Keep GM-assisted defensive-effect injury separate; no weapon recorded means no trustworthy weapon dice. |

### Fix/test priority and evidence boundary

1. **P0 rules correctness:** **R6** — natural weapons must qualify for Maximise Damage (Core p.98). Fix the code and the effect reference together. No book support exists for the blanket natural-weapon prohibition.
2. **P1 numeric correctness:** **R7** — show the damage of whichever of the two weapon rolls the attacker uses, plus **one** Damage Modifier. Include deterministic tests with both second-higher and first-higher cases, negative DM floored at zero and the armour/wound-gated embedding decision.
3. **P2 selection clarity:** **R8** — if Choose Location was selected, do not silently treat a new d20 as the actual location. Keep a simple player/GM override, not an automated combat engine.
4. Retain **R1–R5 and R9–R10** behavior and add regression assertions where a nearby fix could break them. In particular, a successfully parried attack can still generate a rolled attack-damage **reference** while causing **zero HP damage** (pp.94–95).

**Important:** This is **not** a new Combat subsystem reopening or completion revision. Subsystem 5 remains closed for its previously declared PC-focused scope; this feature's **new** damage helper has its own targeted validation. This docs-only source review does not establish automated tests or a deployed live pass. Progress stays **4/8**.

## Claude implementation (2026-11-07)

Claude checked the two main claims against the rendered book text (p.98: Maximise Damage "can also be used for natural weapons"; p.39: +1 SIZ per full 10% Brawn) and implemented the corrections:

- **R6:** Maximise Damage now applies to natural weapons (Unarmed), one weapon die per pick, stacking; the Damage Modifier is still rolled. The effect's reference text was corrected too. Largest die first is kept as the automatic choice.
- **R7:** Impale rolls the weapon dice twice. The better roll is preselected and the player can switch to the other; the total is the chosen roll plus **one** Damage Modifier, floored at 0. The card says to pick the roll now; leaving the weapon in needs a wound.
- **R8:** with Choose Location, no d20 is rolled. The card shows a location picker and the chosen location is the one recorded.
- R1–R5, R9 and R10 are unchanged and keep their tests.

Tests: `tests/play-stone-design.cjs` (R6, R7 both orders, R7 with a negative DM, R8, R9/R1).
