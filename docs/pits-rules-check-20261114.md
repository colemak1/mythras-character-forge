# The Pits: rules check on the common path (2026-11-14)

**Asked by:** the owner, before beta testing: "not all the rules are 100% accurate". **For:** ChatGPT (Chat), with the
Core rulebook. **Claude:** builds each fix with a test.

The last full review (`docs/the-pits-combat-procedure-review.md`) is from before PR #181; most of its NEEDS CODE rows
were built since. This pass covers only what happens in **ordinary fights**, as the code does it **today**. For each
row: check it against the book, then answer **OK** (one word is enough) or **WRONG: given X → Core p.N says Y**.
Skip anything you cannot check without the page; say which page you need. Only WRONG rows need detail.

Code: `js/combat-rules.js` (shared rules), `experiments/practice-combat.html` (the Pits engine), line numbers as of
`main` at `b5929b1`.

## A. Turn and Action Points

| ID | What the Pits does | Where | Page it claims |
|---|---|---|---|
| RC-01 | Action Points from INT+DEX, refreshed each round. Each turn one proactive action; each reaction (parry, evade) costs 1 AP. Delay keeps 1 AP for a reaction; unused by your next turn, it is lost. | `combat-rules.js` `actionPointsFor`; `refreshFighterAP` | pp.8, 90–92 |
| RC-02 | Initiative: d10 + Initiative Bonus (average of INT and DEX, up) − armour penalty. Equal totals act at the same time. The d10 is rolled once per fight; the total is recomputed each round for new Fatigue. | `beginEncounter` (~3034), round start (~736) | pp.8, 90 |
| RC-03 | A fighter with 0 AP cannot react; an attacker can attack while the defender has no AP. | `react`, `pitsLegalActions` | p.90 |

## B. Rolls and grades

| ID | What the Pits does | Where | Page it claims |
|---|---|---|---|
| RC-04 | Critical on a roll ≤ skill ÷ 10, rounded **up**. 01–05 always succeed, 96–00 always fail. Fumble on 99–00 (on 00 only, when the skill is over 100). | `gradeRoll` | pp.38–39 |
| RC-05 | Opposed rolls: better grade wins; same success grade, the higher roll wins; two failures, nobody wins. | `opposedWins` | p.50 |
| RC-06 | Skill over 100 in an opposed or differential roll: the higher fighter's excess is taken off both. | `opposedTargets`, `adjustDifferentialRolls` | p.51 |
| RC-07 | Difficulty grades: Hard ×2/3, Formidable ×1/2, Herculean ×1/10, Hopeless 0; fractions rounded **up** (D-CE2). | `skillAtGrade` | pp.38, 49–50 |

## C. Attack and defence

| ID | What the Pits does | Where | Page it claims |
|---|---|---|---|
| RC-08 | Special Effects = the difference in grades between attack and defence (critical/success/failure/fumble table). Not defending counts as a Failure. Failure against Fumble gives one (D-CE1). | `effectsWon`; `react` line ~3248 | pp.94–95, 100 |
| RC-09 | A defender may parry or evade an attack that **missed**, only to try for defensive Special Effects. | `react` | pp.94–95 |
| RC-10 | Parry: a successful parry with a weapon or shield of equal or larger Size blocks all damage; one Size smaller blocks half (the blocked half rounds **up**, owner PIT-P01); two or more smaller blocks nothing. A failed parry blocks nothing. | `parryAbsorption` | pp.94–95 |
| **RC-11** | **Evade: a successful Evade avoids the whole blow. After any Evade roll, success or failure, the defender is left prone** (line 3247: `if(action==='evade'&&dr){d.prone=true;...}`). Prone costs a turn and 1 AP to stand (opposed Brawn or Athletics while engaged). **Claude's main suspect:** it makes Evade nearly useless and fighters spend much of a bout on the ground. Is a fighter prone after every evade against a melee attack, only after some (e.g. a failed one, or only when diving against ranged), or never? | `react` line 3247 | not cited in the code |
| RC-12 | Prone: own attacks, parries and evades are Formidable (half). (No bonus found in the code for attacking a prone fighter.) | `combatTarget`, `evadeTarget` | p.101 |
| RC-13 | A successful parry or evade against a successful attack: no damage, but the attacker can still win Special Effects if their grade was better (e.g. critical against success). | `react`, `resolveHit` | pp.94–95 |

## D. Damage and wounds

| ID | What the Pits does | Where | Page it claims |
|---|---|---|---|
| RC-14 | Hit location d20: 1–3 right leg, 4–6 left leg, 7–9 abdomen, 10–12 chest, 13–15 right arm, 16–18 left arm, 19–20 head. | `HUMAN_HIT_LOCATIONS` | p.104 |
| RC-15 | Damage = weapon dice + Damage Modifier (never below 0), then minus the parry's share, then minus the location's armour. | `resolveHit` | pp.9, 103 |
| RC-16 | Wound level by location HP: below starting HP and above 0 = Minor; 0 or below and above minus starting HP = Serious; minus starting HP or below = Major. | `woundLevel` | pp.109–110 |
| RC-17 | Serious or Major wound: Endurance opposed against the **original attack roll**. Serious failed: limb useless (arm drops what it holds; leg: prone); head, chest, abdomen: unconscious. Major: limb incapacitated and prone; head, chest, abdomen: resisted means unconscious and dying, failed means dead. The fight ends on unconsciousness or death. | `woundOutcome`, `woundEndurance` | pp.109–110 |
| RC-18 | Every Serious wound, before its Endurance roll: the fighter cannot attack for 1d3 turns (parry, evade and other actions still allowed). | `resolveWound` ~3776 | p.110 |

## E. Special Effects that come up most

| ID | What the Pits does | Where | Page it claims |
|---|---|---|---|
| RC-19 | Which effects are offered: by role (attacker or defender), weapon trait and grade, per the summary table. | `meleeEffectOptions` | pp.95–101 |
| RC-20 | Trip Opponent: the target resists with the best (computer) or chosen (player) of Brawn, Evade or Acrobatics, **opposed against the roll that won the effect**. Fails: prone. | `applyEffect` trip | pp.100–101 |
| RC-21 | Disarm Opponent: only against a foe with STR up to twice the disarmer's. Target resists with Combat Style opposed against the winning roll, adjusted by the Size difference: ×1/10, ×1/2, ×2/3 when the disarmer's weapon is 3, 2, 1 Size larger; ×1.5, ×2 when 1, 2+ smaller. **Rounded to nearest, not up** (different from RC-07: Claude's question). A lost weapon is thrown the disarmer's positive Damage Modifier in metres. | `canDisarm`, `disarmResistSkill` | p.97 |
| RC-22 | Bleed (cutting weapon) and Stun Location (bludgeoning): only if the blow wounds; the target's Endurance is opposed against the **attack** roll. Bleed: one Fatigue level each new round. Stun: the location is useless for as many turns as the damage. | `resolveHit` | pp.96, 100 |
| RC-23 | Choose Location: the attacker picks any location in reach instead of rolling. | `applyEffect` choose | p.96 |
| RC-24 | Press Advantage and Overextend: the target cannot attack on their next turn. | `restrictNextAttack` | pp.98–99 |
| RC-25 | Impale: damage rolled twice, the attacker picks; the weapon may lodge (victim's skills harder by SIZ and weapon Size, Impale table). | `applyEffect` impale, `impaleGrades` | p.97 |

## F. Other

| ID | What the Pits does | Where | Page it claims |
|---|---|---|---|
| RC-26 | Optional Reach rules (Closing and Opening Range) are always on. | `engagementInfo` | pp.106–107 |
| RC-27 | Combat exertion: an Endurance test every CON seconds of fighting (rounded up to rounds); failing adds Fatigue. | line ~747 | pp.78–79 |

**Reply format:** a docs-only PR adding a column "Core says" to this file (OK or the case), or a short chat answer the
owner pastes to Claude. Claude then fixes every WRONG row with a test, and lists anything not changed under Known limits.
