# Practice Combat — Recenter update 1

Saved characters can now enter the practice gauntlet from **Characters → Practice Combat**. The arena continues to open on its existing page.

## Changed

- Added a Practice Combat action to each saved character card.
- Uses a temporary, rested copy with the character's actual Combat Style percentage, advanced characteristics, six combat/recovery skills, Action Points, location HP maximums, location armour and armour initiative penalty.
- Select a Combat Style and a supported weapon/shield that the character both owns and has listed in that style. An unsupported loadout cannot silently become the preset fighter.
- Normal restores the imported HP maximums after a win; Hardcore carries only practice injuries forward. Retrying starts another fresh practice copy.
- Setup identifies abilities and equipment outside the arena's current scope. Combat Style Traits, species abilities, magic, Luck, encumbrance modifiers, ranged attacks, dual wielding and in-combat weapon switching remain unimplemented.
- Fixed unreadable setup headings, made the character loadout compact, and added a return link to My Characters.
- Decision help now reports the current Action Point situation. Manual rolls and the existing result pacing are preserved.

Supported weapon profiles: Broadsword, Shortspear, Mace, Dagger and Greatsword. Supported shields: Buckler, Heater and Hoplite. The existing five weapon profiles are reused; this update adds no new weapon data or rule interpretations. Derived character values come from the existing Forge sheet calculations.

## What to test

1. Open Characters, choose Practice Combat on a saved character, and compare the available style, skills, AP, armour and HP maximums with the sheet.
2. Select a weapon and shield; select a Greatsword and check that the shield becomes unavailable.
3. Start a fight, take damage, then return to Characters. The saved character's wounds and resources must be unchanged.
4. Win a Normal encounter and check the next opponent starts with restored practice HP. In Hardcore, practice damage should carry forward.
5. Try a character with an unsupported weapon or an empty Combat Style weapon list. Setup must explain the missing loadout and prevent entry.

## Validation

- Character-practice integration tests cover profile isolation, progression values, HP maximum overrides, armour, ownership, zero skills, invalid profiles, unsupported loadouts, two-handed gear, Normal recovery and Hardcore carryover.
- Existing practice UX, unified route/workflow and rules smoke suites pass.
- Browser preview verified loadout selection, the two-handed shield restriction, opponent entry and the imported fighter's displayed battle values using a synthetic test character.
- A signed-in production walkthrough with a real saved account character remains to be checked; account and database writes were not changed.

## Next

Improve situation-specific decisions and teaching throughout the gauntlet, with explanations verified against the uploaded Mythras Core Rulebook. Then tune coherent generated opponents and progression around actual character builds.
