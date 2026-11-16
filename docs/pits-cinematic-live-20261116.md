# Pits cinematic fixes: deployed check — 2026-11-16

Read `AGENTS.md` and `HANDOFF.md` first. Tested the default cinematic page at https://colemak1.github.io/mythras-character-forge/experiments/practice-combat.html in desktop Chrome, 1363 × 936. Disposable Local PvP practice fighters only; no saved characters or campaigns changed. Guidance on, automatic dice on, standard pace.

Deployment: the page's script URLs matched main `32ac97c` (#342–#345): `pits-cine.js?v=4ece83f1c5`, `pits-cine-fx.js?v=1e05978238`, `pits-stage.js?v=c5eb3b9ddb`.

| Requested check | Desktop | Phone | Evidence / limit |
|---|---|---|---|
| 1. Trip won on a parry: fall and Prone chip | PASS | BLOCKED · S3 | Greatsword duel, round 2: Second Player attack 72/20 fails; Kethan parry 7/100 is critical; Trip resisted with Evade 74/50 fails. Second Player falls into a seated ground pose and the settled plate shows Prone. Checked visual state agreement; exact first-frame chip timing was not measured. |
| 2. Pinned weapon stays held down until freed | PASS | BLOCKED · S3 | Same exchange also earns Pin Weapon. Sword is held down beside the floor; Still pinned remains visible and Attack is disabled. Escape 41/53 versus 49/53 fails: sword stays down. Round 3 escape 10/53 versus 94/53 succeeds: pin chip disappears and sword returns to a raised guard while the fighter remains prone. |
| 3. Impale, withdrawal injury, and withdrawal as deck result | FAIL · S2 | BLOCKED · S3 | Shortspear + Heater versus Dagger. Impale attack 54/67; location roll 2, Right Leg; damage option B = 7; 8 HP lost after modifier/armour, leg 5 → -3. Keep hold, then Withdraw Embedded Weapon; opponent allows withdrawal. Brawn 53 succeeds; withdrawal inflicts 4 HP, leg -3 → -7, ending the bout. Spear returns to hand; red injured leg and blood are drawn; arena result says “Wounded by the withdrawal · Right Leg” and “4 HP lost as the weapon is pulled out.” **Bottom deck still lists the original Impale exchange and its Last result remains the original 8-HP wound after the bout ends. Withdrawal and its injury are missing from that exchange list.** Continuous pull-out motion was not fully captured. |
| 4. Shortspear + shield one-handed; greatsword both hands on hilt | PASS · stance only | BLOCKED · S3 | Shortspear has one weapon hand and the other hand at the Heater. Greatsword stance has both hands behind the crossguard on the hilt. This is a stance check, not every animation frame. |
| 5. Finish, Replay, same swings as live | BLOCKED · S3 (partial) | BLOCKED · S3 | Replayed the injury-ended spear bout and the greatsword bout (conceded after the pin escape). Both replays reached the result again. Captured greatsword cuts/parries and the Trip in replay, but live/replay sampling was insufficient to certify matching swing choices throughout. Replay completion passes; same-swings acceptance remains unverified. |

Additional desktop observation, **S2**: after the initial Impale's disabling leg wound, the Prone chip appeared, disappeared during the next decision, then returned without Regain Footing. The corresponding captured figure was briefly crouched rather than seated. This was observed once; no deterministic reproduction or cause is claimed.

Known limits: this session supplied a desktop cloud browser, no real phone and no exposed phone emulation control. All phone rows are unverified, not application failures. Owner with a phone can complete those checks. Sparse screenshots cannot establish frame-perfect chip timing or identical replay choreography; no simulated engine outcomes were substituted for live play.

Validation: all 80 root `tests/*.cjs` files completed with no failures. No production code changed. **Next: Claude** — fix the withdrawal deck result and investigate the transient prone presentation; preserve the approved look. Retain phone and exact replay verification as Known limits.

Session readiness **13/14**; feature completeness **8/8 built, 8 closed**, unchanged. This batch adds desktop evidence and one confirmed requested-check failure; it does not grant full cinematic acceptance.
