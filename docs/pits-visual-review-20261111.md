# Pits visual acceptance and Claude brief — 2026-11-11

Scope: owner-requested comparison of the attached `the-pits-mythras(1).zip` (single HTML prototype), the v0 link, and deployed arena. Read AGENTS.md and HANDOFF.md first. Source inspected at main c22f2b3 (merged #294). Desktop live browser viewport about 1348 × 926. No production code changed.

## Recommendation

Owner direction, 2026-11-11: make the battle screen full screen and remove the top Sit’ota/site navigation bar. Keep Exit Battle visible so the player can return to the site. Use the recovered height to show the active decision and fighters together.

Keep Forge's combat engine and Stone theme. Use the prototype's spatial hierarchy: player left, foe right, dice top centre, fighters in the middle, concise commands and outcome below. Rebuild the animation choreography around resolved exchange data. Do not copy the prototype's combat rules: its own limitations explicitly admit missing size-based parries and unverified weapon/Impale rules.

## Live checks

- PASS: start Sword v Spear; manually roll initiative and attack; failed attack resolves without damage; opponent priority has an explicit Continue.
- PASS: opponent attack 27/46 success; choose weapon parry, manually roll 88/67 failure; opponent selects Impale, rolls location and damage. Left Leg loses 5 HP: 7 damage minus 0 parry minus 2 armour. Location panel shows 1/6, figure's leg turns red, Impaled chip appears. This confirms agreement between displayed arithmetic, state and location colouring, not an independent sourcebook audit.
- PASS: choose Allow withdrawal; opponent Brawn 57/49 fails and weapon remains lodged; player's next turn becomes available. No crash encountered on this path.
- Automated: `node tests/pits-stage.cjs` 13/13 and `node tests/pits-arena.cjs` 9/9 pass. These establish model/cue mapping and engine independence; they do not establish believable contact geometry or browser animation timing.
- RESOLVED access limit: v0 shared chat's embedded preview requires team membership, but the owner subsequently supplied https://the-pits-mythras-duel-4ed5d786a7.vercel.app/ and its playable prototype was inspected directly. The chat refers to a differently named earlier Yomi ZIP; do not assume every linked revision equals the attachment.
- Known limits (Severity 3): no full live bout, successful full/partial parry, Evade, human Special Effect picker, disarm, entangle, end-state, saved-character or phone acceptance in this focused run. No sourcebook supplied here; no new rules rulings. No saved characters/campaigns created.

## Findings and fixes

| ID | Evidence and severity | Required change |
| --- | --- | --- |
| VIS-01 | FAIL, Severity 2, live: after the spear lodges in Kethan's Left Leg, the foe still holds the spear in the normal ready pose. The withdrawal also fails, leaving the same contradiction. `pitsStageLook` ignores `impaledWeapon` and `impaledWounds`. | Draw one weapon anchored to the actual struck limb while lodged. Model held versus abandoned state and restore the hand weapon only when the engine confirms withdrawal/recovery. Add visible entanglement based on engine state too; that extension is requested, not live verified. |
| VIS-02 | FAIL, Severity 2, code: `psRunCue(hit)` always uses the same strike pose and lunge. `cue.loc` positions the reticle/burst but does not aim the weapon. | Aim hand, weapon tip and follow-through at the resolved location. Head, torso and leg strikes need distinct heights; sword cuts, spear thrusts and shield strikes need distinct motion. Contact and damage number must coincide. |
| VIS-03 | FAIL, Severity 2, code: fully parried branch sends the attacker through the same `hit` recoil used for injury; clash effects use defender weapon tip rather than a verified intersection. The hit branch also calls a zero-HP result “Armoured” regardless of how parry/ward/armour stopped it. | Give full parry its own weapon/shield contact and recoil, away from the body. Carry actual blocked-by and damage breakdown into presentation. Partial parry must show deflection followed by only the residual hit. Zero HP loss must not imply an injury or invent its cause. Exact fully parried live animation remains unverified here. |
| VIS-04 | FAIL, Severity 2, code: attack cue immediately banners “Critical hit” on an attack-roll critical, before defense and final damage. | Say “Critical attack” at the roll stage; reserve hit/injury feedback for the resolved outcome. Similarly, a successful defense roll alone must not decide the animation outcome. |
| VIS-05 | FAIL, Severity 2, live: arena occupies most of the desktop height. Action/reaction controls and outcome are below it; screenshot shows the lower deck clipped. Reaction prompt CSS also limits it to 150px with internal scrolling. | Fit stage, active decision and short outcome together at 1280×800 and 1440×900. Keep dice top centre; keep the current decision visible without scrolling away from fighters. Show optional help in expandable details. Chronicle should span the width below, matching owner's prior preference. Preserve explicit opponent-priority progression. |
| VIS-06 | FAIL, Severity 2, live: populated round strip extends beyond its centre box toward the fighter cards. `.strip` has nowrap and a constrained max-width but no useful wrap plan for initiative. | Put initiative on a compact second row, or otherwise contain the strip within its lane. Test long names and simultaneous initiative. “Matched reach” also reads oddly beside Medium/Long weapons; use “Engaged” or similarly neutral wording when the optional reach restriction is inactive, without altering rules. |
| VIS-07 | FAIL, Severity 2, live: while the foe's next attack rolls, the outcome section initially retains “Kethan Voss misses” under a NOW line naming the new attacker. After the Impale, the prominent tray reverts to the earlier failed parry roll. | Separate labelled Previous exchange from Current exchange. Clear current outcome at the new exchange boundary. Persist the newest relevant result, including location/damage and arithmetic, instead of reverting to an earlier skill roll. |
| VIS-08 | Severity 3, code coverage gap: stage cues parse English log titles and body strings. Missing cues include lodged/withdrawn weapon and Entangle. Long weapons default to a spear drawing; weapon-hand choice is not represented in pose geometry. | Add explicit structured presentation events or a normalisation layer from authoritative engine results, with exchange ID, actor/target, tool/hand, defense outcome, location, reductions, HP change and conditions. Keep prose logs as output. Validate weapon drawing against actual engine keys; staff/net/whip must have recognisable representations. |

## One Claude implementation batch

1. Fix misleading outcomes and lodged weapon state (VIS-01–04), then fit the decision layout and result hierarchy (VIS-05–07). Preserve engine rules, saved data and existing prompted rolls. Auto-roll remains opt-in.
2. Use the prototype's animation rhythm: anticipation, contact or avoidance, consequence, settle. One coherent exchange; avoid a second fake strike when resolving the same blow. Red persistent body-part colour means actual wound state. Use neutral deflection/armour feedback for no injury.
3. Make replay cancellation safe: Show results, fast pace, exit, reset and a new bout must cancel old animation/timers/effects and snap to the authoritative state. No delayed blood, duplicate weapons or old banners. Verify this in the browser; not confirmed as a live failure here.
4. Add deterministic browser scenarios for: full weapon parry; shield parry; partial parry; armour-only zero damage; miss; successful/failed Evade with engine prone state; blocked critical; head/torso/leg hit; Choose Location; Trip and stand; Disarm/recovery; Impale held/abandoned/withdrawn/failed withdrawal; Entangle/free; victory/defeat. Assert matching HP/AP and outcome labels, plus screenshots around actual contact, not only settled poses. Prioritise desktop; mobile was deferred in the shared v0 conversation.
5. Follow AGENTS.md tests, asset stamping, release notes and merge workflow. Existing passing tests are useful but do not cover these visual failures.

No Severity 1 established in this focused run. Session readiness remains 13/14; feature completeness 8/8 built, 8 closed. This batch identifies presentation fixes; it does not reopen closed rules audits.

Next: Claude — implement this presentation batch and provide deterministic visual evidence before the next live check.

## Playable prototype follow-up — 2026-11-11

Owner supplied https://the-pits-mythras-duel-4ed5d786a7.vercel.app/ after the first report. Direct desktop visual check at about 1363×936:

- PASS, layout reference: small fight-only toolbar, corner fighter plates, top-centre dice, centre stage and complete lower command deck all fit in one desktop viewport. This strengthens the full-screen recommendation. Recreate these proportions using Stone tokens; do not require the prototype's teal/orange theme. Reduce header/spacing overhead before shrinking the fighters.
- PASS, interaction reference: switched from Sword v Spear to Spear v Sword, enabled auto-roll for this disposable prototype session, attacked, selected Choose Location, applied it, and picked left leg from the body map. Attack 44/66 succeeded; foe parry 91/64 failed. Damage 2+1 minus armour 2 = 1; leg 6→5. The leg changed red on both the map and the fighting figure. Special Effect cards and the target picker are clear visual references. This is presentation testing, not validation of the prototype's rules.
- FAIL, Severity 2, directly observed in prototype too: the chosen left-leg hit uses a horizontal thrust at torso/hip height, while the target marker and red wound appear down on the leg. VIS-02 is shared by both versions. Preserve the readable staging and motion rhythm; rebuild contact geometry rather than copying animations unchanged.
- FAIL, Severity 2, prototype identity: after switching to Spear v Sword, the opponent is still named “Marek the Long Spear” while carrying a longsword. Production opponent names/descriptions should agree with actual equipment.
- Prototype layout choice: chronicle occupies the lower right column. The owner's earlier preference is full-width chronicle below; retain that requested arrangement while keeping current decisions/outcome compact and visible.
- Limits: this follow-up exercised a targeted attack/Choose Location path, not a complete bout or all animation branches. Existing Forge-specific findings and untested paths remain as documented above.

Claude: use this directly accessible prototype as the visual reference alongside the attachment. Preserve its viewport fit, restrained toolbar, clear Special Effect cards, body-map picker and concise arithmetic. Correct its targeting geometry and keep all production outcome decisions in the Forge engine.
