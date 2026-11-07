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
