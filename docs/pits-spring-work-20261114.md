# Pits spring Work batch — 20261114

**Current-branch acceptance: BLOCKED by a stale preview.** These are observations of the supplied URL, not confirmation that the current branch still has these faults. Do not start fixes from this report until the served assets match the branch.

Read `AGENTS.md`, `HANDOFF.md` and `pits-spring-work-batch-20261114.md` first. Executed November 13, 2026 (America/Los_Angeles; exported records are November 14 UTC). Source checkout and branch head: `ad0023e1ea7f7ab4978d7bf8395f3ef0f2ed40d3`.

Preview: <https://raw.githack.com/colemak1/mythras-character-forge/claude/sharp-franklin-mbjthj/experiments/practice-combat.html?stage=spring>

## Preview/version limit

The Copy fight record button was present, but the rendered document's script URLs had older version tokens than the same HTML at the requested branch head. Discovered during final evidence checks; no second test batch or reload/retry of blocked checks was run.

| Asset | Loaded document token | Branch HTML token / source SHA-256 prefix |
|---|---|---|
| `pits-writer.js` | `6691a13739` | `85e63d4e55` |
| `pits-spring-live.js` | `9b3214dabd` | `ab6f82dac5` |
| `pits-stage.js` | `ba22112b8e` | `f368a0316f` |

**Served-preview observations: 12 pass, 15 fail, 9 blocked. All 36 IDs are listed below.** Passes and failures apply only to the served preview; verification against the current branch is blocked for every ID by the mismatch above.

Browser screenshots were 1363 × 936, not the requested sizes. Exact resizing was unavailable in the supported browser interface; a native DevTools attempt was policy-blocked. Guidance off, Standard pace, Auto-roll off, Current layout. Local PvP used A/B, CS/armour as specified (armour 4). Gauntlet used A; its second miss-order attempt and finishing bout used DEX 20 to steer initiative. Only ordinary UI controls and random rolls were used.

Motion observations are sampled screenshots, not continuous video. A confirmed visible fault stopped that check; no full weapon/replay matrix is claimed for those early failures. Where no fault was captured but the required motion/matrix could not be completed or judged, the result is blocked. Stiff flails/whips and sword-speed stand-ins are not failures.

## Results

| ID | Served-preview result | Evidence / limit |
|---|---|---|
| A1 | **blocked** | Dagger: six exchanges and replay samples, including both sides' parries, an evade, undefended hits and a miss. Full four-reaction sequence per side and continuous-motion judgement incomplete. |
| A2 | **blocked** | Rapier at 70: attack 66, failed parry 96, head hit 19; thrust endpoint and red head visible. Full reaction/replay matrix and thrust path not captured continuously. |
| A3 | **blocked** | A blade/jaw overlap was seen in the longsword preparation (candidate Severity 2), but Copy returned stale clipboard text for the previous flail bout. Final validation caught the mismatch; no valid longsword record survived. Excluded from the failure count; not retried. |
| A4 | **blocked** | Mace miss 96 / failed parry 91 resolved without an endpoint fault. Full reaction/replay matrix and continuous swing judgement incomplete. |
| A5 | **fail** | **Severity 2:** Battleaxe (2H) was held with the other hand away from the haft during the pending attack roll; expected adjacent two-handed grip. [Record](pits-records/20261114-A5.json). |
| A6 | **fail** | **Severity 2:** greatsword's off hand remained by A's side at the stable post-hit guard; expected both hands on the grip. [Record](pits-records/20261114-A6.json). |
| A7 | **fail** | **Severity 2:** great hammer's off hand was by A's side during the pending attack roll; expected both hands on the grip. [Record](pits-records/20261114-A7.json). |
| A8 | **fail** | **Severity 2:** after the poleaxe miss/parry, the free arm hung away from the shaft; expected the lead hand to remain on the shaft. [Record](pits-records/20261114-A8.json). |
| A9 | **fail** | **Severity 2:** quarterstaff held in one hand while the attack roll waited; expected both hands on the staff. [Record](pits-records/20261114-A9.json). |
| A10 | **blocked** | Shortspear: attack/parry in both directions resolved; one-handed spear and clearance visible. Full evade/none/replay sequence and continuous thrust judgement incomplete. |
| A11 | **fail** | **Severity 2:** after A fumbled 100 and B failed parry 97, the pike shaft crossed B's head and its point extended beyond B; expected the miss to clear B. [Record](pits-records/20261114-A11.json). |
| A12 | **fail** | **Severity 2:** after the flail miss/parry, B's sword tip crossed A's head in the held result; expected clear bodies on a non-damaging exchange. This is not a complaint about the rigid flail. [Record](pits-records/20261114-A12.json). |
| A13 | **fail** | **Severity 3:** at the whip's held parried endpoint, only a short grey segment was legible near A's hand/body; the long weapon silhouette disappeared into the pose. Expected a readable long rigid stand-in. [Record](pits-records/20261114-A13.json). |
| B1 | **fail** | **Severity 2:** Trip eventually seated B with weapon raised, but Prone appeared while B was still upright/lowering, before the seated endpoint; expected the chip only once down. [Record](pits-records/20261114-B1.json). |
| B2 | **pass** | After two failed stand attempts, B's successful Regain Footing (Brawn 30 vs Athletics 9) returned the seated figure to a stance. |
| B3 | **pass** | Seated B attack 83 / A parry 67: stayed down, no stall, standing jump or blade through A in observed poses. |
| B4 | **fail** | **Severity 2:** B's weapon was already on the floor while Hit Location still awaited its roll, before damage; expected it to leave the hand at the blow's contact. [Record](pits-records/20261114-B4.json). |
| B5 | **fail** | **Severity 2:** defensive Disarm resolved, but A's blade crossed B's lower torso at the held Parried result before the drop completed; expected visible interception followed by disarm with clear bodies. [Record](pits-records/20261114-B5.json). |
| B6 | **fail** | **Severity 2:** Keep hold left two nearly overlapping rapier blade lines between A's hand and B's arm wound, with A's arm still pulled back; expected one lodged weapon and an arm reaching to its grip. [Record](pits-records/20261114-B6.json). |
| B7 | **pass** | Rapier Impale + Maximise, Chest 7 → 1; Leave it in left the blade in the chest, A empty-handed, no duplicate thrown behind A. |
| B8 | **pass** | Press Advantage held A's point at B's face while B covered. B was disarmed by the preceding B4 check. |
| B9 | **blocked** | Critical 9, Choose Head + Maximise executed; head 5 → 0, failed Endurance 83 and Victory. B was already prone; actual blade/head contact frame was not captured, so red highlighting alone is not accepted as proof. |
| B10 | **blocked** | Heater and buckler visibly differed in size. Shield Strike 64 / shield parry 55 failed and resolved as a shield strike in the chronicle; exact moving contact was not captured. No full visual acceptance. |
| B11 | **pass** | Broadsword wound disabled B's right arm at 0 HP; arm hung, weapon lay on the floor, B remained standing. |
| B12 | **pass** | Further right-leg wound failed resistance (76 vs attack 27); B crumpled/kneeled in place and remained down. |
| C1 | **fail** | **Severity 1:** Gauntlet major right-arm wound showed the Wounded result/affected figure down while the automatic major-wound Endurance dice were still rolling; expected those dice before the resolved blow and finishing consequence. Opponent had also attempted Evade, so down posture alone is not the evidence. [Record](pits-records/20261114-C1.json). |
| C2 | **fail** | **Severity 2:** A's miss 76 completed before the automatic counter, but the opponent's greatsword crossed A's head during that counter's attack roll; expected a clear declared/held pose. Ordering itself was not reproduced as wrong. [Record](pits-records/20261114-C2.json). |
| C3 | **pass** | A miss 93, B none, then B attack 95 and A parry 15: A's completed miss was visible before B's attack/parry sequence. |
| C4 | **pass** | Evade: Prone stayed absent through pending rolls and appeared as the downward movement began. An initial timing concern was withdrawn; no separate failure. |
| C5 | **pass** | Two observations five seconds apart showed the same held attack pose with a roll pending. This does not claim a continuous five-second dice animation capture. |
| D1 | **blocked** | Six-exchange replay started and sampled exchanges followed the original order. Whole-fight fluidity/no discontinuities could not be judged from intermittent screenshots. |
| D2 | **fail** | **Severity 2:** active replay offered Stop replay but no Show result control, so the specified direct stop-and-open action was unavailable; expected Show result during replay. [Record](pits-records/20261114-D2.json). |
| D3 | **pass** | After the Gauntlet win, Face Opponent 2 / Begin fight showed empty Current exchange, upright new figures, one weapon each, and no prior dropped weapon/body. |
| D4 | **pass** | Concede Bout produced the yielding/lowered-weapon pose and a concession result, without a new blow. |
| E1 | **blocked** | Exact 1280 × 800 and 1440 × 900 viewports unavailable. Long action names were visible at 1363 × 936; this is not acceptance at either requested size. |
| E2 | **pass** | Mid-bout button showed Copied; clipboard text began with `{"record":"pits-spring-1"`. Later clipboard denial opened the manual-copy text box; used it for subsequent records. |

## Evidence and next step

Each counted failure has its own original copied JSON, validated against its weapon/configuration. The stale A3 capture was excluded and is explicitly blocked above. Some `stage` arrays contain earlier bouts in the same browser session even though `config`, `presented` and `log` describe the current bout; records have not been edited to remove that history. Observations were captured promptly; B1's record followed the confirming seated endpoint, and C1's followed closing the automatic result window to reach Copy. No production code, saved characters, campaigns or CHANGELOG changed.

Local required suite: all **67 `tests/*.cjs` files** ran, process exit 0, no `FAIL`, assertion errors or error output. This validates the source checkout, not the older served assets. Rules were not audited and no sourcebook ruling is made.

**Next: Claude** — check the served asset-version mismatch first; determine which recorded faults are already fixed at `ad0023e`. Address any remaining Severity 1 before Severity 2. The owner can judge continuous motion/contact and exact screen sizes on a confirmed-current preview; blocked checks are not a request for a duplicate Work batch.

**Session readiness 13/14; feature completeness 8/8 built, 8 closed** (`docs/session-zero.md`). Changed: documented the stale-preview limit, all 36 dispositions and 15 failure records; no readiness or production change.
