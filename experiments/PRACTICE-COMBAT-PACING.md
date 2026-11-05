# Practice Combat pacing — November 5, 2026

Walkthrough: Normal Gauntlet with the opponent winning initiative; checked a missed attack, an undefended successful attack, Disarm Opponent, resistance, hit location, damage, and weapon recovery.

| Stop examined | Finding | Updated behavior |
| --- | --- | --- |
| Settled die, then calculation of the same roll | Duplicate clicks with no decision | Present together automatically |
| Each fighter's initiative calculation | Turn order is the useful result | Both rolls advance to the order summary |
| Initiative summary before an automatic opponent action | Useful time to learn who acts first | Continue before the opponent starts |
| Attack result before defense choices | The defense choice already stops progression | Reveal choices without Continue |
| Special Effect award before selecting an effect or resistance roll | Selection/Roll already stops progression | No additional Continue |
| Hit-location die and named location | The location matters; the extra click does not | Show the named location with the die |
| Damage and its breakdown | HP loss and wound outcome matter | Show the outcome automatically; keep it in Last exchange |
| Completed result before another automatic opponent action | Useful; otherwise the new action overwrites the result | One Continue at the action boundary |
| Pick Up Weapon before another player action | The next action already waits | Show action choices automatically |

Changes: Standard pace replaces the per-event Manual pace. Rolls and recorded results advance with a short reading delay. Continue appears only at a boundary before a new automatic action, and names the fighter acting next. Quick pace and Show results remain available. Result narration now takes priority over the generic rolling caption once the result appears.

Validation: Practice Combat UX tests cover automatic roll/result playback, hidden future events at a checkpoint, real-choice handoff, Quick pace, skip behavior, matching dice/results, and an actual opponent-first initiative capture. Combat-turn and effect-selection suites also pass.

Live checks to repeat: roll initiative; let the opponent act first; verify one Continue after the order summary and direct access to defense choices after the attack. Resolve a hit and verify there is no Continue for each die or calculation. Read Last exchange before choosing the next action.
