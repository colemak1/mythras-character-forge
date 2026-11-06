# Subsystem 4 — Advancement, hazards and recovery: Core case inventory (Batch 1)

**Source:** User-supplied *Mythras 2e Core Rulebook*, printed Game System pp.68–85 (with specific supporting rules on pp.9, 34, 41, 46–47, and 110). Page references refer to printed pages, not PDF viewer indices. Parsed PDF text was checked against page renders, particularly the **Age Bands/Ageing Effects (p.71), Training Improvement (p.73), Disease/Poison Conditions (p.75), Falling (p.78), Fatigue/Physical Effort/Fire (p.79), Permanent Injury (p.80), and trap/weather tables (pp.83–85)**.

**Status:** Source-verified *expected cases*, not an assertion that current app code, tests, or deployed workflows pass. Claude owns implementation, deterministic regression tests, and status mapping; ChatGPT owns Core source checks and independent signed-in acceptance checks. **Subsystem 4 stays OPEN; 3/8 prior subsystems closed for their stated scope.** Keep the owner-approved lean, player-facing sheet: where the book calls for GM rulings, correct reference text + manual recording is sufficient unless the owner specifically approves more automation. Do not build an environmental simulator by implication. Companion options are not Core defaults; paused Magic stays paused.

**App-status workflow for Claude:** For each ID, assign `Pass (tested)`, `Guidance`, `GM-assisted`, `Not implemented`, or `Decision`; cite the test/commit or show the missing behavior. Rows can legitimately be GM-assisted, but no row is a pass merely because the Core text appears here. Use fixed dice results in deterministic tests while **prompting players to roll** in the actual product. Avoid reimplementing character-creation, skill, or combat subsystems if an existing tested helper already handles it.

## A. Experience Rolls, skill and Passion improvement (Core pp.9, 71–72, 82)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-X01 | The GM awards Experience Rolls at a story break. | p.71: Frequency is GM-controlled; a usual award is 2–4 rolls, but lower/higher awards are possible. | Permit GM-entered nonnegative awards without a mandatory 2–4 range, and record the transaction. |
| A4-X02 | Party members receive differing awards. | pp.71–72: Equal awards are recommended for fairness, **not required**. | Do not hard-reject uneven GM grants or enforce uniform distribution. |
| A4-X03 | A character with CHA 6 is awarded three Experience Rolls in the wilderness. | pp.9,72: CHA 6 or less has Experience Modifier -1, but the GM uses the modifier only when influence plausibly helps or harms; not every session. | Default to **3**, with explicit GM choice to apply the modifier (-1 yields 2), rather than automatically granting 2. |
| A4-X04 | A character with CHA 13, 12, or 6 receives a context-eligible XP award. | p.9 table: CHA 13–18 = +1, 7–12 = 0, 6 or less = -1; each further 6 CHA increases the bonus by 1. | Calculate the correct conditional Experience Modifier; require GM/user selection before applying it. |
| A4-X05 | A player banks three unspent Experience Rolls and closes the sheet. | p.72: Experience Rolls may be held for later, including characteristics and new Professional Skills. | Persist an integer bank across reload/import and do not automatically spend or expire it at session end. |
| A4-X06 | A character spends one Experience Roll on any already-known Standard or Professional Skill. | p.72: One Experience Roll buys **one** improvement attempt for either type. | Permit selection of a known skill, charge one roll once, and use its current percentage. |
| A4-X07 | A character has a skill of 55%, INT 14, and rolls 41 on the improvement d100. | p.72: Compare **d100 + INT** with the skill; equality succeeds. Here 41+14=55, so improvement is **1d4+1%**. | Display adjusted 55 versus 55, prompt 1d4, add its result +1, spend exactly one Experience Roll. |
| A4-X08 | A character has skill 55%, INT 14 and rolls 40. | p.72: 40+14=54 is **below** the skill, so improvement still grants **+1%**, not +0%. | Grant exactly +1% and spend the roll; do not call this a failed/no-gain advancement. |
| A4-X09 | A character has skill 55%, INT 14 and rolls 100. | p.72: The advancement rule is a d100+INT **comparison**, not the normal skill-check critical/fumble classification. | Apply the improvement comparison and 1d4+1 outcome; do not treat a 100 as an advancement fumble. |
| A4-X10 | A character improves the same skill twice with two banked Experience Rolls. | p.72: No once-per-award/once-per-skill restriction is imposed; each improvement uses the **updated** skill value. | Allow a second separate improvement and use its current percentage, subject to sufficient banked rolls. |
| A4-X11 | An improvement result would exceed 100%. | p.72: Improvement is not capped at 100%; higher skill values are supported elsewhere in Core. | Persist the actual skill percentage; do not impose an unauthorized 100% ceiling. |
| A4-X12 | A character fumbled the same skill three times since the last award. | p.72: A skill fumbled in preceding sessions gains **one free +1%** at improvement time; multiple fumbles **do not stack**. | Record eligibility once per skill per interval and grant one +1%, not +3%, without consuming an Experience Roll. |
| A4-X13 | A fumbled skill's free +1% has been claimed, then the next award interval begins. | p.72: Fumble benefit concerns the interval between successive Experience Roll awards. | Do not grant the same historical fumble again; track/reset its eligibility between awards. |
| A4-X14 | The GM chooses the faster 1d6+1 progression option. | p.72: 1d6+1 replaces default 1d4+1 only by **GM campaign choice**. | Default 1d4+1; support alternate progression only as a labelled optional setting or GM-provided roll, never silently switch. |
| A4-X15 | A player wants to improve a skill not plausibly practiced recently. | p.72 boxed guidance: Normally players freely choose skills, but GM may require relevant recent use/opportunity. | Present contextual GM guidance, not an unconditional restriction on the skill picker. |
| A4-X16 | A player spends an Experience Roll to increase an existing Passion. | pp.72,82: A Passion can improve using the same advancement process as a skill. | Permit Passion selection and advancement with the same d100+INT comparison and result. |
| A4-X17 | A Passion should decrease after adverse events or by spending Experience Rolls. | pp.72,82: GM may allow XP-funded reduction; play can also deepen/wane a Passion without XP. | Allow separately labelled GM/manual decreases or reversals; never force a positive XP increase. |
| A4-X18 | A major in-play event immediately creates a new Passion. | p.82: A fitting Passion can arise during play **at no Experience Roll cost**; using advancement to establish one costs an Experience Roll. | Keep free narrative acquisition and paid deliberate acquisition as distinct GM-approved paths. |
| A4-X19 | A GM rates a Passion shift as Weak, Moderate, or Strong. | p.82 table: Change is **1d10**, **1d10+5**, or **1d10+10**, respectively, up or down. | Display the exact appropriate roll and allow a GM-confirmed signed adjustment. |
| A4-X20 | A Passion turns from Trust (X) to Distrust (X). | p.82: GM may reverse the named Passion while retaining the percentage instead of simply reducing it. | Preserve the value and update the named Passion on GM confirmation, without fabricating an XP transaction. |

## B. Characteristic increases and new Professional Skills (Core pp.9, 72–74)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-C01 | A human trains STR 11 and allocates **one** ongoing Experience Roll sacrifice. | pp.72,74 worked example: Each reserved roll boosts a characteristic by 1/10 of species rolled maximum; for human STR maximum 18, **+2** per roll. | Present temporary trained STR **13**, distinguishing base 11 from +2 trained bonus and the ongoing cost. |
| A4-C02 | The same human devotes **three** ongoing rolls to STR 11. | p.74 Anathaym worked example: Three rolls grant **+6 STR**, reaching 17; the GM assigned six weeks of training. | Yield trained STR 17 without consuming the base STR, and do not treat the example's six weeks as a universal mandatory duration. |
| A4-C03 | A character trains a nonhuman characteristic with a different rolled species maximum. | p.72: One reserved roll raises the characteristic by one tenth of the **rolled species maximum**, e.g. a minotaur STR maximum 24 yields +3 per roll. | Use the species-specific maximum, not the human +2 constant; preserve GM rounding/exception when the book has no worked boundary. |
| A4-C04 | A player requests ongoing characteristic training without future XP awards. | p.72: Training is maintained by **reducing future Experience Roll allotments**, not a single upfront purchase. | Track a per-award ongoing sacrifice; do not mislabel this as the optional permanent one-time purchase. |
| A4-C05 | A trained characteristic crosses an attribute breakpoint. | p.72: Derived Standard/Professional skills and attributes change with the characteristic; STR/SIZ changes can alter Damage Modifier. | Recompute all relevant derived values and persist the trained/base separation. |
| A4-C06 | A trained increase would exceed a species maximum. | p.72: Characteristic training cannot take any characteristic above its **species rolled maximum**. | Cap or reject the excess without silently exceeding the species cap. |
| A4-C07 | A character wants to train SIZ by regular exercise. | p.72: **SIZ cannot be increased by mundane characteristic training**. | Reject/flag SIZ for this particular training method; do not ban unrelated GM/magical SIZ alterations. |
| A4-C08 | A character stops dedicating future Experience Rolls to characteristic training. | p.72: The bonus atrophies by **one trained improvement step on each subsequent award** until the natural value returns. | Step the trained bonus down on subsequent XP-award events, updating derivatives; do not instantly erase all steps. |
| A4-C09 | The GM adopts **optional permanent characteristic improvement**. | p.73 boxed rule: The permanent method is an **alternative**, not the default maintenance rule. | Expose a separate labelled campaign option/manual workflow; keep default characteristic training as ongoing. |
| A4-C10 | Under the optional rule, a human has DEX 12 and species minimum DEX 3. | p.73: One permanent +1 costs **1 + current score − species minimum** = **10 Experience Rolls** (the book's worked example). | Charge 10 awarded rolls, increase DEX to 13, and recalculate all dependent values. |
| A4-C11 | The same optional-method DEX advances again from 13 to 14. | p.73 formula: Cost recalculates from the **current** value, so 1+13−3 = **11 Experience Rolls**. | Require a fresh cost of 11, not a repeated fixed 10. |
| A4-C12 | A character lacks enough banked Experience Rolls for a permanent +1. | p.73: The whole computed cost is required. | Prevent partial application or double-spending, and show the shortfall. |
| A4-C13 | A player improves a characteristic while an age-related loss or trained boost is recorded. | pp.70–73: Ageing losses may be counteracted by improvement; trained and permanent values are conceptually different. | Preserve base, ageing adjustments and training/permanent changes in separate fields or auditable events; never double-apply after reopen/import. |
| A4-C14 | A character chooses a previously unlearned Professional Skill. | p.73: It requires **a source of knowledge**, **one month of study**, and **3 Experience Rolls**, plus any teacher/equipment costs. | Gate by GM-approved source/time and three rolls, then add the skill with its appropriate base. |
| A4-C15 | A player adds an unlearned Professional Skill through ordinary 1-roll skill advancement. | pp.72–73: A skill already on the sheet is different from learning an entirely new Professional Skill. | Do not permit the existing-skill 1-roll path to bypass the new-skill prerequisites. |
| A4-C16 | A character learns a new Professional Skill from a nonstandard source (scroll, bound spirit, mentor). | p.73: A knowledge source need not be a paid tutor; other in-game costs remain GM-determined. | Support GM-entered sources without requiring a specific shop/teacher database record. |

## C. Mentor training and teaching (Core pp.73–74)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-T01 | A character uses a trainer rather than an Experience Roll. | p.73: Training can increase a skill without spending XP, but requires **one full week**. | Offer a separate training event with duration and a recorded skill gain; do not debit an Experience Roll. |
| A4-T02 | A student's skill is 40% and a trainer's is 60%. | p.73: Trainer must be **at least 20 percentage points better**, but the improvement table **starts at 21–30%**. | Allow a GM decision at the exact 20-point boundary; do not invent a 1d2 improvement or silently refuse eligible training. |
| A4-T03 | A mentor exceeds a student by 21–30 percentage points. | p.73 Training Improvement table: The gain is **1d2%**. | Offer/record 1d2 for this interval. |
| A4-T04 | Difference is 31–40 points. | p.73 table: **1d3%**. | Apply 1d3. |
| A4-T05 | Difference is 41–50 points. | p.73 table: **1d4%**. | Apply 1d4. |
| A4-T06 | Difference is 51–60 points. | p.73 table: **1d6%**. | Apply 1d6. |
| A4-T07 | Difference is 61–70 points. | p.73 table: **1d6+1%**. | Apply 1d6+1. |
| A4-T08 | Difference is 71–80 points. | p.73 table: **1d6+2%**. | Apply 1d6+2. |
| A4-T09 | Difference is 81–90 points. | p.73 table: **1d6+3%**. | Apply 1d6+3. |
| A4-T10 | Difference is 91–100 points. | p.73 table: **1d6+4%**; each further 10 points adds +1. | Apply 1d6+4 at 100 difference and scale higher differences by the table's extension rule. |
| A4-T11 | A teacher critically succeeds at a Teach roll. | p.73: Improve training result **two table steps**. Worked example p.74: 48-point gap normally 1d4, critical raises to **1d6+1**. | Resolve the adjusted dice tier, not add a flat +2% to 1d4. |
| A4-T12 | A teacher succeeds normally at Teach. | p.73: Improve the result **one training step**. | Promote exactly one table tier before rolling gain. |
| A4-T13 | A teacher fails Teach. | p.73: The base training result is unaffected. | Use the normal dice tier; no automatic lost week. |
| A4-T14 | A teacher fumbles Teach. | p.73: Reduce improvement **one training step**, potentially resulting in no improvement. | Decrease one dice tier and permit a zero-improvement result at the lowest tier, without negative skill loss. |
| A4-T15 | A character tries to train two skills in the same week. | p.73: Only **one skill at a time** can benefit from training. | Warn/deny overlapping simultaneous training sessions; GM may log sequential sessions. |
| A4-T16 | A character just finished mentor training in a skill and wants the same training again immediately. | p.73: That skill must first be **increased with an Experience Roll** before it can benefit from training again. | Track/refer to eligibility and prevent repeat tuition bypassing the intervening XP improvement. |
| A4-T17 | A trainer with no Teach skill tries to tutor two students simultaneously. | p.73: A basic trainer can tutor **one** student at a time. | Record one-student limit if modelling capacity; otherwise show GM guidance. |
| A4-T18 | A teacher with Teach 70% trains a group. | p.73: Suggested capacity is **Teach skill / 10** = 7 students. | Show seven as a guideline, not a hard multiplayer enrollment engine. |
| A4-T19 | The mentor has Lore (History) 70% and Teach 50%. | p.73 worked costs: Base is **14 silver/week** (70/5), plus **5 silver** for Teach (50/10) = **19 silver/week**. | Display suggested 19 sp and allow GM prices/cult discounts; do not enforce it as universal cost. |
| A4-T20 | A mentor accepts favours or a cult discounts tuition. | p.73: Payment terms and discounts are GM/organization decisions. | Allow free or noncash tuition, not a mandatory bank withdrawal. |

## D. Ageing and ageing effects (Core pp.34, 70–71)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-AG01 | A human reaches age 39 then 40. | pp.70–71: Human ageing starts at **Early Middle Age 40–49**; checks occur when **entering a new Age Band**, not on every birthday. | Prompt once when entering age 40; do not reroll yearly from 41–49. |
| A4-AG02 | A human enters age 40–49. | p.71 Age Bands: **Endurance and Willpower**, both at **Easy**. | Prompt two distinct tests at Easy. |
| A4-AG03 | Human enters 50–59. | p.71: Both rolls are **Standard**. | Use Standard, separately for Endurance and Willpower. |
| A4-AG04 | Human enters 60–69. | p.71: Both rolls are **Hard**. | Use Hard. |
| A4-AG05 | Human enters 70–79. | p.71: Both rolls are **Formidable**. | Use Formidable. |
| A4-AG06 | Human enters 80–89. | p.71: Both rolls are **Herculean**. | Use Herculean. |
| A4-AG07 | Human enters age 90 or more (Dotage). | p.71: Both rolls are **Hopeless**. | Show Hopeless rather than an invented 95% failure or arbitrary capped penalty. |
| A4-AG08 | An ageing Endurance roll succeeds and Willpower fails. | pp.70–71: Failed Endurance causes **physical** ageing; failed Willpower causes **mental** ageing, independently. | Apply only mental ageing; do not reduce physical characteristics for the successful Endurance roll. |
| A4-AG09 | Failed Endurance is followed by Ageing Effects d6 of 1–2, 3–4, or 5–6. | p.71 table: Physical result is **STR, CON, or DEX** respectively. | Select the correct physical characteristic and prompt its loss. |
| A4-AG10 | Failed Willpower is followed by Ageing Effects d6 of 1–2, 3–4, or 5–6. | p.71 table: Mental result is **INT, POW, or CHA** respectively. | Select the correct mental characteristic and prompt its loss. |
| A4-AG11 | A characteristic is selected by a failed ageing test. | p.70: It loses **1d3 points**; effects and related derived values update. | Record the rolled loss exactly once and recompute associated stats and skills. |
| A4-AG12 | Both ageing checks fail upon entry to a band. | pp.70–71: Each failed test produces its **own** 1d6 characteristic selection and 1d3 reduction. | Permit two independent losses; do not combine into one roll. |
| A4-AG13 | An ageing reduction reaches characteristic value zero. | p.71: Character dies of terminal frailty. | Clearly flag that consequence; preserve the character record for GM review. |
| A4-AG14 | A character raises a characteristic after an ageing loss. | p.70: Improvement can recover or partially counteract age-related losses. | Allow the approved improvement pathway and recalculate; do not treat ageing as an absolute permanent lock. |
| A4-AG15 | A newly created Senior/Old human character qualifies for starting-age bonuses. | p.34: Senior and Old character age categories are **also** subject to Ageing. | Show required applicable ageing guidance during character creation rather than awarding bonus points with no notice. |
| A4-AG16 | A nonhuman age band differs from the human thresholds. | p.70: Ageing onset/bands vary with species. | Do not apply human 40/50/60 thresholds indiscriminately to custom species; defer to GM/species definition. |
| A4-AG17 | An ageing result was already confirmed and saved. | pp.70–71: Ageing roll applies when **passing into** the band. | Save the band, tests and approved losses so reopen/import cannot reroll or double-reduce characteristics. |

## E. Fatigue, exertion, sleep deprivation and recovery (Core pp.71, 77–79)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-F01 | A character undertakes Light effort. | p.79 Physical Effort table: Initial unfatigued period is **CON hours**; then Very Easy Athletics, Brawn or Endurance as appropriate. | Offer the timing and correct skill/grade; GM selects applicable skill and confirms elapsed time. |
| A4-F02 | A character undertakes Medium effort. | p.79 table: Initial period is **CON minutes**; then an **Easy** physical-effort skill roll. | Use CON minutes and Easy rather than Light-effort's hours. |
| A4-F03 | A character undertakes Strenuous effort such as combat. | p.79 table: Initial period is **CON seconds, rounded up to the next Combat Round**, then **Standard** effort test. | Compute the elapsed threshold in five-second rounds, and use Standard for the first check. |
| A4-F04 | A character fails an effort check. | pp.78–79: Each failure adds **one Fatigue level**; success avoids this level at that check. | Move exactly one level on failure, retain existing Fatigue from other sources. |
| A4-F05 | A character goes without sleep for **2×CON** hours. | p.78: At this threshold an Endurance roll is needed; on success, another check comes after **CON/2** more hours. | Offer first Endurance check, then track the next threshold rather than immediately applying Fatigue. |
| A4-F06 | A sleep-deprived character passes a check and continues awake. | p.78: Each successive Endurance check is **one grade harder** than the last; each failure adds one Fatigue level. | Record number/grades of checks and any failed-result levels, but leave watch-time adjudication to GM. |
| A4-F07 | Fatigue increases from Winded to Tired. | p.79 table: **Winded** = Hard skill grade, no movement/initiative/AP penalty; **Tired** = Hard, -1 m movement, no initiative/AP penalty. | Apply both discrete levels accurately, not one generic penalty for all tired states. |
| A4-F08 | A character is Wearied. | p.79: Formidable skills, **-2 m movement**, **-2 initiative**, **no AP penalty**. | Display/apply exactly these modifiers. |
| A4-F09 | A character is Exhausted. | p.79: Formidable skills, **halved movement**, **-4 initiative**, **-1 AP**. | Recompute derived action economy; never allow negative AP. |
| A4-F10 | A character is Debilitated. | p.79: Herculean skills, **halved movement**, **-6 initiative**, **-2 AP**. | Use Herculean and the correct penalties, distinguishing from Exhausted. |
| A4-F11 | A character is Incapacitated. | pp.78–79: Herculean skills, **immobile**, **-8 initiative**, **-3 AP**; only the most desperate activities are possible. | Show severe restrictions and appropriate GM override, not normal movement or attacks. |
| A4-F12 | A character reaches Semi-Conscious or Comatose. | p.79: Semi-Conscious has Hopeless skill grade and **no activities possible**; Comatose likewise permits no activity. | Label and prohibit/flag normal actions; do not classify these merely as 'Hard'. |
| A4-F13 | A character reaches Dead on the Fatigue track. | p.79: Dead has no activity or recovery. | Make terminal state conspicuous; never automatically recover the character through ordinary rest. |
| A4-F14 | A character at Winded rests after **physical exertion**, with Healing Rate 2. | p.79: Winded's Recovery Period is **15 minutes**, divided by Healing Rate = **7.5 minutes** of complete rest. | Present the calculation without silently rounding to a different unit; require confirmed rest to improve one level. |
| A4-F15 | A physically Tired character has Healing Rate 3. | p.79: Tired's Recovery Period is **3 hours**, divided by 3 = **1 hour** of complete rest for that level. | Offer a one-level recovery after the computed rest period, not automatic full reset. |
| A4-F16 | The character is Wearied, Exhausted, Debilitated, Incapacitated, Semi-Conscious or Comatose. | p.79 table: Base physical recovery per level is **6/12/18/24/36/48 hours**, respectively, divided by Healing Rate. | Use the row-specific period and Healing Rate; do not assign every Fatigue level the same rest duration. |
| A4-F17 | Fatigue comes from multiple concurrent sources. | p.78: Fatigue from exertion, drowning, bleeding, disease, etc. **accumulates** on one track. | Combine levels in a single displayed state while preserving cause notes and cause-specific recovery. |
| A4-F18 | Asphyxiation ends while the victim is still alive. | p.71: Fatigue levels from suffocation normally recover **one level per minute** (unless GM imposes permanent lung consequences). | Display the separate rapid recovery rule, not physical exertion's Healing Rate formula. |
| A4-F19 | Bleeding stops after a character gained three Fatigue levels from blood loss. | p.71: Blood-loss Fatigue recovers **one level per day starting the day after bleeding ceases**. | Do not recover the levels on the bleeding-stop day or apply the physical-exertion clock. |
| A4-F20 | A character's bleeding, asphyxiation or disease continues. | pp.71,74–79: Recovery depends on ending/addressing the cause; conditions can continue inflicting Fatigue. | Keep the hazard's cause active until GM confirms it ended; don't heal ongoing consequences solely because time passed. |
| A4-F21 | The GM wants reduced Fatigue bookkeeping. | p.79: GM may choose which activities generate Fatigue; this is an explicit simplification. | Provide source-specific reference/manual marking; do not implement all travel/activities as an always-on automatic Fatigue engine. |
| A4-F22 | A Burdened or Overloaded character undertakes sustained activity. | p.77: Burdened counts as **Medium** exertion; Overloaded as **Strenuous**. | Surface the correct Fatigue category from existing ENC state or provide clear guidance without duplicating encumbrance code. |

## F. First Aid, professional Healing, natural recovery and maiming (Core pp.9, 41, 46–47, 80, 110)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-H01 | A human has CON 6, 7, 12, 13, or 18. | p.9 Healing Rate table: **1** at CON ≤6; **2** for 7–12; **3** for 13–18; +1 per further six CON. | Verify exact boundary values in the derived Healing Rate. |
| A4-H02 | A wounded location has a **Minor Wound**. | p.80: Naturally recover **Healing Rate HP per day**. | Apply one eligible day's recovery to that location, capped at its current max HP. |
| A4-H03 | A location has a **Serious Wound**. | p.80: Naturally recover **Healing Rate HP per week** while the location remains at or below zero and is classified Serious. | Apply the weekly amount and preserve distinct wound severity/HP. |
| A4-H04 | A location has a **Major Wound** and was successfully surgically treated. | p.80: Naturally recover **Healing Rate HP per month** until it improves to Serious. | Use monthly healing only after the prerequisite treatment, without instantly changing the wound to Minor. |
| A4-H05 | Healing Rate 3 restores a Serious Wound from -3 to 0 over a week. | p.80 worked example: Serious continues until the wound goes **above zero**; once it is above zero, it heals at the Minor/day rate. | Reevaluate severity after each interval; do not change to daily recovery while the location is still at 0. |
| A4-H06 | A character engages in strenuous activity while recuperating. | p.80: Natural Healing Rate is **reduced by 1d3** while such activity exacerbates the injury. | Prompt/record reduction; do not continue untouched full-rate healing while strenuous activity is confirmed. |
| A4-H07 | A Major Wound was stabilized but has **not** received successful professional Healing treatment. | pp.47,80: Natural healing of a Major Wound **cannot start** until successful Healing treatment. | Block or warn on automatic monthly healing until surgery/treatment is confirmed. |
| A4-H08 | A non-dismembering Major Wound remains untreated beyond the deadline. | p.80: If untreated within days equal to **one twentieth of the Healing skill**, it becomes **maimed**. Fractional-day rounding is not specified by the cited rule. | Show deadline/possible maiming with GM adjudication; don't invent a silent rounding convention. |
| A4-H09 | A Major Wound is bleeding or threatens immediate death, and First Aid succeeds. | p.41: First Aid stabilizes it and prevents immediate death, but returns **no HP** and does not restore functionality. | Record stabilization without restoring location HP or marking it surgically treated. |
| A4-H10 | First Aid is applied to a Minor Wound. | p.41: Successful treatment restores **1d3 HP** to that injury. | Prompt 1d3 and apply within hit-location maximum. |
| A4-H11 | First Aid is applied to a Serious Wound. | p.41: Successful treatment restores **partial functionality**, not a listed HP amount. | Record functional state without adding HP solely from First Aid. |
| A4-H12 | The same injury receives First Aid twice. | p.41: First Aid may be applied **once per specific injury**. | Track incidents and disallow a duplicate benefit, while permitting treatment of a separate wound in the same location. |
| A4-H13 | First Aid is applied to multiple locations hurt simultaneously by one attack. | p.41: One First Aid attempt is allowed **per affected hit location**. | Preserve distinct location treatments and avoid a single global used-up flag. |
| A4-H14 | A character performs First Aid. | p.41: It takes **1d3 minutes**, and neither healer nor patient can do other actions during it. | Display/prompt duration and present action-lock guidance; avoid starting/finishing silently. |
| A4-H15 | First Aid treats bleeding, asphyxiation, impalement, or ordinary unconsciousness. | p.41 table: Respectively stops blood flow, restarts breathing, removes impaled item without additional harm, or restores awareness **unless** due to poison/narcotics. | Offer these distinct outcomes rather than treating First Aid as a generic HP spell. |
| A4-H16 | Professional Healing succeeds on a Serious Wound. | p.46: Restores **1d3 location HP**; critical restores **1d3+1**, fumble **inflicts 1 HP** of additional damage. | Apply the appropriate die and separate Healing from First Aid. |
| A4-H17 | Professional Healing treats poison/disease **before** onset. | p.46: Oppose Healing against malady Potency; a win counteracts the condition before it manifests. | Record opposed result and cancel future onset only on success. |
| A4-H18 | Professional Healing treats poison/disease **after** onset. | pp.46–47: Success allows a **new resistance roll at one grade easier**, critical at two grades easier; fumble makes the new resistance one grade harder. | Present the correct subsequent resistance grade; do not retrospectively erase already inflicted permanent harm. |
| A4-H19 | Professional Healing is used as surgery on a Major Wound. | p.47: **First Aid stabilization first**, then a Healing roll; normal success makes the Major Wound eligible for natural recovery. | Require both stages and record when the major-recovery gate opens. |
| A4-H20 | Surgery critically succeeds on a Major Wound. | p.47: Besides enabling recovery, the location immediately regains **1 HP**. | Restore exactly 1 location HP, not 1d3, and start natural recovery eligibility. |
| A4-H21 | Surgery fumbles on a Major Wound. | p.47: Patient must pass an **Endurance** check or die. | Prompt Endurance and record GM-confirmed outcome; do not convert fumble into routine loss of 1 HP. |
| A4-H22 | A limb has been fully severed. | p.47: Surgery **cannot reattach** a severed limb. | Do not offer ordinary Healing surgery as a valid reattachment mechanism. |
| A4-H23 | Healing magic touches physical trauma. | p.80: Even magic too weak to heal the underlying Major Wound may **stabilize** gross physical trauma; not poison, suffocation or similar non-traumatic effects. | If magical healing is recorded, permit stabilization with a source note; preserve pause on further Magic automation. |
| A4-H24 | A permanent injury is rolled as 1 on the **1d3 Maiming table**. | p.80: Permanently reduce location maximum HP by **one third**, with severity-specific disfigurement. | Apply/record fractional reduction with **GM-confirmed rounding** rather than inventing a rule; recalculate wound thresholds. |
| A4-H25 | A permanent injury roll is 2. | p.80: Permanently reduce location maximum HP by **two thirds**. | Apply the proper permanent reduction, with GM-confirmed rounding and updated thresholds. |
| A4-H26 | A permanent injury roll is 3. | p.80: Location maximum HP becomes **1**, with extensive maiming. | Set effective location maximum to exactly 1; retain original max and permanent loss history. |
| A4-H27 | A location has been permanently maimed. | p.80: Its **reduced maximum HP** establishes its new Serious and Major Wound thresholds. | Recalculate severity for later injury using the diminished location max, not the original max. |
| A4-H28 | A limb is partially or entirely missing. | p.80: Portions of the normal d20 hit-location allocation may no longer exist; rolls landing on a missing part can **miss**, with extra rules for deliberately targeting a remnant. | Display changed location coverage and flag resolution for GM; do not automatically redirect a missing-limb hit to an adjacent intact location. |
| A4-H29 | A wound recovers until the maximum location HP is reached. | p.80: Natural healing replenishes lost HP, not beyond a location's maximum; permanent reductions apply to maximum. | Cap recovery at the **post-maiming maximum** and record elapsed interval to avoid double-healing on reload. |
| A4-H30 | A player edits HP/First Aid/surgery while offline, then reloads the signed-in sheet. | pp.41,47,80: Distinct wounds and treatment stages have independent effects. | Persist wound severity, HP, incident-level First Aid usage, stabilization, surgery, healing eligibility and maiming separately without duplicating prior treatments. |

## G. Acid, falls, asphyxiation, blood loss and fire (Core pp.68, 71, 78–79)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-HZ01 | A target sustains a weak-acid splash. | p.68 Acid table: **1d2 damage**, active for **1 Combat Round**. | Show accurate damage/duration as hazard guidance; allow GM-confirmed damage application. |
| A4-HZ02 | A target sustains strong acid. | p.68 table: **1d4 damage**, duration **1d2 Combat Rounds**. | Prompt corresponding damage and duration rolls where used. |
| A4-HZ03 | A target sustains concentrated acid. | p.68 table: **1d6 damage**, duration **1d3 Combat Rounds**. | Use the correct larger dice; no generic constant damage. |
| A4-HZ04 | Acid is sprayed versus an immersion in a large quantity. | p.68: Splash typically fades after its listed rounds; **immersion continues each round** until removal/treatment. | Distinguish finite splash exposure from sustained immersion, under GM control. |
| A4-HZ05 | Generic acid hits worn armour. | p.68: Armour initially protects but acid **erodes its AP**, then reaches the protected flesh once destroyed. | Track corrosive armour degradation separately from ordinary single-hit AP subtraction when GM confirms it. |
| A4-HZ06 | A specialist acid corrodes metal but not flesh. | p.68: Acid types may have material-specific properties at GM discretion. | Allow GM-defined material restrictions; do not force all acid to work identically. |
| A4-HZ07 | A character falls **1 metre or less**. | p.78 Falling Distance table: **No damage**. | Do not inflict standard fall damage. |
| A4-HZ08 | A character falls **2–5 metres**. | p.78 table: **1d6** to **one random hit location**, ignoring armour. | Prompt correct damage and a random location; bypass AP. |
| A4-HZ09 | A character falls **6–10 metres**. | p.78 table: **2d6 damage to two random locations**, rolled separately for each location. | Roll distinct damage applications, not one 2d6 amount split between locations. |
| A4-HZ10 | A character falls **11–15 metres**. | p.78 table: **3d6** to **three random locations**; armour offers no reduction. | Apply three separate 3d6 rolls/locations, subject to repeating location adjudication. |
| A4-HZ11 | A character falls **16–20 metres**. | p.78 table: **4d6** to **four random locations**; +1d6 for every further 5 metres. | Use the appropriate location count and escalating die step. |
| A4-HZ12 | Small creatures fall the same raw distance as humans. | p.78: SIZ 8–9 subtracts 1m; 6–7 subtracts 3m; 4–5 subtracts 5m; 2–3 subtracts 8m; SIZ ≤1 subtracts 10m from damage-calculation distance. | Calculate **effective** fall distance first, not after injury damage. |
| A4-HZ13 | SIZ 35 creature falls 2 metres. | p.78 worked example: Large creatures add **+1d6 per 10 points above SIZ 20**; the SIZ 35 example inflicts **3d6** to one random location. | Match the explicit 3d6 boundary example rather than blindly rounding fractional size steps down. |
| A4-HZ14 | A falling character succeeds at Acrobatics. | p.78: Fall is counted **2m shorter**; if no Serious/Major Wound results, landing is safe and the character isn't prone. | Offer distance reduction and conditionally suppress prone; don't guarantee safe landing regardless of injury. |
| A4-HZ15 | A person lands on a soft surface or spikes. | p.78: GM may **halve effective distance** for soft surfaces; damaging surfaces add effects to each damaged location. | Provide GM controls for landing conditions, not a mandatory universal multiplier. |
| A4-HZ16 | A falling object has SIZ 7. | p.78: Falling-object base damage is **1d6 per 6 SIZ or fraction**, plus distance-based fall damage. | Show 2d6 object-size contribution plus the relevant fall component; keep object versus person damage distinct. |
| A4-HZ17 | A person falls from a moving chariot at 20m per Combat Round. | p.78 worked example: 20m/round inflicts **2d6 damage to two random locations**. | Match this example, including location count. |
| A4-HZ18 | A character prepares to hold their breath. | p.71: Breath-holding lasts seconds equal to **Endurance skill**; unprepared passive case halves it; unprepared strenuous case reduces it to one fifth. | Give the correct clock with selectable preparation/activity; prompt the GM to confirm circumstances. |
| A4-HZ19 | Breath-hold expires and the first asphyxiation Endurance roll is a critical success. | p.71: A critical avoids further deterioration; a normal success gains **1 Fatigue level**. | Distinguish critical from ordinary success rather than both resulting in zero Fatigue. |
| A4-HZ20 | The asphyxiation Endurance roll fails or fumbles. | p.71: Failure gives **1d2** additional Fatigue levels that round; fumble gives **1d3**. | Prompt the correct die, add to current Fatigue (which may have other sources), and continue until air returns or death. |
| A4-HZ21 | Bleeding arises from Bleed Special Effect, Major Wound or a disease/poison. | p.71: Significant blood loss can arise from all three causes and causes Fatigue. | Track the bleeding cause and Fatigue accumulation separately from HP healing. |
| A4-HZ22 | Bleeding is staunched. | p.71: Blood-loss Fatigue regains one level/day **beginning next day**; treating wound does not imply immediate Fatigue removal. | Mark blood loss stopped and calculate/refer to the specific recovery schedule, not generic physical rest. |
| A4-HZ23 | An Intensity 1 candle or Intensity 2 torch causes fire exposure. | p.79 table: Candle **1d2 damage/round**, ignition **1d4 rounds**; torch **1d4 damage/round**, ignition **1d3 rounds**. Both affect one location. | Offer corresponding damage, ignition dice and a single-location exposure. |
| A4-HZ24 | Campfire (Intensity 3) burns a character. | p.79 table: **1d6 damage/round**, ignition **1d2 rounds**, affects nearest **1d4+1 locations**. | Prompt correct location count and per-location damage, not a single fixed hit. |
| A4-HZ25 | Room conflagration (Intensity 4) burns a character. | p.79 table: **2d6 damage/round**, ignition **1d2 rounds**, affects nearest **1d4+1 locations**. | Use 2d6 and correct multiple locations. |
| A4-HZ26 | Volcanic lava (Intensity 5) burns a character. | p.79 table: **3d6 damage/round**, ignition **immediate**, affects **all hit locations**. | Prompt/record per-location damage for the whole body. |
| A4-HZ27 | Clothing catches alight. | p.79: Burning material takes HP damage **ignoring Armour Points**, as does flesh beneath; an uncontrolled fire spreads by a number of hit locations each round equal to its Intensity. | Represent ignition and spread separately from initial heat exposure; do not let ordinary armour negate burning clothing. |

## H. Disease, poison, conditions and examples (Core pp.74–77; Healing pp.46–47)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-D01 | An ingested, inhaled, contact or injected toxin is encountered. | p.74: These are the four standard **Application** methods and determine how exposure occurs. | Store the correct route and require relevant contact rather than triggering every toxin on sight. |
| A4-D02 | A disease/poison with Potency 65 is contracted. | p.74: Potency is opposed by its stated resistance skill (normally Endurance or Willpower); winning avoids the conditions. | Offer an opposed Potency/resistance check or GM-entered outcome, keeping the resistance type configurable. |
| A4-D03 | The player does not know a disease has taken hold. | p.74: Resistance may be tested at **exposure** or **onset**, at GM discretion. | Support a concealed/pending status without immediately revealing infection to an unauthorized player. |
| A4-D04 | A toxin has delayed onset and two separate timed symptoms. | p.74: Onset may be seconds, minutes, hours or longer; **individual conditions** may have different onset times. | Store/show each condition's onset schedule without assuming simultaneous effects. |
| A4-D05 | A toxin has a duration and a specific antidote. | p.74: After failed resistance, conditions persist for specified duration; successful treatment prevents further manifestations but may leave existing damage. | Allow GM-ended condition and residual injury; do not automatically erase already suffered maiming/HP loss. |
| A4-D06 | **Agony** affects a location used by a skill. | p.75 Conditions table: Skill succeeds only if its roll also does not exceed the victim's **Willpower**. | Apply or display the supplementary Willpower threshold rather than a blanket -20%. |
| A4-D07 | **Asphyxiation** condition occurs. | p.75: Victim collapses unable to breathe; use p.71 asphyxiation rules. Severe cases may be kept alive by First Aid opposed to Potency. | Use the correct asphyxiation pathway and First Aid option, not an HP-only effect. |
| A4-D08 | **Bleeding** condition occurs. | p.75: Triggers blood loss effects from p.71. | Mark bleeding and ensuing Fatigue separately from an ordinary wound. |
| A4-D09 | **Blindness** condition occurs. | p.75: Victim becomes blind. | Mark vision loss, with relevant skill penalties adjudicated via existing visibility rules/GM. |
| A4-D10 | **Confusion** condition occurs. | p.75: Victim cannot use **knowledge, communication or magic** skills. | Flag the disabled skill categories, not every physical skill. |
| A4-D11 | **Contagious** condition occurs. | p.75: Disease/poison can be passed **by touch**. | Record contagious state and provide exposure guidance; do not secretly auto-infect all nearby characters. |
| A4-D12 | **Deafness** occurs. | p.75: Victim loses hearing. | Flag auditory perception and communication considerations; do not erase sight. |
| A4-D13 | **Death** condition manifests. | p.75: Victim collapses incapacitated and dies after a number of **rounds equal to CON**. | Record onset and a CON-round countdown/GM note, not immediate death. |
| A4-D14 | **Dumbness** occurs. | p.75: Vocal cords are paralyzed and speech is impossible. | Disable/flag verbal communication rather than all action or comprehension. |
| A4-D15 | **Exhaustion** manifests. | p.75: Victim gains **one additional Fatigue level**. | Increment existing Fatigue exactly one step. |
| A4-D16 | **Fever** manifests. | p.75: **All skills** use Hard difficulty. | Show the universal Hard grade, composing difficulty modifiers correctly. |
| A4-D17 | **Hallucinations** manifest. | p.75: Perception of reality is distorted; basic skills and abilities are **not mechanically reduced** by this condition itself. | Record a GM/narrative condition without inventing automatic skill penalties. |
| A4-D18 | **Maiming** condition manifests. | p.75: The location(s) suffer **one permanent HP** of reduction. | Reduce the affected location's maximum by 1 and recalculate wound thresholds; do not apply the separate 1d3 accident maiming table. |
| A4-D19 | **Mania** manifests. | p.75: Sufferer is compelled toward the named obsession/behavior in the disease description. | Keep named compulsion and GM adjudication, not a fixed damage penalty. |
| A4-D20 | **Nausea** triggers during a stressful physical action. | p.75: Roll **Endurance** to avoid vomiting; on vomiting, no actions for **1d3 rounds**. | Prompt correct check and duration, not immediate incapacitation on every action. |
| A4-D21 | **Paralysis** affects one location or entire body. | p.75: Involved body part cannot move; whole-body paralysis prohibits physical movement. | Apply the stated scope rather than always disabling all locations. |
| A4-D22 | **Sapping** reduces a victim's MP or MP attribute. | p.75: Use Potency on Spirit Damage table (p.131); MP loss does not recover before the condition ends. | Display correct source and GM-entered result; respect manual MP-recovery decision D-2 (no automatic restoration). |
| A4-D23 | **Unconscious** condition ends. | p.75: Upon regaining awareness, the victim has **one Fatigue level**. | Record the Fatigue increment after recovery; do not reset the Fatigue track. |
| A4-D24 | **Pyrohoxia** infects by a bite. | p.75: Injected; Potency **80**, Endurance; onset **1d6+6 days**, duration **1 week + 1d3 days**, progression Hallucinations → Mania (Fire) → Death. | Present the ordered condition schedule and cure deadline as a reference/GM-assisted record. |
| A4-D25 | Pyrohoxia has reached Mania (Fire). | p.75: Healing can cure **up to** onset of Mania, after which magical treatment is required. | Flag ordinary Healing as insufficient after that stage, not a generic remove-condition button. |
| A4-D26 | **Red Pox** begins after skin contact. | pp.75–76: Contact, Potency **50**, Endurance; onset **1d6+6 hours**, duration **1d6+3 days**. | Store correct application, potency and timing. |
| A4-D27 | Red Pox's contagious stage advances one day. | p.76: After initial contagiousness, Fever and Bleeding begin; each bleeding day adds a **Fatigue level**, which does not recover until disease ends. | Track delayed escalation and prevent ordinary physical-exertion Fatigue recovery while cause persists. |
| A4-D28 | **Soul Leech** reaches weekly progression. | p.76: Inhaled; Potency **65**, Endurance; onset **1d6 days**; duration **1d3+3 weeks**. Sapping reduces MP attribute **1d6/week**, then recovers **1 point/day** after ending. | Preserve MP maximum vs current values and show recovery as manual (D-2), with exact disease timing. |
| A4-D29 | **Cobra Venom** is spat into eyes or injected by a bite. | p.76: Potency **75**, Endurance; eye contact is immediate Agony/Blindness, while injected onset is **1d6+4 minutes** with later asphyxiation/necrosis. | Support two distinct application modes and symptom schedules instead of one identical effect. |
| A4-D30 | Cobra-bite survivor develops necrosis. | p.76: Necrosis loses **1 HP/day** from the bitten location until poison is purged or duration ends; such damage may become permanent. | Record location-specific HP loss and lasting consequences subject to treatment, not all-location damage. |
| A4-D31 | **Lotus Dust** enters lungs in natural form versus smoked form. | p.76: Inhaled, Potency **90**, **Willpower**, onset **1d3 rounds**; natural form causes Death, smoking causes Paralysis/Hallucinations for **2d6 hours** and a second resistance check at the end. | Present the distinct routes/consequences and second check; never resolve natural powder as merely an intoxicant. |
| A4-D32 | **Sleeping Draught** is swallowed. | pp.76–77: Ingested, Potency **60**, Willpower; onset **1d6+4 minutes**, duration **1d6+3 hours**, causing Unconsciousness; Healing plus stimulant can counteract. | Record precise onset, duration and a specific treatment option. |

## I. Exposure, starvation, dehydration, traps, weather and visibility (Core pp.82–85, Task pp.66–67)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-S01 | A suitably clothed character enters a hostile climate. | p.82: Environmental **exposure** commonly begins after **CON hours**; rate of repeated exposure checks depends on weather. | Show threshold and a GM-controlled exposure rate, not automatic fatigue after an arbitrary fixed period. |
| A4-S02 | A character has not eaten in an extended time. | p.82: Critical **starvation** begins after **CON/2 days**, then checks repeat daily. | Present CON-derived onset; if fractional days matter, require an explicit rounding decision rather than silently choosing. |
| A4-S03 | A character has insufficient water. | p.82: **Dehydration** begins after **CON×4 hours**, or **×3/×2** in arid/hot conditions; repeat interval depends on humidity. | Offer correct CON multiplier and weather-adjusted GM interval. |
| A4-S04 | A survival hazard reaches onset and each subsequent check interval. | p.82: Test **Endurance**; each failure adds one Fatigue level. Existing Fatigue penalties modify subsequent checks. | Prompt repeated checks at configured intervals and retain cumulative Fatigue. |
| A4-S05 | A wet character is exposed to cold weather. | p.84: Being wet shifts exposure rate **one step cooler**; light/moderate gales one step and strong gales/storms **two steps cooler**. | Provide correct combined weather guidance instead of ignoring wetness/wind. |
| A4-S06 | The temperature is below -20°C, -19 to -10°C, -9 to 0°C, or 1 to 10°C. | p.85 Temperature table: Exposure rates are **minutes, 15 minutes, hourly, daily** respectively. | Use the corresponding risk and interval as GM-assisted guidance. |
| A4-S07 | The temperature is 11–20°C, 21–30°C, or 31–40°C. | p.85: Cool 11–20 and Warm 21–30 present **no exposure risk**; Hot 31–40 checks **hourly**. | Differentiate neutral bands from heat exposure; do not automatically apply cold Fatigue to 11–20°C. |
| A4-S08 | Wind STR is 31–45, 46–60, 61–75, 76–90 or ≥91. | p.85 Wind table: Corresponding movement fractions **2/3, 2/3, 1/2, 1/2, 1/3**; relevant skill grades Standard, Hard, Hard, Formidable, Formidable. | Supply the exact band penalties, using GM-confirmed wind rather than a weather feed. |
| A4-S09 | Relative humidity changes from 12% to 13%, 37% to 38%, 75% to 76%, or 87% to 88%. | p.85 Precipitation table: Distinct rainfall/duration and dehydration intervals by 0–12/13–25/26–37/38–50/51–62/63–75/76–87/88–100 bands. | Look up the correct band, especially boundary cases, if the optional weather reference is shown. |
| A4-S10 | A human-sized target is 300m away in clear daylight vs dense fog. | p.84 Visibility table: Clear daylight reference **500m**; dense-fog daylight **50m**, subject to SIZ/camouflage. | Display correct comparison for GM visibility adjudication. |
| A4-S11 | A creature SIZ 10 or less is seen, or a SIZ 22 target is seen. | p.84: SIZ ≤10 halves visibility distance; for each 10 SIZ above 20, range gains a multiple; example SIZ 22 doubles it. | Scale spot distances correctly when providing guidance, without automatic guaranteed detection. |
| A4-S12 | Someone designs a small lock trap or a large spike-pit trap. | p.83: Small traps use **Mechanisms**, large structures **Engineering**. | Record the proper builder skill; do not force every trap to use Mechanisms. |
| A4-S13 | A Mechanisms 70% trap is created. | p.83: Trap Difficulty normally equals builder's **70% skill**; opposed checks to perceive, avoid or disarm use that value. | Set Difficulty 70% unless explicitly modified; don't roll against generic fixed Difficulty 50. |
| A4-S14 | A trap construction Task gains two Enhancements. | p.83: Use Task rules (p.66 onward); each Enhancement raises trap Difficulty **+5%**. | Give +10% to the base Difficulty, and distinguish builder's skill from modified final Difficulty. |
| A4-S15 | Trap purpose is Alarm, Ensnaring, Maiming or Death. | p.83: These are the four named purposes, distinct from Trigger, Difficulty, Resistance and Effect. | Represent the fields individually; do not assume every triggered trap causes HP damage. |
| A4-S16 | A trap is triggered and the victim attempts resistance. | p.83: Usually an opposed Brawn/Evade/shield-Combat-Style test against the trap's Difficulty, using the listed resistance when triggered. | Prompt the specified roll or record GM outcome; apply Effect only after the correct test. |
| A4-S17 | A death trap is built with skill 1–10%, 11–20%, 21–30%, 31–40%, or 41–50%. | p.83 Death Trap table: Maximum listed damage is **1d2, 1d4, 1d6, 1d8, 1d10**, respectively; Force/Size changes Small→Medium→Large. | Display the correct maker-skill tier, die and Size/Force without inventing a flat +skill damage. |
| A4-S18 | A death trap is built with skill 51–60%, 61–70%, 71–80%, 81–90%, or 91–100%. | p.83 table: Maximum listed damage is **2d6, 1d8+1d6, 2d8, 1d10+1d8, 2d10** respectively; listed Force/Size Large→Huge→Enormous. | Apply/show each exact damage dice combination and Force/Size tier. |
| A4-S19 | A trap triggers and isn't a persistent magical enchantment. | p.83: Once sprung, ordinary traps must normally be **manually reset**. | Track triggered/spent state or leave a clear GM note; don't auto-reset without intervention. |
| A4-S20 | A **Crushing Roof** trap closes on victims. | pp.83–84 example: Difficulty **80%**, Evade to escape; otherwise roof can be resisted by group Brawn with combined STR/SIZ; trapped victims suffer **2d8 per round**, no armour. | Present the published example and distinct escape/resistance path rather than a generic damage-on-trigger rule. |
| A4-S21 | A **Pitfall** trap is activated. | p.84 example: Difficulty **60%**, Evade or Hard Athletics to catch edge; fall does **2d6** to a random location, armour ignored. | Show the two valid resistance choices and damage; GM selects any spikes/secondary effect. |
| A4-S22 | A **Spear Trap** is activated. | p.84 example: Difficulty **75%**, Evade or **Hard shield parry**, deals **2d8** to random hit location, Size **Huge**, with Special Effects when appropriate. | Apply legal resistance and Size/Force interaction, not an ordinary one-target attack that ignores parry restrictions. |
| A4-S23 | A GM estimates routine trap building costs. | p.83: Suggested alarm cost = maker skill in **copper**, ensnaring in **silver**, death-trap in **gold**; these are cost guidelines. | Offer reference costs with GM override, not enforce universally fixed economies. |

## J. Related player-facing recovery resources and cross-subsystem interactions (Core pp.77, 81–82)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| A4-L01 | A character starts a new session after using their personal Luck Points. | p.81: Personal Luck Points normally replenish **at the beginning of the next session**. | Provide a one-click GM/player-confirmed reset; do not refresh every combat round or ordinary rest. |
| A4-L02 | A player spends a Luck Point to reroll their own test or force an attacker's reroll. | p.81: **Cheat Fate** allows rerolling a roll affecting the character, including an opponent's roll. | Decrement exactly one Luck Point per legal use and present the reroll prompt. |
| A4-L03 | A fighter has exhausted all Action Points. | p.81: **Desperate Effort** spends one Luck Point to gain **one AP**. | Credit 1 AP with a matching Luck deduction, using the combat subsystem's current AP engine. |
| A4-L04 | A character suffers a Major Wound and uses **Mitigate Damage**. | p.81: One Luck Point converts it to a **Serious Wound**, reducing recorded damage to **one HP less than the Major threshold**. | Prompt/use one Luck and adjust the injury incident and HP consistently. |
| A4-L05 | A player tries to spend two Luck Points on the same action. | p.81: Only **one Luck Point** can support a particular action. | Disallow duplicate Luck use for the same action, rather than permitting unlimited rerolls. |
| A4-L06 | A character spends Group Luck only for their own benefit. | p.81: Group Luck may be used **only to aid a fellow team member**, and normally replenishes next session; GM may choose a slower refresh. | Keep Group Luck separate from personal Luck, check allied-beneficiary condition, and expose GM-set refresh. |
| A4-L07 | A character damages a wooden door, chain or other object. | p.81: Objects have Armour Points and Hit Points; AP absorbs damage first; reaching 0 HP renders the object unusable. | Use the equipment/object subsystem for appropriate AP/HP handling, with GM confirmation of object stats. |
| A4-L08 | A weapon is used on an object with AP at least as high as the weapon's AP. | p.81: Both object and weapon may suffer damage; GM judges whether the tool is appropriate. | Display possible weapon wear as GM-guided, not apply it to every tool without context. |
| A4-L09 | A character's carried ENC exceeds STR×2 or STR×3 while travelling. | p.77: Burdened and Overloaded impose distinct skill, movement and Fatigue-effort consequences. | Reuse equipment/encumbrance results to surface the appropriate Fatigue effort; no separate inventory count. |

## Deliberately open interpretations, exclusions and acceptance plan

1. **Exact +20 trainer differential:** Core p.73 requires at least +20 but its first improvement-table row begins 21–30. Do **not** manufacture a gain; document a GM/owner ruling if automatic training covers exactly +20.
2. **Fractional characteristics and injury arithmetic:** One tenth of a species maximum (p.72), maiming by thirds (p.80), fractional days in major-treatment deadlines (p.80), and survival onset at CON/2 (p.82) do not all have explicit fractional worked examples. Follow printed examples where given, retain raw values elsewhere, and record any selected rounding convention before deterministic code.
3. **Source-of-Fatigue recovery must be separate:** Physical exertion uses p.79 Recovery Period ÷ Healing Rate; asphyxiation normally regains 1 level/minute (p.71); blood loss regains 1 level/day beginning **the day after** it stops (p.71); disease may delay recovery further. No broad 'rest heals every Fatigue cause' button.
4. **Multi-stage wounds:** First Aid (p.41), professional Healing (pp.46–47), natural healing (p.80) and long-term maiming (p.80) are different processes. Treatment status must not itself imply full HP recovery. Preserve per-location/per-incident state; prevent repeated awards after reload.
5. **Do not overbuild:** This batch is a source inventory. Environmental timelines, contagion, weather simulation, whole-world traps and supernatural cures can remain explicitly GM-assisted in a lean player sheet if the owner agrees. Record condition, affected locations, relevant rolls/intervals and source text correctly. Do not touch paused Magic, optional Companion rules, or the separate Practice Combat feature.
6. **Source-to-app mapping:** Claude should map each ID to `Pass / Guidance / GM-assisted / Not implemented / Decision`, add deterministic tests for implemented calculations, and prioritize player-facing XP spending, training, ageing, Fatigue penalties and wound recovery. The prior 3/8 count stays unchanged until the complete Subsystem 4 scope, tests and applicable signed-in workflows are verified.

## App status (Claude, 2026-11-06)

Mapped against the code after PR #124. Claude re-checked Core pp.73 (training table, trainers, teachers, permanent improvement example) and 80 (healing rates, permanent injury table) in the uploaded PDF. Status key as in `combat-cases-batch-1.md`: **Pass** = implemented and covered by tests; **Pass (code)** = implemented and checked in code, no dedicated test yet; **Guidance** = rule text shown at the table; **GM-assisted** = resolved at the table; **Decision** = needs a ruling.

**Headline: no incorrect calculations were found.** The player-facing rules in this batch (Experience Rolls, skill and Passion improvement, characteristic training and permanent improvement, new Professional Skills, ageing, Fatigue, natural healing) are already implemented and match the book. What remains is two rulings and a few optional extras.

| Cases | Status | Notes |
|---|---|---|
| X01, X02, X15, X17, X20 | **GM-assisted** | Awards, fairness, "plausibly practised" and Passion reversal are GM calls. Awards are entered in the Experience panel. |
| X03, X04 | **Pass** | Experience Modifier from CHA (`xpMod`, rules-smoke tests); applying it is an explicit per-award choice, matching "only when plausible". |
| X05, X06, X10, X11 | **Pass** (`tests/advancement-cases.cjs`) | Rolls bank in the pool; one roll per improvement attempt; each attempt uses the current skill; no 100% cap. |
| X07–X09 | **Pass** (`tests/advancement-cases.cjs`) | d100 + INT compared with the skill; meeting it gives 1d4+1, falling short still gives +1. Not a skill-check critical or fumble. |
| X12, X13 | **Pass** (`tests/advancement-cases.cjs`) | Fumbled skills are recorded once (no stacking) for a free +1% at the next improvement. |
| X14 | **Pass** (`tests/advancement-options.cjs`) | Optional campaign rule (owner, 2026-11-06): the GM picks 1d6+1 in Campaign rules; default 1d4+1. |
| X16, X18 | **Pass** (X16 tested in `advancement-cases.cjs`; X18 adding a Passion is a form field) | Passions improve like skills; new Passions can be added. |
| X19 | **Pass** (`tests/advancement-options.cjs`) | Deepen and wane buttons in Improve Skills: Weak 1d10, Moderate 1d10+5, Strong 1d10+10 (Core p.82). The GM picks the strength; waning stops at 0. |
| C01–C08, C13 | **Pass** (`advancement-cases.cjs`, `core-batch-1.cjs`, `campaign-setup.cjs`) | Training adds a tenth of the species maximum (rounded up), capped at the maximum; SIZ excluded; each future award needs one roll to maintain; stopped training atrophies one step per award. |
| C09–C12 | **Pass** (`advancement-cases.cjs`: p.73 DEX 12 → 10 rolls; `campaign-setup.cjs`) | Optional permanent method chosen in campaign settings; cost 1 + current − species minimum (p.73 example: DEX 12 → 10 rolls); full cost required. |
| C14–C16 | **Pass** (`tests/advancement-cases.cjs`) | Learning a new Professional Skill needs a confirmed source, a month and 3 rolls. |
| T01–T10, T15–T17 | **Pass** (`tests/advancement-cases.cjs`: every table row, the re-training block) | Training table steps 1d2…1d6+4, +1 per further 10 points (`trainingStep`, `trainingDie`); one skill at a time and the Experience-Roll-before-retraining limit are shown as guidance. |
| T02 | **Pass** (ruling) | Exactly 20 points uses the first row (1d2), per the owner's ruling in `decisions.md`; below 20 is refused (test). |
| T11–T14 | **Pass** (`tests/advancement-cases.cjs`) | Teach result shifts the step: critical +2, success +1, failure 0, fumble −1 (possibly no gain). |
| T18–T20 | **Guidance / GM-assisted** | Class size, tuition cost and discounts. |
| AG01–AG17 | **Pass** (`core-batch-1.cjs` ageing tests) | Human ageing bands 40/50/60/70/80/90 with Easy → Hopeless grades; Endurance and Willpower separately; d6 characteristic table; 1d3 loss; terminal at 0; record and undo; Senior and Old creation categories prompt a review. Nonhuman bands are GM-assisted (AG16). |
| F01–F06, F21, F22 | **Guidance** | Effort periods, sleep deprivation and encumbrance-as-exertion are in the Hazards and Fatigue notes; checks are made at the table. |
| F07–F13 | **Pass** | Fatigue table: grade, movement, initiative and AP penalties applied in Play Mode (existing tests; matches p.79). |
| F14–F16 | **Pass** (`tests/advancement-cases.cjs`) | Recovery period divided by Healing Rate is shown per level. |
| F17–F20 | **Guidance** | Single Fatigue track; asphyxiation and blood-loss recovery text. |
| H01 | **Pass** | Healing Rate from CON (rules-smoke tests). |
| H02–H07, H29 | **Pass** (`tests/advancement-cases.cjs`; Advance time in `play-advance-time.cjs`) | Natural recovery per location at Healing Rate per day, week or month by wound level; Major Wounds need confirmed treatment first; never above the location maximum; a reduction can be entered for strenuous activity. |
| H08 | **GM-assisted** | Maiming deadline (Healing skill ÷ 20 days). |
| H09–H23 | **Guidance / GM-assisted** | First Aid, professional Healing and surgery outcomes are recorded through the wound log and HP controls. |
| H24–H27 | **Pass** (ruling) | Play Mode's permanent-injury box shows the three Permanent Injury results for the location (one third and two thirds lost, rounded up; or 1 HP) and fills in the new maximum; the GM confirms. Reduced maximums set the new wound thresholds (test). |
| H28 | **GM-assisted** | Missing-limb hit-location rolls. |
| H30 | **Pass** | Wounds, treatment flags and HP persist through save and reload (existing tests and live evidence). |
| HZ01–HZ27 | **Guidance / GM-assisted** | Acid, falls, asphyxiation, blood loss and fire: rule summaries in Play Mode's Hazards notes; damage entered with the HP controls. No hazard simulator, per the owner's lean-scope direction. |
| D01–D32 | **GM-assisted** | Disease, poison, conditions and sample afflictions are resolved at the table. |
| S01–S23 | **GM-assisted** | Survival, weather, visibility and traps. |
| L01–L06 | **Pass (code) / GM-assisted** | Luck Points are tracked in Play Mode; what they're spent on is the table's call. |
| L07–L09 | **GM-assisted / Pass** | Object damage is GM-assisted; encumbrance thresholds are Pass (subsystem 3). |

### Rulings (decided 2026-11-06)

1. **Trainer exactly 20% better (T02):** uses the 1d2 row.
2. **Maiming fractions (H24, H25):** HP lost rounds up; the location keeps at least 1 HP.

### Optional extras

- Campaign option for 1d6+1 skill improvement (X14).
- Passion shift helper: pick Weak, Moderate or Strong and roll (X19).
