# Pits visual checks — 2026-11-11 (Claude, implementing `pits-visual-review-20261111.md`)

Scope: presentation only. Engine rules, dice, saved data and prompted rolls are unchanged. Screenshots are in `docs/pits-visual-checks/`, each taken with the picture frozen at the moment of contact.

How the checks run (not in CI, which has no browser): `node tests/visual/pits-scenarios.cjs` and `node tests/visual/pits-layout.cjs`, against a static server (`python3 -m http.server`). Both fighters are people (local PvP) so every choice is scripted; the engine's dice come from a queue per die size (a test-only seam, `window.__pitsDie`). Each scenario asserts the engine's HP, AP and state, the stage's outcome label, and for contact outcomes the distance between the weapon tip and the struck point (at most 26 px).

## Results (all pass, desktop 1280×800)

| Scenario | What it proves |
| --- | --- |
| 01 full weapon parry | Outcome `full-parry`; no HP lost; both spend 1 AP; the blade stops at the guard point in front of the body. |
| 02 shield parry | Same with a heater shield: shield contact, no HP lost. |
| 03 partial parry | Dagger v sword: deflection shown first, then only the residual hit; 3 HP lost (6 − 3 parry), by the engine's own arithmetic. |
| 04 armour only | Armour 6 absorbs the blow: neutral spark, "Armour −3", no injury, no flinch, no blood. |
| 05 miss | Attack fails with no defence: strike goes wide, "Miss", no injury. |
| 06 evade success | Strike goes through empty air; the evader is prone (as the engine says); no injury. |
| 07 evade failure | The evader is prone and the blow still lands: 5 HP, contact on the chest. |
| 08 blocked critical | "Critical attack" at the roll stage; no "Critical hit" banner; resolves as a full parry; no HP lost. |
| 09/10/11 head, torso, leg | Contact height follows the location; tip within tolerance of the struck part each time; HP lost on the right location. |
| 12 spear thrust at a leg | Thrust (not a cut) to the leg. |
| 13 Choose Location → left leg | The location ring and the strike both go to the leg the player chose. |
| 14 trip | Trip contact shown, defender prone per engine state. |
| 15 disarm | Disarm contact on the weapon hand, defender's disarmed state per engine. |
| 16 impale, kept hold | Spear anchored in the struck limb, wielder still reaching into the wound. |
| 17 impale, left in the wound | Wielder unarmed, spear stays in the limb. |
| 18 lethal head blow | The fight ends (maximised greatsword on the head). |

Layout (`pits-layout.cjs`, 1280×800 and 1440×900): no Sit’ota navigation or tab bar in battle; Exit Battle visible; dice tray top centre and inside the viewport; the reaction choices end inside the viewport; both fighters fully inside the stage; plates beside the tray, not under it; the round strip stays between the plates with 50-character names and initiative; neutral "Engaged" wording. Cancellation: Show results mid-replay leaves no particles, numbers, banners, dropped weapons or running animation, and nothing arrives late; Exit Battle hides the arena and restores the site navigation; a new bout has exactly one weapon per fighter and no old effects.

## Known limits (Severity 3: built and unit-tested, not driven in a browser scenario here)

- Impale **withdrawn** and **failed withdrawal**, Entangle and breaking free, Trip followed by Regain Footing, Disarm followed by recovery, a Defeat (as opposed to Victory) ending: drawn from engine state and covered by unit tests of that mapping (`tests/pits-stage.cjs`), but no scripted browser scenario or contact screenshot yet.
- Shield bash, left-handed wielders and the rarer weapon drawings (whip, net, flail, trident, polearm) are unit-tested for geometry only.
- Quick pace and Reset mid-replay: the same cancellation path as Show results and Exit Battle, not separately scripted.
- Phones: layout unchanged in intent (tall stage, decision below), not part of this batch's checks.
- Nothing here was checked on the deployed site, with saved characters, or in a signed-in session. No sourcebook rulings were needed or made.
