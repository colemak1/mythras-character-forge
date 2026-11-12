# The Pits: continuous combat animation batch (2026-11-12)

Implements the owner's brief ("continuous combat animation", 2026-11-11). Rules, stick figures and layout are unchanged. Tests: `tests/visual/pits-flow.cjs` (acceptance), `tests/pits-stage.cjs` (arrangement, records, cues), plus the existing visual scripts.

## What was built

| Brief | How |
|---|---|
| 1. Resolve the full exchange before the swing | `pitsStageArrange` (pure) holds a blow back while the engine waits on a person for that exchange (Endurance, resist rolls, choices). Dice play at once; the blow and everything it causes are played together once the exchange is resolved (or the next attack begins). Rolls and choices stay manual and in order. `pitsStageBeat` gives a blow one record (Press Advantage before it; wound, disabled limb, dropped weapon and the end of the fight after it); those later entries have no motion of their own. |
| Plates and stage follow presentation time | Held: `V.hold.shown` is shown until the blow plays. Blows: the plates, wounds, chronicle line and weapon state change at the contact moment (`pitsStageOnContact`), not when the engine logged it. |
| 2. Decisions pause the scene | `PS.paused` while the engine waits on a person or a blow is held: figures, trails, weapon motion, particles and the camera push all stop together and resume from the same moment; Roll and the interface stay live. Text overlays finish fading. A cut-short playback (Show results, Stop replay) still snaps to the real state; a finished one never resets poses. |
| 3. Continuity | No motion ends by sending a fighter to idle. Recoveries go to a ready stance (between idle and guard); a figure relaxes to idle only after a real lull (1.6 s), never during dice. Joint speed is carried into the next motion as a short overshoot (visible braking). Playback is paced by the animation (each beat starts when the last motion is done), not by fixed timers. |
| 4. Movement | Joints lead and lag (legs and hips first, then shoulder, elbow, weapon); strikes accelerate into contact; contact waits for the strike to arrive (no fixed timer); supporting feet stay planted and step (one at a time, with a small lift) when a pose carries them out of reach; a failed parry shows the guard beaten aside, distinct from a full or partial block, a miss, an evade and a wound. |
| 5. Press Advantage | Own cue and paired stance (`press` / `cover`), named briefly. It plays after the contact it belongs to, then holds exactly while the engine's `pressedTurns` is active, then releases. No range change, damage or extra attack is drawn; the weapon only sways as a threat. |
| 6. Finishing consequences | From the engine's record only: a disabled leg buckles then goes down; a disabled arm hangs limp (the engine's `disabled`, not low hit points) and the dropped weapon leaves the hand at the blow; incapacitation flows from the contact into the collapse (no recovery, no second hit); a concession is a bow and lowered weapon; blood loss or exhaustion collapses in place. Nothing is inferred about severing or death. |

## Confirmed bugs (found by reading the code or by tracing a recorded fight)

1. **Compulsory idle resets.** Every outcome path ended in `PS_POSE.idle`; `psPlay` replaced the active motion from wherever it was. Fixed (ready stance, continuation, relax only after a lull).
2. **Pose drift and snaps while waiting.** The end of a playback ran `psSettle`, and with no motion playing every figure eased to its rest pose at once. Fixed (pause, no settle on a finished playback, lull).
3. **Results shown early.** The plates and the stage read the entry's state at the start of a beat, before the contact; the engine's later state (wounds, dropped weapon) showed during the windup. Fixed (contact flush, held view).
4. **Disconnected finishing blow.** The hit played, then the Endurance dice, then a separate end cue played a second generic hit and a collapse (recorded tape order: hit entry, Endurance dice, wound, end). Fixed (record; dice first).
5. **Duplicate impacts.** The finishing blow produced two hit reactions (the blow, then the end cue's own). Fixed with the record.
6. **Fixed-timer contact.** Contact was timed by a 135 ms guess after a 130 ms strike. This only showed once the strike accelerated into contact (scenario `07`, `09`, `11`, `13` measured the tip 28 to 99 px from the struck part); contact now waits for the strike frame to finish.
7. **Banner left on screen.** It was cleared only by a settle. It now clears itself when its animation ends.
8. **Limp arm on low hit points.** A resisted Serious Wound drew a limp arm and no weapon. The stage now follows the engine's disabled arm and dropped weapon.
9. **A skipped cue when a blow was held** (found while building this): the stage marked held entries as already seen. Fixed and covered by `pits-flow.cjs`.

## Suspected, not confirmed
- Timer races between the presentation timers and the stage's own waits: removed by pacing on cue completion, but no race was reproduced before the change.
- Skipped cues in a replay (entries filtered by `pitsStageReplayable`): no skipped blow was observed; the scenario and replay scripts pass.

## Remaining limits
- Motion quality was judged from recorded timelines, numbers and filmstrips, not by watching it live. The owner needs to judge the feel; say which beats are off.
- Planted feet are a two-bone solve with a stepping rule, not an authored walk: expect plausible steps, not animation-studio footwork.
- Press Advantage is verified from engine state and its own cue; a naturally chosen Press Advantage in a live fight (it needs a won exchange and the effect picked) was not driven end to end. Overextend Opponent and the other effects keep their old look.
- Feints are not drawn; the pressing figure's weapon only sways as a threat.
- While a Special Effect or Endurance roll is open, the engine's own roll label ("Endurance · wound to Chest") still names the location; the picture does not.
- The log keeps the last 110 entries (unchanged), so a very long fight's chronicle list can lag during a replay.
