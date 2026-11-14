# Pits spring trial: test batch for ChatGPT (Work), 2026-11-14

The owner is play-testing freely at the same time. This batch is the systematic part: every weapon family, every special effect the stage draws, and the ordering faults fixed this week. It tests **presentation only** (what the figures do and when). Rules results come from the engine and are not under test here; if a rule looks wrong, note it in one line for ChatGPT (Chat) and move on.

**Page:** `https://raw.githack.com/colemak1/mythras-character-forge/claude/sharp-franklin-mbjthj/experiments/practice-combat.html?stage=spring`
No sign-in needed. If the top bar has no **Copy fight record** button, the link is serving an old copy: wait a minute and reload.

## Setup for every bout

- Mode **Local PvP** (you play both sides and choose every reaction), unless the check says **Gauntlet** (the arena's own opponent).
- Window 1280 x 800 (and 1440 x 900 for part E). Top bar: **Guidance off**, **Standard pace**, **Auto-roll off**, bottom layout **Current**.
- Fighter one is "A", fighter two is "B". Set weapons, shields, armour and Combat Style on the setup screen as each check says.
- To steer outcomes, use Combat Style: **110** for criticals and special effects, **20** for misses. Armour 4 or more makes bouts last longer.
- **Evidence:** when a check fails, press **Copy fight record** at once (before Exit battle or a new bout), and save what it copies as `docs/pits-records/20261114-<check id>.json`. One record per failure. If the clipboard is blocked, the button opens a box with the text to copy by hand.

## How to look

Watch each exchange at normal speed. If a moment is unclear, watch it again in **Replay fight** at the end of the bout. For every exchange, ask:

1. **Order:** the declared action (weapon drawn back, guard set or body lowered) comes first, then the dice, then the blow. Nothing from the next exchange starts before this one's blow lands.
2. **Agreement:** the picture matches the dice and the chronicle (a parry is drawn as a parry, a miss as a miss, a wound lands where the hit location says).
3. **Stillness:** both figures are completely still while a choice is waiting or the dice roll.
4. **Plates:** a plate's chips (Prone, Serious wound...) change when the figure shows it, not before.
5. **Weapons:** each weapon is drawn as itself, in the right hand(s), and is never in two places at once.

## A. Every weapon family (13 bouts)

Each bout: A has the listed weapon, B a **broadsword**; both Combat Style 70, armour 4. Play at least four exchanges, with B reacting **parry**, then **evade**, then **none**, then **parry**; then let B attack A the same way. Then Replay fight once.

| ID | A's weapon | Look especially at |
|---|---|---|
| A1 | Dagger | Short reach: A comes in close before striking; no blade through bodies at the hold. |
| A2 | Rapier | Thrusts, not cuts. |
| A3 | Longsword (1H) | Same as the broadsword, a little further out. |
| A4 | Mace | Swung like a cut (stand-in). |
| A5 | Battleaxe (2H) | Off hand on the haft next to the weapon hand. |
| A6 | Greatsword | Off hand on the grip; fights from further out than the broadsword. |
| A7 | Great hammer | As A6. |
| A8 | Halberd / Poleaxe | Lead hand well up the shaft; long measure. |
| A9 | Quarterstaff | Both hands on the staff. |
| A10 | Shortspear (one-handed) | Thrusts; one hand. |
| A11 | Pike / Sarissa | Very long measure; lead hand up the shaft; the point does not pass through B when B parries or A misses. |
| A12 | Flail | Swung like a cut; drawn rigid (expected for now). |
| A13 | Whip | As A12, at long reach. |

Expected for now (do **not** report): flails and the whip are drawn as stiff rods; the net is swung like a blade; big weapons move at sword speed. Report everything else, especially a weapon held through the opponent's body while the scene holds still, the off hand gripping air, a figure snapping between poses, or a stall.

## B. Special effects and falls (12 checks)

A has a **broadsword** at Combat Style 110 and B a broadsword at 40, unless stated. Attack until the effect is offered (a critical, or B failing a parry), then choose it.

| ID | Do this | Expected |
|---|---|---|
| B1 | A: **Trip Opponent**, B fails to resist | B sits down on the backside, legs out toward A, weapon up. Not the crumble onto the knees used for a defeat. The plate says Prone only once B is down. |
| B2 | After B1, B: **Regain Footing** | B gets up from sitting into a stance. |
| B3 | B attacks from the ground (after B1, before getting up); A parries | B stays down. Known limit: only the arms move. Report only a stall, a jump to standing, or a blade through A. |
| B4 | A: **Disarm Opponent** | B's weapon leaves the hand once, at the contact of A's blow, and lands on the floor. It does not jump back into the hand. |
| B5 | B parries A's failed attack and wins **Disarm** (A at 40, B at 110) | B's parry is drawn first, then the disarm. |
| B6 | A: **Impale** with a **rapier**, then **Keep hold** | The weapon stays in the wound and A's arm stays reaching to it. |
| B7 | As B6, but **Leave it in the wound** | The weapon stays in the wound. Nothing is thrown to the floor behind A. |
| B8 | A: **Press Advantage** | A keeps the point in B's face and B covers. |
| B9 | A: **Choose Location** (Head) + **Maximise Damage** | The blow lands at the head. |
| B10 | Both with shields (A heater, B buckler): A makes a **Shield strike** | Drawn as a shield strike, not a sword cut. The two shields are clearly different sizes. |
| B11 | A wounds B's **weapon arm** until it is disabled | The arm hangs and the weapon drops; B stays on its feet. |
| B12 | A wounds B's **leg** until it is disabled | B crumbles where it stands (this fall is correct for a leg). |

## C. Ordering (5 checks)

| ID | Do this | Expected |
|---|---|---|
| C1 | **Gauntlet** (Normal): play until the opponent is knocked out by a Serious or Major Wound | The opponent's Serious Wound and Endurance dice roll **before** the blow lands; then the blow, the collapse, then Victory. Repeat in up to three bouts until it happens once. |
| C2 | Gauntlet: A attacks and misses, and the opponent attacks at once | A's miss is drawn completely before the opponent winds up. |
| C3 | Local PvP: A at 20, B at 70. A attacks (miss), B reacts **none**, then B attacks and A parries | A's miss first, then B's attack and A's parry. |
| C4 | Local PvP: B **evades** A's attack and ends prone | B's plate says Prone only when B is seen to go down, not during the hit location and damage rolls. |
| C5 | Any bout: during a choice or a dice roll, watch both figures for 5 seconds | Neither moves at all. |

## D. Replay and the end of a bout (4 checks)

| ID | Do this | Expected |
|---|---|---|
| D1 | After a bout of six or more exchanges: **Replay fight** | The whole fight plays as one movement, in the same order as it was played, with no errors. |
| D2 | During the replay: **Show result** | The replay stops and the result window opens; no old weapons, blood or banners stay on the stage. |
| D3 | **Gauntlet**: win a bout, then go to the next opponent | The Current exchange starts empty; one weapon each; nothing left over from the last bout. |
| D4 | A bout ending in a concession (**Concede bout**) | The yielding figure is drawn yielding; no blow is drawn. |

## E. Screen (2 checks)

| ID | Do this | Expected |
|---|---|---|
| E1 | 1280 x 800 and 1440 x 900, bottom layout Current, your turn | All action names are shown whole (Switch Weapon Hand, Change Range and Regain Footing wrap onto two lines; none end in "..."). |
| E2 | Press **Copy fight record** mid-bout | The button says Copied; the pasted text starts with `{"record":"pits-spring-1"`. |

## Report

One file, `docs/pits-spring-work-20261114.md`: one line per check ID, **pass**, **fail** or **blocked**. For each fail, add one line saying what was seen against what was expected, a severity, and the record file name:

- **Severity 1:** a stall or error; the picture contradicts the dice (a hit drawn for a parry, a fall that did not happen, a weapon that is lost but still swings); the order puts a result before the dice that decide it.
- **Severity 2:** something clearly wrong that does not mislead (a weapon through a body, a hand gripping air, a snap between poses, a wrong order of two drawn actions).
- **Severity 3:** cosmetic, or the known limits above.

A blocked check is recorded once as blocked, with the reason, and not retried. Do not re-test checks that pass. Docs-only PR; do not edit `CHANGELOG.md`; change only your own line in `HANDOFF.md`.
