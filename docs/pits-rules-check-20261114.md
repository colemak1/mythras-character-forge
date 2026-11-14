# The Pits: rules check on the common path (2026-11-14)

**Asked by:** the owner, before beta testing: "not all the rules are 100% accurate". **For:** ChatGPT (Chat), with the
Core rulebook. **Claude:** builds each fix with a test.

**Audit result:** 22 OK; 5 WRONG (RC-07, RC-08, RC-12, RC-21, RC-25). **All five fixed 2026-11-14 (Claude), each with a test; see "Fixes" at the end.** Compared against the owner-uploaded *Mythras Core Rulebook*, printed pages cited below; Core-table claims were checked against rendered PDF pages as well as extracted text. This is a **rule/code check**, not a live fight test.

The last full review (`docs/the-pits-combat-procedure-review.md`) is from before PR #181; most of its NEEDS CODE rows
were built since. This pass covers only what happens in **ordinary fights**, as the code does it **today**. For each
row: check it against the book, then answer **OK** (one word is enough) or **WRONG: given X → Core p.N says Y**.
Skip anything you cannot check without the page; say which page you need. Only WRONG rows need detail.

Code: `js/combat-rules.js` (shared rules), `experiments/practice-combat.html` (the Pits engine), line numbers as of
`main` at `b5929b1`.

## A. Turn and Action Points

| ID | What the Pits does | Where | Page it claims | Core says |
|---|---|---|---|---|
| RC-01 | Action Points from INT+DEX, refreshed each round. Each turn one proactive action; each reaction (parry, evade) costs 1 AP. Delay keeps 1 AP for a reaction; unused by your next turn, it is lost. | `combat-rules.js` `actionPointsFor`; `refreshFighterAP` | pp.8, 90–92 | OK |
| RC-02 | Initiative: d10 + Initiative Bonus (average of INT and DEX, up) − armour penalty. Equal totals act at the same time. The d10 is rolled once per fight; the total is recomputed each round for new Fatigue. | `beginEncounter` (~3034), round start (~736) | pp.8, 90 | OK (Core pp.10, 79, 90; rounding the Initiative Bonus upward is an app convention, not stated on p.10). |
| RC-03 | A fighter with 0 AP cannot react; an attacker can attack while the defender has no AP. | `react`, `pitsLegalActions` | p.90 | OK |

## B. Rolls and grades

| ID | What the Pits does | Where | Page it claims | Core says |
|---|---|---|---|---|
| RC-04 | Critical on a roll ≤ skill ÷ 10, rounded **up**. 01–05 always succeed, 96–00 always fail. Fumble on 99–00 (on 00 only, when the skill is over 100). | `gradeRoll` | pp.38–39 | OK (the stated roll thresholds appear on Core p.37, not pp.38–39). |
| RC-05 | Opposed rolls: better grade wins; same success grade, the higher roll wins; two failures, nobody wins. | `opposedWins` | p.50 | OK (when both fail there is no winner; Core p.51 permits a reroll or GM narration). |
| RC-06 | Skill over 100 in an opposed or differential roll: the higher fighter's excess is taken off both. | `opposedTargets`, `adjustDifferentialRolls` | p.51 | OK |
| RC-07 | Difficulty grades: Hard ×2/3, Formidable ×1/2, Herculean ×1/10, Hopeless 0; fractions rounded **up** (D-CE2). | `skillAtGrade` | pp.38, 49–50 | WRONG: given a Hopeless target is converted to skill 0 and still passed to `gradeRoll`, 01–05 can succeed → Core p.38 says *no attempt can be made*. Core p.37 only grants 01–05 automatic success on an allowed roll. Other grade factors are correct; rounding the adjusted percentage up is D-CE2 app policy, not explicit in Core p.38. |

## C. Attack and defence

| ID | What the Pits does | Where | Page it claims | Core says |
|---|---|---|---|---|
| RC-08 | Special Effects = the difference in grades between attack and defence (critical/success/failure/fumble table). Not defending counts as a Failure. Failure against Fumble gives one (D-CE1). | `effectsWon`; `react` line ~3248 | pp.94–95, 100 | WRONG: given Failure against Fumble, `effectsWon` grants one Special Effect → Core p.51's Differential Roll Results table gives **No Benefit**, and p.95 says a failed combat roll cannot exploit a foe's fumble. Existing D-CE1 is misidentified as Core RAW and needs an explicit correction. |
| RC-09 | A defender may parry or evade an attack that **missed**, only to try for defensive Special Effects. | `react` | pp.94–95 | OK (missed-attack parry is explicit on p.94; Evade uses differential-roll/Special Effect rules on p.103). |
| RC-10 | Parry: a successful parry with a weapon or shield of equal or larger Size blocks all damage; one Size smaller blocks half (the blocked half rounds **up**, owner PIT-P01); two or more smaller blocks nothing. A failed parry blocks nothing. | `parryAbsorption` | pp.94–95 | OK (the odd-number half-parry rounding is owner convention PIT-P01, not specified by Core). |
| **RC-11** | **Evade: a successful Evade avoids the whole blow. After any Evade roll, success or failure, the defender is left prone** (line 3247: `if(action==='evade'&&dr){d.prone=true;...}`). Prone costs a turn and 1 AP to stand (opposed Brawn or Athletics while engaged). **Claude's main suspect:** it makes Evade nearly useless and fighters spend much of a bout on the ground. Is a fighter prone after every evade against a melee attack, only after some (e.g. a failed one, or only when diving against ranged), or never? | `react` line 3247 | not cited in the code | OK (for ordinary humanoids: Core pp.92, 103 expressly leave the evader prone even when the Evade succeeds. On p.103, nonhumanoid quadrupeds/serpents usually become prone only on a failed Evade skill roll). |
| RC-12 | Prone: own attacks, parries and evades are Formidable (half). (No bonus found in the code for attacking a prone fighter.) | `combatTarget`, `evadeTarget` | p.101 | WRONG in combined cases: given a prone fighter with a still-functional Serious-wounded weapon arm, `combatTarget` applies Formidable then an additional Hard reduction → Core pp.38, 101 says use the *most severe* applicable difficulty grade, not multiply situational grades. Prone by itself is correctly Formidable. |
| RC-13 | A successful parry or evade against a successful attack: no damage, but the attacker can still win Special Effects if their grade was better (e.g. critical against success). | `react`, `resolveHit` | pp.94–95 | OK |

## D. Damage and wounds

| ID | What the Pits does | Where | Page it claims | Core says |
|---|---|---|---|---|
| RC-14 | Hit location d20: 1–3 right leg, 4–6 left leg, 7–9 abdomen, 10–12 chest, 13–15 right arm, 16–18 left arm, 19–20 head. | `HUMAN_HIT_LOCATIONS` | p.104 | OK (the humanoid d20 table is printed on Core p.109; the claimed p.104 is the wrong page). |
| RC-15 | Damage = weapon dice + Damage Modifier (never below 0), then minus the parry's share, then minus the location's armour. | `resolveHit` | pp.9, 103 | OK |
| RC-16 | Wound level by location HP: below starting HP and above 0 = Minor; 0 or below and above minus starting HP = Serious; minus starting HP or below = Major. | `woundLevel` | pp.109–110 | OK |
| RC-17 | Serious or Major wound: Endurance opposed against the **original attack roll**. Serious failed: limb useless (arm drops what it holds; leg: prone); head, chest, abdomen: unconscious. Major: limb incapacitated and prone; head, chest, abdomen: resisted means unconscious and dying, failed means dead. The fight ends on unconsciousness or death. | `woundOutcome`, `woundEndurance` | pp.109–110 | OK (Core p.110; `woundOutcome` correctly ends the fight on a Major limb wound even after a passed Endurance roll). |
| RC-18 | Every Serious wound, before its Endurance roll: the fighter cannot attack for 1d3 turns (parry, evade and other actions still allowed). | `resolveWound` ~3776 | p.110 | OK |

## E. Special Effects that come up most

| ID | What the Pits does | Where | Page it claims | Core says |
|---|---|---|---|---|
| RC-19 | Which effects are offered: by role (attacker or defender), weapon trait and grade, per the summary table. | `meleeEffectOptions` | pp.95–101 | OK (summary-table eligibility, Core p.100). |
| RC-20 | Trip Opponent: the target resists with the best (computer) or chosen (player) of Brawn, Evade or Acrobatics, **opposed against the roll that won the effect**. Fails: prone. | `applyEffect` trip | pp.100–101 | OK (Core p.101; quadrupeds also have an Athletics alternative, irrelevant to ordinary humanoid bouts). |
| RC-21 | Disarm Opponent: only against a foe with STR up to twice the disarmer's. Target resists with Combat Style opposed against the winning roll, adjusted by the Size difference: ×1/10, ×1/2, ×2/3 when the disarmer's weapon is 3, 2, 1 Size larger; ×1.5, ×2 when 1, 2+ smaller. **Rounded to nearest, not up** (different from RC-07: Claude's question). A lost weapon is thrown the disarmer's positive Damage Modifier in metres. | `canDisarm`, `disarmResistSkill` | p.97 | WRONG (app policy and high-skill edge case): given Combat Style 65 and disarmer's weapon one Size larger, `disarmResistSkill` uses `Math.round(65×2/3)=43` → Core pp.38, 97 prescribe Hard (two-thirds) but **do not specify rounding**; project D-CE2 requires ceiling, i.e. 44. Separately, the code's 200% cap violates Core p.37's no-upper-limit rule: a 120% skill made Very Easy by a two-Size-smaller disarmer should become 240%, not 200%. |
| RC-22 | Bleed (cutting weapon) and Stun Location (bludgeoning): only if the blow wounds; the target's Endurance is opposed against the **attack** roll. Bleed: one Fatigue level each new round. Stun: the location is useless for as many turns as the damage. | `resolveHit` | pp.96, 100 | OK (Core pp.96, 99; a Stun Location to the torso permits only defence, and one to the head causes insensibility, which the engine separately handles). |
| RC-23 | Choose Location: the attacker picks any location in reach instead of rolling. | `applyEffect` choose | p.96 | OK |
| RC-24 | Press Advantage and Overextend: the target cannot attack on their next turn. | `restrictNextAttack` | pp.98–99 | OK |
| RC-25 | Impale: damage rolled twice, the attacker picks; the weapon may lodge (victim's skills harder by SIZ and weapon Size, Impale table). | `applyEffect` impale, `impaleGrades` | p.97 | WRONG in Impale-table incapacitation cases: given a SIZ 11–20 victim with a Huge impaling weapon lodged → Core p.98's *Impale Effects Table* says **Incapacitated**; `impaleGrades` translates this into difficulty step 4 (Hopeless) instead of physical incapacitation, and the fighter can still attempt actions. The twice-rolled damage/choice and ordinary size penalties are otherwise correct. |

## F. Other

| ID | What the Pits does | Where | Page it claims | Core says |
|---|---|---|---|---|
| RC-26 | Optional Reach rules (Closing and Opening Range) are always on. | `engagementInfo` | pp.106–107 | OK (Core p.106 explicitly makes this optional; enabling it for the Pits is a selected rules option). |
| RC-27 | Combat exertion: an Endurance test every CON seconds of fighting (rounded up to rounds); failing adds Fatigue. | line ~747 | pp.78–79 | OK |

**Reply format:** a docs-only PR adding a column "Core says" to this file (OK or the case), or a short chat answer the
owner pastes to Claude. Claude then fixes every WRONG row with a test, and lists anything not changed under Known limits.

## Fixes (Claude, 2026-11-14)

| ID | Change | Test |
|---|---|---|
| RC-07 | `CombatRules.gradeAttempt`: a target of 0 (Hopeless) is a plain Failure, never the 01–05 automatic success or a fumble. The Pits' `rollSkill` uses it (result carries `hopeless:true`). Play Mode already skipped Hopeless rolls. | `combat-rules.cjs`, `practice-procedure.cjs` RC-07 |
| RC-08 | `CombatRules.effectsWon`: Failure against Fumble wins 0 (both directions), in Play Mode and the Pits. D-CE1 corrected in `docs/decisions.md`. | `combat-rules.cjs`, `combat-cases.cjs`, `practice-procedure.cjs` RC-08 |
| RC-12 | `combatTarget` and `evadeTarget` take the most severe of prone (Formidable), a Serious weapon arm or leg (Hard per leg, as before), and blinded (Herculean) via `CombatRules.mostSevereGrade`, instead of multiplying them. Prone with a Serious arm, Combat Style 70: 35%, was 24%. | `combat-rules.cjs`, `practice-procedure.cjs` RC-12, `practice-combat-ux.cjs` |
| RC-21 | `disarmResistSkill` rounds up (D-CE2) and has no 200% cap (Core p.37): 65 at Hard is 44 (was 43); 120 at Very Easy is 240 (was 200). | `combat-rules.cjs` |
| RC-25 | `CombatRules.impaleIncapacitates`: an Impale Effects cell reading Incapacitated (value 4) incapacitates the victim; the fight ends once that hit's wound is resolved. It no longer counts as a Hopeless grade in `impaleGrade`. | `combat-rules.cjs`, `practice-procedure.cjs` RC-25 |

Golden bouts (`tests/fixtures/pits-golden.json`) regenerated: only bout 1 changed, because of RC-08 (a Failure parry against a fumbled attack no longer wins Disarm). Its seed moved 246 → 250 so it still shows a half-blocked parry.

**Known limits (question for ChatGPT (Chat), Severity 3):**

- **Condition grades still stack with situational ones.** `effectiveSkill` adds Fatigue, a lodged weapon and an entangled torso as steps (Wearied plus a Formidable impale = Hopeless), and applies them on top of `combatTarget`/`evadeTarget` (prone and Wearied = Formidable then Formidable). RC-12 ruled only on prone with a Serious arm. Does "most severe grade" (Core pp.38, 101) cover Fatigue, Impale and Entangle too? Play Mode already treats Fatigue as a floor (the harsher of it and Encumbrance). If yes, Claude makes the Pits take the most severe of all of them.
- **Two Serious legs** count as two grades (Formidable) for Evade, read as Core p.110 "each" leg imposing a grade. Before this fix they multiplied (Hard of Hard, about 4/9). Confirm two legs is Formidable, or one grade only.
- **Hopeless actions are still offered.** A fighter at 0% can press Parry or Evade (spending 1 AP) and always fails; Core p.38 says no attempt can be made. Hiding those buttons is a UI change for a later batch.
