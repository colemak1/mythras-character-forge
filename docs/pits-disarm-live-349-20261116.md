# Pits #349: defensive Disarm — 2026-11-16

Read `AGENTS.md` and the current `HANDOFF.md` first. Desktop Chrome, default deployed cinematic page: https://colemak1.github.io/mythras-character-forge/experiments/practice-combat.html. Disposable Local PvP practice fighters; no saved character or campaign changed. Guidance on, automatic dice on, standard pace.

Deployment verified against main `2fc47a7` (#349): page scripts `pits-cine.js?v=5cb999394c`, `pits-stage.js?v=9268f3d623`.

| Check | Result | Severity | Evidence |
|---|---|---|---|
| Parry earns Disarm; sword stays in hand through the parry and leaves once at the bind/wrench | BLOCKED — visual timing unverified | 3 | Won the requested defensive Disarm in round 1. Second Player's Broadsword attack 65/20 failed; Kethan's Broadsword parry 54/100 succeeded. Chose Disarm Opponent. Resistance 12/20 succeeded but lost the opposed comparison; weapon landed 1 m away. Final plate said Unarmed / Disarmed. Screenshot capture timed out during the animation (`Page.captureScreenshot timed out`), before returning any frames of that sequence. This proves the gameplay outcome, not the number or timing of weapon throws. |

No application failure or visual pass is claimed. Per the project agreement, recorded the capture block once and did not retry the check. The single-throw choreography remains a Known limit for the owner to observe on desktop; phone checks are out of scope by the owner's current decision. Earlier accepted checks were not repeated.

Validation: all 81 root `tests/*.cjs` files completed without failures. These checks do not replace the blocked live animation observation.

Session readiness **13/14**; feature completeness **8/8 built, 8 closed**, unchanged. This report adds the successful gameplay setup and an explicit visual-verification limit for #349. No production code changed.
