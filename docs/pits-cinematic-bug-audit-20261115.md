# Pits cinematic bug audit — 2026-11-15

Owner direction: the current appearance and animation style are approved. Fix incorrect states, contacts and equipment; preserve the silhouettes, camera, pace, impacts, leaps and overall choreography. No redesign or return to the earlier stage.

Checked deployed `experiments/practice-combat.html`, default cinematic stage, against commit `21e202a` (#340). Read `AGENTS.md` and `HANDOFF.md` first. No production changes. This is a presentation audit against engine outcomes, not a new Core rules ruling.

## Coverage and evidence

- Desktop live: sample broadsword versus shortspear; hand transfer; miss; failed Evade with damage; prone; Pin Weapon and escape; Regain Footing; ordinary parry. A second bout used Shortspear + Heater, Combat Style 100%, versus a Greatsword: shield parry, successful defensive Trip, Damage Weapon, Impale, keep-hold, withdrawal and a Major right-leg wound ending in Victory in round 2. Outcomes and dice below are observations, not guaranteed random repro instructions.
- Pure movement checks: all **35 supported melee weapon profiles × 11 outcomes × 7 locations = 2,695 exchanges**, sampled for finite joint coordinates: PASS. This checks numerical stability, not visual correctness. Additional targeted checks covered both prone roles, falls without HP loss, shield contacts, grips, floor clearance and replay randomness. Measurements are in `pits-records/20261115-cine-audit-measurements.json`; distances are stage units, not screen pixels.
- All **75 `tests/*.cjs` files passed**, including the nine cinematic test groups. The existing suite misses the failures below. Earlier `tests/visual/` scripts were not used as acceptance evidence for this stage.
- The second bout and its full replay both completed to Victory; no warnings/errors were captured in that tab's browser console. Phone layout, live Disarm recovery, Entangle and reduced-motion behaviour were not fully exercised. Shield-strike and ground-shield contact failures below were measured in the rig, not claimed as live observations.
- Live evidence: [Prone chip with standing opponent](pits-visual-checks/cine-audit-trip-prone-20261115.png). The original broadsword bout's tab was closed across the interrupted turn; it was not completed. Clipboard export returned no record, so no fabricated fight JSON is supplied. The measurements JSON is diagnostic output, not an exported fight record.

## Confirmed failures

Each is Severity 2 (wrong but workable); these findings do not establish lost saves, a rules change or a session-breaking crash. “Rig” means reproduced by calling the actual movement module, not a claim of live visual acceptance.

| ID | Evidence / failure | Cause and smallest repair direction |
| --- | --- | --- |
| CA-01 | **Live + rig: successful defensive Trip leaves the opponent standing with a Prone chip.** Live: Greatsword attack 25/49, Heater parry 1/100, Trip resisted at 38/49; log says falls prone, next player turn still shows standing opponent. Rig: `blow(...,{outcome:'armour',loc:'rleg',lost:0,fall:'sit'})` ends with `down=false`, hips 60. Failed Evade with all damage absorbed has the same risk. | `pits-stage.js:1223` passes Trip's fall through `outcome:'armour'`. `pits-cine.js:577` handles armour/zero without forwarding `fall` or `prone` to `struck()`. Driver sets `mDown=true` anyway (`:1226`, `:1305`), preventing `psLull()` from repairing the picture. Honor engine-requested falls on zero-damage outcomes; derive HUD completion from the movement that actually occurs. This is more than the known missing Trip choreography. |
| CA-02 | **Rig: prone fighters rise during actions without Regain Footing.** After `fall(a,100)`, a parried or armour-stopped attack raises hips from 12 to 60 and then back to 12; a miss rises to 56. `press()` raises a prone aggressor to hips 58–60 while `down` remains `prop`. | Standing intermediate keys in `pits-cine.js:520–558`, `:579`, and `press():860` ignore the attacker's down state. `readyPose()` only fixes the final pose. Give these branches ground-height intermediates and keep the same outcome/tempo. Limited pose variety is already known; involuntary standing is a separate defect. |
| CA-03 | **Rig: shield strikes register hits away from the shield.** Sword + Heater, chest wound: contact is 54.95 from shield centre (radius 19). Partial parry's body contact is 70.98 away. Shortspear + Heater: 123.73 away. | `pits-cine.js:475` aims the bash from unlagged off-arm geometry, while `solve()` samples that arm with 36/48 ms lag. `:572` reuses the first bash aim for the later body contact instead of solving the second contact. Spear's forced two-hand grip also overrides the shield arm. Solve contact against the shield actually drawn at each contact time; preserve the bash style. |
| CA-04 | **Rig: a prone shield parry is shown meeting the weapon rather than the shield.** Full ward's contact is 126.17 from the Heater centre; partial ward is 119.43. | `pits-cine.js:449` uses the shield centre only when `!D.down`; the ground branch aims at the sword even when the engine selected shield defence. Ground shield defences need a shield contact and shield-arm pose. |
| CA-05 | **Data + rig: grip requirements disagree with the selected equipment.** Shortspear and Trident are one-handed in `ARENA_WEAPONS` but forced into two-hand grips, including when carrying a shield. Military flail is two-handed in the engine but given no second grip. | `pitsStageWeaponKind()` drops most handedness metadata; `profile()` (`pits-cine.js:45–49`) guesses from family/length. Pass the engine's handedness through; do not infer it solely from length. This is separate from the known rigid-flexible-weapon limitation. |
| CA-06 | **Rig: the support hand can leave a two-handed weapon.** Sampled sequences measured hand-to-visible-segment gaps up to 11.99 (spear), 17.58 (staff), 24.73 (greatsword). | `solve():110–114` picks an unreachable shaft point and lets `ik2()` clamp the hand away from it. When floor correction changes `w`, the earlier `dw` may also be stale. Constrain the grip to a reachable point on the actual rendered shaft, with an explicit release if the move calls for one. |
| CA-07 | **Rig + renderer comparison: Quarterstaff contacts can occur beyond the drawn staff.** Chest wound fixture: contact 110.87 along the weapon, visible end at 102; an 8.87 gap. | `profile()` uses `reachAt=.85` of 132, but `psPaint()` (`pits-stage.js:576`) draws the staff from −30 to `len−30`. Share rendered weapon extents with aim/contact calculations. Existing contact tests measure the longer theoretical Hn→tip line. |
| CA-08 | **Live path + code: weapon effects complete without their strike/injury cue.** Observed attack 74/100, failed enemy parry 59/25; Damage Weapon rolls 5 against Greatsword AP 6, then returns to the action menu. The parser also ignores longer-reach `Weapon struck`, `Withdraw Impale` and `Withdrawal injury`. The live withdrawal caused the finishing 4 HP injury (leg −1→−5), but the final Last exchange/readout retained the initial 6 HP Impale hit. | `resolveHit()` (`practice-combat.html:3552`) substitutes `Weapon struck` for a body hit. Withdrawal uses differently titled entries (`:3768–3786`). `pitsStageCue()` recognizes none of these, so their own contact/injury is missing even though later wound/end cues can play. Add explicit weapon-contact/withdrawal resolutions and outcome narration using the current style, and release the held exchange. Do not invent body damage for Damage Weapon. |
| CA-09 | **Rig: replay does not reliably repeat the live choreography.** With identical pair seed 2,000,000, live attack/parry intents followed by a head finishing blow select `spin`; replay with the same result selects `over`. | `fighter():238` creates a new random seed when replay reconstructs the figures; the tape does not preserve it. Even with the same seed, live `intent()` consumes RNG calls that replay skips, and `flow` discards chambers. Persist presentation choices/seed with a stable per-exchange schedule so replay can shorten holds without changing the move. |
| CA-10 | **Rig: the fallen head intersects the floor.** Sword head finish, seed 1,000,000: minimum head centre y=2.01, head radius=13; bottom is about 10.99 below ground. | Poses/IK protect joint centres and weapon tips, not the rendered head radius (`pits-cine.js:59–118`, flat/face poses). Existing tests only require head centre ≥−1. Correct floor clearance for the visible head while retaining the collapse. |
| CA-11 | **FX VM reproduction: grounded blood particles repeatedly extend their lifetime.** A nominal 600 ms particle is still registered at age 12,000 ms, with expiry extended to approximately 12,900 ms. | `pits-cine-fx.js:127` repeats `life=max(life,age+900)` on grounded frames. Set a landing/fade deadline once. Particle count is capped around 260, so this is stale particle work/slow fading, not an unbounded memory-leak claim. |
| CA-12 | **Live: Pin Weapon has a lasting rules restriction but no corresponding visual constraint.** In the broadsword bout, the chip/Still pinned line disabled attacks/parries correctly, but the fighters and their weapons separated freely; Regain Footing also played while the pin remained. | `pitsStageLook()` does not carry pinned gear/holder; the cue parser and cinematic layer do not consume it. Carry the pin state into presentation and keep the selected equipment constrained, or visibly release it only when the engine does. No new overall animation direction is needed. |

## Source-backed concerns awaiting targeted live reproduction

Severity 3 until visually reproduced; do not present these as live passes or confirmed player reports.

| ID | Concern and evidence | Targeted check |
| --- | --- | --- |
| CL-01 | **Hand-switch target mapping becomes stale.** `psMotionFigs():1141` retains the rig without updating `m.swap`; `partAt():312` uses it for anatomical arm targets, while `psPaint():547` uses the latest `L.swap` to label the drawn arms. | Switch hands, then choose each arm as a target; compare contact, wound colour and disabled-arm result. Update metadata in-place rather than rebuilding/snapping the pair. |
| CL-02 | **Failed parry intent can disappear from the resolved blow.** The driver knows `react` and `reactGrade` but passes neither to cinematic `blow()` (`pits-stage.js:1300`). Only the successful block outcome causes a ward. In replay the earlier held intent is skipped too. | Miss a weapon and shield parry against a hit; verify a visibly attempted failed interception in live and replay. Preserve the existing hit choreography. |
| CL-03 | **Afterimages always carry a straight weapon and ignore disabled-arm pose options.** `drawGhosts():209–217` samples raw joints and unconditionally draws Hn→tip, independent of disarm, lodging, shield strike or weapon family. `show=on || speed>1.05` can also bypass reduced-motion suppression. | Disarm, leave an Impale weapon, then move fast; verify no phantom blade, healthy-arm ghost, or reduced-motion ghost remains. Fix the ghost equipment/state mask. |
| CL-04 | **Accidental Injury has no self-hit cue.** It updates HP with `impact.target=actor`, but its title does not match the hit parser (`practice-combat.html:3504`; `pits-stage.js:16–55`). | Trigger the defensive effect on a fumble and check that self-injury is drawn on the correct fighter before wound/end consequences. |

## Reporting gap

`PitsReport.buildOf()` (`pits-report.js:19`) omits `pits-cine` and `pits-cine-fx`; `pitsFightRecord()` still identifies itself as `pits-spring-1` and stores no cinematic seed/choices. Include the active stage, both cinematic asset stamps and reproducible presentation choices. Otherwise a report can preserve dice without preserving the visual bug.

## Already known — not counted as new findings

Rigid flails/whips/nets; only two ground poses; no dedicated Trip/Disarm/Press Advantage moves; outdated earlier-stage `tests/visual/` scripts. The owner's 2026-11-15 clarification explicitly identifies these. CA-01/02/05 address incorrect state or equipment inside those areas, not requests for additional pose variety or a new style.

## Repair order and checks

1. CA-01–04: engine prone state, visual down state and HUD must agree after every outcome, including no HP loss, shield defences and Press Advantage. Check both fighter roles and live/replay.
2. CA-05–08: carry handedness, equipment extents and selected tool to every contact; use shield geometry for shield contacts and a weapon contact for weapon damage.
3. CA-09/12 and CL-01–04: reproduce the actual fight, preserve lasting states, then verify hand transfer, failed defences, self-injury and afterimages.
4. CA-10/11: floor clearance and particle cleanup. Add narrowly targeted regression checks for the failures; the 2,695 finite-coordinate cases are not substitutes for these assertions.

Minimal rig setup for reproducing the measurement cases:

```js
const C = require('./experiments/pits-cine.js');
C.keep(0);
Math.random = () => 0.001; // pair seed 1,000,000
const sword = {kind:'blade', len:92};
const M = {
  a:C.fighter('a', sword, false, {shield:true, shieldKey:'heater'}),
  b:C.fighter('b', sword, false, {shield:true, shieldKey:'heater'})
};
const gap = C.gap(sword, sword, 'long');
for (const m of Object.values(M)) C.place(m, 0, gap, 'guard');
// CA-01: C.blow(M,'a',100,{outcome:'armour',loc:'rleg',lost:0,fall:'sit'}).
// CA-02: C.fall(M.a,100), then parried/armour/miss blow after that ends.
// CA-03: blow with strike:'shield'; compare each contact to joints(a,c.t).oHn.
// CA-04: fall(M.b,100), then full-ward/partial-ward with shield:true.
```

Session readiness **13/14**; feature completeness **8/8 built, 8 closed**, unchanged. This audit adds presentation defects and follow-up checks; it does not reopen an audited rules subsystem.
