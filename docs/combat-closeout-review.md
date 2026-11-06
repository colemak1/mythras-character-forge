# Subsystem 5 — Core Combat chapter closeout review

**Review date:** 2026-11-06. **Source of truth:** the user-supplied Mythras 2e Core PDF, printed **pp.86–111**, with weapon references pp.61–65 only where helpful. Parsed source text was checked first and visually verified around ambiguous original-page sections and tables. No rulebook PDF, screenshot of the book, or extensive copyrighted text belongs in this public repository.

**Baseline:** `docs/combat-cases-batch-1.md` held **368 cases** (Batches 1–3). PR #144 implemented Batch 2 and PR #145 live-accepted it; PRs #148 and #150 implemented Batch 3 and PRs #149 and #151 live-accepted it. PR #146 fixed the ranged-weapon-in-Reach-summary observation. **Knockback:** no additional first metre beyond 1m for each five points (or fraction) *over SIZ*, Core p.104. This closeout adds 12 small uncovered child cases `C5-CL01`–`C5-CL12` in that ledger, bringing its total to **380 unique cases**; these rows are source/code findings, not a claim of CI or live acceptance.

## 1. Exhaustive Combat chapter section-to-case map

Every named section/subsection in Core Combat pp.86–111 is mapped below; individual named Special Effects are mapped one by one in the following table. Narrated examples and conceptual sidebars do not require independent executable cases. Some headings span two columns or pages; the numbers are **printed pages**. `Covered` includes explicitly GM-assisted behaviours, not necessarily full automation.

| Core p. | Printed section / subsection | Cases in Combat ledger | Coverage / exception |
|---:|---|---|---|
| 86 | Combat overview / Components of Combat | C5-ST01, C5-R02, C5-A01–A23, C5-P15–P16, C5-E01–E08 | Covered; descriptive overview |
| 86 | Combat Styles | C5-ST01–ST02 | Covered |
| 86 | Combat Rounds | C5-R02, C5-R07–R13 | Covered |
| 86 | Combat Actions | C5-A01–A23 | Covered |
| 86 | Weapon Size and Reach | C5-P12–P16 | Covered |
| 86 | Engagement | C5-M04, C5-M17, C5-M27–M32 | Covered; GM positioning |
| 86 | Special Effects concept | C5-E01–E08 | Covered |
| 87 | Sample Combat Styles / style-composition discussion | C5-ST01–ST02, C5-CL04 | Examples are illustrative, not required fixed presets |
| 88 | Weapon Choices | C5-ST01–ST02, C5-ST09, C5-CL04 | Covered; GM chooses style composition |
| 88 | Use of Weapons Not Covered by a Combat Style | C5-ST03–ST08 | Covered; familiarity tools tested in prior batches |
| 88 | Combat Style Benefits | C5-ST02, C5-ST11–ST12, C5-B2-T01–T26, C5-CL03 | New conditional scope child CL03 |
| 88 | Combat Rounds (continuation) | C5-R01–R16 | Covered |
| 89 | Combat Style Traits (all 26 Core entries) | C5-B2-T01–T26 | Covered; #144/#145 implementation and live evidence |
| 90 | Initiative / Calculating Initiative | C5-R03–R04, C5-R05–R07 | Covered |
| 90 | Initiative Penalty (armour) | C5-R05–R06 | Covered; full worn ENC / 5 |
| 90 | Cycles and Turns | C5-R08–R14 | Covered; GM sequences actors |
| 91 | Combat Actions / Proactive Actions | C5-A01–A16, C5-R08–R13 | Covered |
| 91 | Attack / Brace / Cast Magic | C5-A01–A03, C5-R15 | Covered; magic details elsewhere |
| 91 | Change Range / Delay / Dither / Hold Magic | C5-A04–A08, C5-B2-X12–X13 | Covered |
| 91 | Mount / Move / Keeping Track of Action Points | C5-A09–A11, C5-R01, C5-R13 | Covered |
| 92 | Outmanoeuvre / Ready Weapon / Regain Footing / Struggle | C5-A12–A16, C5-B3-TA04–TA06, C5-CL08 | Struggle opposed-skills child CL08 |
| 92 | Reactive Actions | C5-A17–A20 | Covered |
| 92 | Counter Spell / Evade / Interrupt / Parry | C5-A17–A20, C5-M12 | Covered |
| 92 | Free Actions / Delay and Interrupt | C5-A05–A06, C5-A21–A23, C5-R16 | Covered |
| 93 | Assess Situation / Drop Weapon / Signal / Speak | C5-A21–A22 | Covered |
| 93 | Use Luck Point / Ward Location | C5-A22–A23, C5-M19–M20 | Covered |
| 93 | Weapon Size and Reach (intro) | C5-P12–P16 | Covered |
| 94 | How Combat Works / Attacks and Parries | C5-P01–P10, C5-E01–E08 | Covered; player rolls and records rival tier |
| 94 | Damage Reduction | C5-P12–P14, C5-W01–W02 | Covered; parry Size calculator |
| 94 | Parrying a Missed Attack | C5-P08, C5-E08 | Covered |
| 94 | Weapon Size Categories / Weapon Reach Categories | C5-P15–P16, C5-B2-X12 | Covered |
| 94 | Keeping Track of Attack Rolls | C5-W07, C5-P20 | Covered; original d100 preserved in exchange |
| 95 | Unable or Unwilling to Parry | C5-P09 | Covered |
| 95 | Failed Rolls and Fumbles | C5-P05–P10, C5-E01–E02 | Covered |
| 95 | Special Effects procedure / Damage Reduction Table | C5-E01–E08, C5-P12–P14 | Covered |
| 95 | Retroactive Parrying with Skill over 100% | C5-P11, C5-W20 | Covered; GM declares before attack |
| 96 | Special Effect Descriptions (start) | C5-SE01–SE08 | Covered; individual list below |
| 97 | Special Effect Descriptions (continued) | C5-SE09–SE21 | Covered; individual list below |
| 98 | Special Effect Descriptions / Impale Effects Table | C5-SE22–SE31, C5-B3-SE01–SE08 | Covered; #148/#149 verified impale matrix |
| 99 | Special Effect Descriptions (continued) | C5-SE32–SE39 | Covered; individual list below |
| 100 | Special Effects Summary (all 43 names / prerequisites) | C5-SE01–SE43, C5-E05–E08 | Covered; #144/#148 filters tested |
| 101 | Final Special Effect descriptions | C5-SE40–SE43 | Covered; individual list below |
| 101 | Close Combat / Situational Modifiers | C5-M01–M03, C5-B2-C01–C12 | Covered; grades GM-selected |
| 101 | Engagement | C5-M04, C5-M17, C5-M27–M32 | Covered; GM positioning |
| 102 | Close Combat Mechanics / Charging | C5-M05–M09, C5-B2-X01–X05 | Covered |
| 102 | Charging into Contact / Charging through Contact | C5-B2-X03–X05, C5-B3-TA20 | Covered |
| 102 | Cover | C5-M10–M11, C5-B2-X06–X08 | Covered |
| 103 | Evading / Evading Creatures | C5-M12–M13, C5-B2-X09 | Covered; animal anatomy handled in Subsystem 7 |
| 103 | Flying Combat / Attacking Ground-Based Targets | C5-B3-TA12–TA14 | Covered; GM manoeuvres |
| 103 | Aerial Combat Aloft / Aerial Tactics | C5-B3-TA12–TA14 | Covered; GM manoeuvres |
| 104 | Knockback / Leaping Attacks | C5-B3-TA21–TA23, C5-M14 | Covered. **No extra starting metre**: +1m per 5 excess damage or part (p.104). |
| 104 | Multiple Opponents / Outmanoeuvring | C5-M17–M18, C5-B3-TA01–TA06 | Covered; GM adjudicates participants |
| 104 | Mounted Combat | C5-M15–M16, C5-B3-TA15–TA20 | Covered; GM adjudicates mount |
| 105 | Passive Blocking | C5-M19–M20, C5-B2-X10, C5-B3-WT08–WT17, C5-CL10 | New Choose Location constraint CL10 |
| 105 | Pulled Blows | C5-M21, C5-B3-TA24 | Covered |
| 105 | Surprise | C5-M22, C5-CL01–CL02, C5-CL12 | Bonus SE implemented (CL01); detection CL02 and timing CL12 GM-assisted |
| 105 | Sweep Attacks | C5-B3-TA07 | Covered; unusual size qualifier accepted live #151 |
| 105 | Unarmed Combat | C5-M23–M24, C5-SE18, C5-SE20, C5-SE40 | Covered; further grapple children CL05–CL09 |
| 105 | Parrying Weapons Whilst Unarmed | C5-ST10, C5-M23, C5-CL09 | New explicit within-Touch / size child CL09 |
| 106 | Striking (unarmed) | C5-M23, C5-SE18, C5-SE20, C5-SE40 | Covered |
| 106 | Grappling | C5-M24, C5-A16, C5-CL05–CL09 | **Gap:** location effect / follow-up damage / Struggle procedure only generic in Play Mode |
| 106 | Unusual Combat Conditions / Climbing / Swimming | C5-B3-TA25–TA26, C5-B2-T26 | Covered; lean guidance live implementation #148 |
| 106 | Weapon Reach — Closing and Opening Range | C5-M27–M32, C5-B2-X12–X13 | Covered; enabled optional rule |
| 106 | Fighting at the Longer Reach / Fighting at the Shorter Reach | C5-M28–M29, C5-B2-X12 | Covered; Reach summary corrected #146 |
| 107 | Closing Range / Opening Range / Withdrawing | C5-M30–M32, C5-B2-X13, C5-SE25, C5-SE43 | Covered |
| 107 | Ranged Combat / Force | C5-G01–G02, C5-B3-RG03–RG04 | Covered; shield parry and projectile Force |
| 107 | Damage Modifier / Range | C5-G03–G04, C5-B3-RG01–RG06 | Covered |
| 107 | Reload | C5-G14–G15, C5-B3-RG17–RG19 | Covered except prepared offhand throw CL11 on p.109 |
| 107 | Situational Modifiers / Ranged Combat Considerations | C5-G06–G07, C5-B2-G17–G29 | Covered |
| 107 | Aiming | C5-G05, C5-B3-RG21 | Covered; #148 help |
| 108 | Distance Penalties / Ranged Combat Situational Modifiers | C5-B2-G17–G36, C5-G08–G10 | Covered; Distance helper live #145 |
| 108 | Firing into a Crowd | C5-G11–G12, C5-B2-G39–G41 | Covered; GM selects bystander |
| 108 | Firing on the Move | C5-G13, C5-B2-G42, C5-B2-T21 | Covered; Skirmishing exception |
| 108 | Impaling Ranged Attacks | C5-G16, C5-B3-RG04 | Covered; Force vs projectile Impale Size |
| 109 | Loading Ranged Weapons | C5-G14–G15, C5-B3-RG10–RG20, C5-CL11 | Offhand already-held throw Free Action child CL11 |
| 109 | Realistic Range Penalties (narrative sidebar) | C5-G06–G10, C5-B2-G29–G36 | Non-mechanical context, no required extra implementation |
| 109 | Hit Locations / Humanoid Hit Locations | C5-P17–P19, C5-W03 | Covered. Non-humanoid locations reserved for S7 |
| 109 | Damage and Wound Levels | C5-W01–W08, C5-B3-WN01–WN02 | Covered |
| 110 | Minor Wound / Serious Wound / Major Wound | C5-W04–W17, C5-B3-WN03–WN10 | Covered; #148 critical wording changes live #149 |
| 110 | Heroic Last Actions / Endurance over 100% | C5-W18, C5-W20, C5-B3-WN11 | Covered; Luck consent GM-assisted |
| 111 | Optional Rules: Rabble & Underlings | C5-W21 | S7 creatures/GM optional NPC simplification; excluded from S5 closeout |

### All 43 individual Special Effects (Core pp.96–101; summary p.100)

| No. | Core Special Effect and first description page | Existing case |
|---:|---|---|
| 1 | Accidental Injury (p.96) | `C5-SE01` |
| 2 | Arise (p.96) | `C5-SE02` |
| 3 | Bash (p.96) | `C5-SE03` |
| 4 | Bleed (p.96) | `C5-SE04` |
| 5 | Blind Opponent (p.96) | `C5-SE05` |
| 6 | Bypass Armour (p.96) | `C5-SE06` |
| 7 | Choose Location (p.96) | `C5-SE07` |
| 8 | Circumvent Cover (p.96) | `C5-SE08` |
| 9 | Circumvent Parry (p.97) | `C5-SE09` |
| 10 | Close Range (p.97) | `C5-SE10` |
| 11 | Compel Surrender (p.97) | `C5-SE11` |
| 12 | Damage Weapon (p.97) | `C5-SE12` |
| 13 | Disarm Opponent (p.97) | `C5-SE13` |
| 14 | Drop Foe (p.97) | `C5-SE14` |
| 15 | Duck Back (p.97) | `C5-SE15` |
| 16 | Enhance Parry (p.97) | `C5-SE16` |
| 17 | Entangle (p.97) | `C5-SE17` |
| 18 | Flurry (p.97) | `C5-SE18` |
| 19 | Force Failure (p.97) | `C5-SE19` |
| 20 | Grip (p.97) | `C5-SE20` |
| 21 | Impale (p.97) | `C5-SE21` |
| 22 | Kill Silently (p.98) | `C5-SE22` |
| 23 | Marksman (p.98) | `C5-SE23` |
| 24 | Maximise Damage (p.98) | `C5-SE24` |
| 25 | Open Range (p.98) | `C5-SE25` |
| 26 | Overextend Opponent (p.98) | `C5-SE26` |
| 27 | Overpenetration (p.98) | `C5-SE27` |
| 28 | Pin Down (p.98) | `C5-SE28` |
| 29 | Pin Weapon (p.98) | `C5-SE29` |
| 30 | Prepare Counter (p.98) | `C5-SE30` |
| 31 | Press Advantage (p.98) | `C5-SE31` |
| 32 | Rapid Reload (p.99) | `C5-SE32` |
| 33 | Remise (p.99) | `C5-SE33` |
| 34 | Scar Foe (p.99) | `C5-SE34` |
| 35 | Select Target (p.99) | `C5-SE35` |
| 36 | Slip Free (p.99) | `C5-SE36` |
| 37 | Stand Fast (p.99) | `C5-SE37` |
| 38 | Stun Location (p.99) | `C5-SE38` |
| 39 | Sunder (p.99) | `C5-SE39` |
| 40 | Take Weapon (p.101) | `C5-SE40` |
| 41 | Trip Opponent (p.101) | `C5-SE41` |
| 42 | Weapon Malfunction (p.101) | `C5-SE42` |
| 43 | Withdraw (p.101) | `C5-SE43` |

### Explicit coverage findings

- **No unexplored mandatory top-level Combat chapter heading remains.** The existing ledger covers action timing, attack/parry/differential mechanics, all 43 Special Effects, Close and Ranged situational modifiers, all Core Combat Style traits, weapon Size/Reach, the weapon/Impalement tables, movement and injury. Its implementation status still needs focused checks on the new cases.
- **Uncovered granular rules added as new cases:** first successful hit against Surprised target earns one additional SE (`CL01`, code); surprise detection (`CL02`, GM); style-scoped benefit/overlap (`CL03–04`, GM); grappling entry, location, continuing damage and escape (`CL05–08`, some code guidance); unarmed Parry qualification (`CL09`, existing controls); passive block versus Choose Location (`CL10`, guidance); prepared off-hand thrown swap (`CL11`, guidance); surprise timing (`CL12`, existing controls).
- **Not separate missing rule cases:** the p.87 sample styles and p.109 Realistic Range Penalties sidebar are illustrative rather than mandated extra mechanical procedures. The p.111 Rabble & Underlings rules are optional NPC simplification and are explicitly assigned to **Subsystem 7**.
- **Open scope boundaries rather than missing Combat cases:** creature-specific hit locations, natural attacks/sizes, flight anatomy, creature abilities, and Rabble/Underlings belong to **Subsystem 7**. GM campaign state, permissions, multi-user Party Board combat, account switching and cross-device or cross-account character changes belong to **Subsystem 8**. The player-owned character’s own reload and wound persistence are included in Combat acceptance.
- **Source interpretations:** No extra Knockback initial metre, consistent with printed p.104 and owner’s resolved ruling. Keep Critical/weapon restrictions from Batches 2–3 as already implemented and live accepted; do not reopen them from speculative source differences.

## 2. Implementation triage and closeout gate

Initial status on the 12 new rows: **6 NEEDS CODE** (`CL01`, `CL06–CL08`, `CL10–CL11`) and **6 HANDLED** (`CL02–CL05`, `CL09`, `CL12`). The ledger is authoritative; these labels are initial source/code assessments, not live test passes.

**P0 source-to-app correctness:** `CL01` must permit the first *successful* attack on a Surprised target to earn +1 Special Effect beyond the differential result; no extra award for a failed hit or subsequent attack. This is an actual numerical case, not merely a tip. Use a small per-exchange flag, not opponent combat AI.

**P1 lean reference changes:** `CL06–08` explain grapple location, damage and opposed Struggle; `CL10` explains passive-block protection against Choose Location; `CL11` explains an already-held off-hand thrown weapon as a Free Action. Preserve GM control over position/hand occupancy and physical wound consequences. If a narrower implementation already covers a row, Claude should reclassify it as HANDLED with test/code evidence rather than build duplicate UI.

**Test barrier:** add deterministic tests for the surprise +1 SE eligibility and persistence and for any new visible rules text; run the full required tests and deployment CI. Existing coverage from #145/#149/#151 stands; it does not independently certify the newly listed branches.

## Implementation status (Claude, 2026-11-06)

Claude corrected the section map's case numbers to match the ledger: Struggle is CL08, unarmed parry CL09 and the off-hand throw CL11.

All six NEEDS CODE rows are implemented, with regression tests in `tests/combat-closeout.cjs`:

- **CL01 surprise bonus:**
  - On a successful attack, the combat card offers "Target was Surprised, and this is the first successful attack on them".
  - When ticked, the attacker earns +1 Special Effect on top of the differential. Core p.105's example, a Success against an automatic Failure, gives 2.
  - It never applies to a failed attack or a defence, and it is separate from your own Surprised flag. It survives reload, and changing it clears the chosen effects.
  - The bonus applies only when the differential is not negative. Whether this really is the first attack stays the GM's call.
- **CL06–CL08 grappling:** a new section in the "Combat situations" panel covers declaring a grapple, the arm or leg vs head or torso effects, follow-up damage equal to the Damage Modifier, and Struggle's opposed Brawn or Unarmed. The Struggle action text also gives the opposed skills.
- **CL10 passive blocking:** the Choose Location description and shield notes say it can't target a passively blocked location (p.105).
- **CL11 off-hand throw:** the Ready Weapon action, Thrown weapons and the Javelin note all describe the off-hand Free Action (p.109).

## 3. ONE final owner-only Work scenario — complete player-sheet fight

**Purpose:** one contiguous live acceptance script on the **deployed revision after Claude’s closeout corrections**, signed in only as the owner, using one temporary character and an imagined GM-controlled opponent. No guest/player/GM second account is necessary. Use real player UI and natural rolls; do **not** mock die results or edit database rows directly.

1. **Safe fixture.** Confirm owner identity. Create a disposable human with a legal Quick allocation, one Combat Style covering a melee weapon (e.g. Broadsword), a shield (e.g. Buckler) and Short bow; carry those weapons and add **2 AP chest armour** if available. Save to the account. Record initial Chest HP, Healing Rate, armour, Action Points, initiative bonus and MP. Never edit a real campaign character.
2. **Initiative / round.** In Play Mode → Combat, roll initiative with a natural d10 and confirm total = die + current initiative bonus (including worn-armour penalty). Declare a combat action and verify 1 AP spent. Use New Round when AP runs out; it restores AP but retains the initiative result until End fight.
3. **Attack and Special Effect.** Roll an actual melee Attack; if it fails, continue normal turns until a successful result rather than forcing a die. Record the opponent as **No defence** (Failure) for that exchange and verify earned Special Effects against the differential result. Select one legal effect (e.g. Press Advantage or Choose Location), verify it appears on the compact resolved card and in the roll log. If the surprise-closeout change is present, use the **target Surprised / first successful attack** case on a valid success: exactly one additional SE should be available, and not on an unrelated later hit. This must not silently modify the player’s own Surprised flag.
4. **Incoming attack / Parry.** With a readied Buckler and AP, make one actual Parry using the shield. Record a plausible incoming opponent roll tier; compare the differential and the parry Size calculator for a fixed, nonzero before-armour damage. Check the AP cost and that a failed/equal roll cannot produce extra effects. The abstract opponent uses entered result tiers, not a second real character account.
5. **Injury / armour / wound log.** On the **disposable character only**, select Chest and manually apply **5 points of damage after parry/other reductions, before armour** with chest AP 2. Verify 3 HP is deducted, the correct Minor/Serious tier is shown from that location’s original maximum, and the resulting wound is logged. Do not treat a player’s outgoing Attack as automatically damaging their own character.
6. **Advance time and reload.** Click **Advance time → Rest one day**. For a Minor Wound, verify Chest recovers `min(maxChestHP, woundedChestHP + Healing Rate)` and already-full locations stay full; MP does not recover automatically. Reload immediately, follow an offered same-owner recovery draft if appropriate, and confirm HP/armour/roll log persist and no old draft replaces newer confirmed data.
7. **Ranged attack / Distance helper.** Use Short bow’s **Distance helper** for **30m versus target SIZ 15**: Core p.108 band 21–40m/SIZ 11–20 gives **one grade harder** from distance/size, separately from situational modifiers. Roll a natural ranged Attack, confirm bow has **Attack, no Parry**, and that two AP are listed for reloading Short bow (Core pp.65,109). Do not claim that merely viewing the helper automatically changed the next rolled grade unless that is how the UI is designed; compare the displayed/helper guidance and selected grade.
8. **End fight and cleanup.** End fight; check AP restored, initiative cleared, Surprised reset. Reopen the disposable character and confirm previously recorded data. Delete **only** that fixture, reload My Characters and confirm it is absent. Preserve screenshots/observations (including script revision/asset stamps), record exact natural dice and any limitations, and report PASS/FAIL by step. No unrelated characters, campaigns, other accounts or live GM data touched.

## 4. Can Subsystem 5 close?

**Conditional yes, but not from the final scenario alone.** The owner-only live scenario is a sufficient **final integrated acceptance scenario** *provided* Claude has first reviewed and addressed every `NEEDS CODE` row, including the surprise SE bonus, covered new guidance with regression tests, and documented the `HANDLED` GM adjudications. The existing #145/#149/#151 focused live passes and automated checks may be retained rather than repeated. After the scenario passes on the deployed revision and evidence is linked in the ledger, the repo may mark Subsystem 5 **CLOSED**, advancing **3/8 → 4/8**; until then progress remains **3/8**.

No separate multi-account security check (Subsystem 8) and no creature-specific hit-location/abilities review (Subsystem 7) should block closure of the **PC-focused** Combat scope. The prototype Practice Combat gauntlet is a later feature, not a prerequisite. Any newly identified *core player-facing* violation in this map is a blocker until fixed or explicitly GM-assigned with accurate guidance. No broad combat automation is demanded.

## 5. Next handoff

**Claude:** review these source/case statuses against current code, implement and test narrowly, then request one batched owner-only Work scenario using the script above. **ChatGPT Work:** provide the resulting deployment-evidenced pass/fail report. **ChatGPT Chat:** continue Subsystem 4 reconciliation in `docs/advancement-reconciliation.md`.

## Final Work scenario result — 2026-11-06

The single scripted fight ran on deployed #154: [exact dice, stamps, screenshots and step results](combat-final-fight-20261106.md). **Steps 1–7 PASS; step 8 FAIL** on top-bar End fight (initiative cleared, AP/Surprised not reset); Advance time's End the fight resets correctly. The new target-surprise box passes exactly +1 SE and does not alter own Surprised or carry into the later hit. Disposable character deleted and absence confirmed after reload. All 29 local scripts pass. MP was full, so no deficit-regeneration claim is made. Keep Subsystem 5 OPEN, overall 3/8, pending the narrow step-8 follow-up; do not repeat the entire fight without a new reason.


## PR #156 focused final-step resolution — 2026-11-06

[Focused live re-check](combat-pr156-step8-recheck-20261106.md): **4/4 requested steps PASS**. Both initiative End fight and Advance time → End the fight restore full AP, clear own Surprised and rolled initiative, and persist after reopening. Natural d10s **7** and **5**; play/app stamps **3657984677 / 6b5bde95b8**. One disposable fixture deleted and absence confirmed after reload; all **29** scripts pass. The final fight's earlier step-8 failure is resolved; retain prior steps 1–7 and their MP-at-full limit. Recommend Claude's final closeout review under the documented gate; progress **3/8 pending that decision**. No code changed, no new full fight performed.

## Closeout decision (Claude, 2026-11-06)

**Subsystem 5 is CLOSED. Progress goes from 3/8 to 4/8.** The §4 gate is met:

- All six Batch 4 NEEDS CODE rows are implemented with tests (#154).
- The final integrated fight passed steps 1–7 (#155).
- The one failed step, the End fight reset, was fixed (#156) and passed a focused live re-check (#157).
- All earlier batches were already implemented and live-accepted.

Out-of-scope items go to Subsystem 7 (creatures) and Subsystem 8 (multi-account). Any new player-facing Combat defect reopens it as a normal bug, not a reopened audit.

