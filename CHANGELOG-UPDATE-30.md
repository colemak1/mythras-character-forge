# Update 30 — Record Special Effects from a combat roll

- A won Combat Style roll now opens the Special Effects list in selection mode, showing the number of choices allowed by the opposed result.
- Players can choose and remove effects. Selections appear on the roll result and persist with the character's roll log.
- The selector caps choices at the result's margin, permits repeated stackable effects, excludes defensive-only choices, and blocks clear critical or fumble requirements when the roll does not qualify. Weapon and other situational requirements remain visible for table adjudication.
- Changing the opponent's roll clears choices made against the earlier result. Read-only sheets cannot alter selections.
- The existing reference list remains available when the opponent wins.

Verified locally with `node tests/effect-selection.cjs`, `node tests/combat-turn.cjs`, and `node tests/rules-smoke.cjs`. Signed-in hosted play remains to be checked with an authenticated account.
