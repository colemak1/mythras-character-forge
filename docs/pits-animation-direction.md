# The Pits: animation direction (2026-11-12)

Goal (owner): keep the stick figures; make them fighters with balance, momentum and intent, so that a replay reads as one continuous fight. Decisions pause the scene; the resolved exchange then plays without interruption, and each movement starts where the last one ended.

**Watch it:** `experiments/pits-choreography.html` (on the site after merge: `/experiments/pits-choreography.html`). Five sequences, broadsword against dagger, with pause, frame step, quarter speed, a scrub bar, weapon paths and planted feet. A filmstrip of the reference sequence: `docs/pits-visual-checks/movement-study-exchange.png`.

## Why the current movement looks wrong

Recorded from the live Pits frame by frame (sword against dagger, a parried attack and a hit):

1. **Every strike is a rigid pole.** The aim solver straightens the arm and puts the weapon in line with it, so a sword cut is a straight-arm poke. The blade goes from upright to level in about 60 ms with no arc, and stops dead at the target: no follow-through.
2. **The body flies without legs under it.** To reach, the whole figure is shifted up to 260 units in 130 ms with the torso leaning as far as 70 degrees and both feet trailing behind. Nobody could stand in those poses. The foot rule steps the feet after the body has already gone.
3. **The stances are standing, not fighting.** Straight legs, feet close together, the same stance for every weapon, the dagger held straight up.
4. **A parry does not redirect.** The blades overlap and the sword carries on along the same line.
5. **Reactions are planks.** A struck fighter tilts back as one piece and slides; no part leads, no foot catches the weight.
6. **Dead holds and rubber bands.** After contact the attacker is frozen fully extended for about 400 ms, then slides back to the same ready stance at its home spot.

These come from the approach, not from tuning: a library of whole-body poses, blended on one curve, hung from the hips. Better easing cannot fix it.

## The movement language

- **Stance and balance.** Knees bent, feet a stride apart, weight between them. Each weapon has its own guard (sword: side on, point at the face, empty hand back; dagger: lower and squarer, blade forward, empty hand up). Any pose the scene can pause on has both feet down and the weight between them.
- **From the ground up.** A foot stays where it is until a step moves it. The pelvis carries the weight between the feet. The body can only be where the feet allow, so reach comes from footwork: the sword's attack is a short advance and a passing step, not a slide.
- **Order of the body.** Legs and hips go first, the chest follows, then the hand, then the blade. In the cut the hips have done most of their travel while the blade is still behind the shoulder. On a parry the order reverses: the blade arrives first and the body settles under it.
- **Weapon weight.** A cut has five parts: load (slow, weight back), drive (hips, blade left behind), strike (the fastest moment, into contact), contact (a short hold), and what the blade does next, which depends on what it met. Stopped by a parry it is turned down and falls short of the body. Missing, nothing stops it: it finishes its arc, the body goes with it, and it is carried round onto the shoulder. Landing, it is drawn through. A thrust is different: a short gather, then a straight line, and it comes back out along the same line.
- **Interaction.** Both fighters are written against one contact moment. The parry is aimed at the point where the cut will be; the defender's knees and elbow give when it lands. The counter goes in while the attacker is still trying to get the sword back, which is why it lands.
- **Continuity.** No phrase ends in the guard it began in. A hit fighter ends closed over the wound, the one who missed ends in a high guard, the winner of an exchange ends with the point in line. Recovery belongs to the start of the next movement: the pause comes at the end of the follow-through, and what happens next decides how the fighter gets out of it.
- **Timing.** Load about 300 ms, drive 300, strike 175 with the blade's own snap in the last 60, impact hold 70 to 110 ms, follow-through 200, recovery 500 to 700. Slow, fast, still, slow. The impact hold is the only stillness, and nothing is hidden behind shake, flashes or particles (the study page draws one small mark at a contact and nothing else).

## The structural changes (three)

All three are in `experiments/pits-motion.js` (pure, no page or rules access; tests in `tests/pits-motion.cjs`).

1. **A rig driven from the feet and hands, not from the hips.** Channels: two foot positions, pelvis position, two spine angles, head, weapon hand and off hand measured from the shoulder, blade angle. Legs and arms are solved (knees and elbows only bend the way they can). This replaces `PS_POSE`, `pitsStageGeom` and the after-the-fact foot rule.
2. **A track per body part instead of one blend per pose.** Each part has its own keys and its own curve, so parts can lead and follow, hands can swing in arcs or travel straight, and a step is a real event with a start and a landing. This replaces `psPlay`, `PS_LAG` and the momentum overshoot.
3. **An exchange is one function of time for both fighters.** Phrases (cut, parry, redirect, thrust, reaction, retire, collapse, press) write keys against a shared contact time, starting from the pose the fighter is in. Because the picture is a function of the clock, pausing for a decision is stopping the clock, a replay is running it again, and any moment can be inspected. This is item 11 of `pits-one-screen-plan.md` (one timeline per exchange).

## Demonstrated, and not

**Demonstrated** (study page, broadsword against dagger, all starting from guard):

| Sequence | Shows |
|---|---|
| Attack, parry, counterattack, reaction, recovery | The reference. Includes the decision pause after the redirect (tick "Stop where a decision would be made"). |
| A miss | Follow-through and a recovery along the blade's own path. |
| A damaging hit | A late parry beaten, the cut landing, the body's answer, the stance regathered. |
| Press Advantage | The attacker stays on the blade with the point in the face; the defender stays covering; held, then released. No blow, no ground taken. |
| A fight-ending injury | The fall comes straight out of the contact and stays down. The winner lowers the sword. Nothing is implied beyond "out of the fight". |

The tests hold these to the rules above: limbs never over-stretch, planted feet never slide, nothing jumps between moments, blades meet at the contact, a miss touches nothing, pause poses are balanced, fighters end back at measure, no phrase returns to its opening guard.

**Not demonstrated, still to be applied:**

- **Nothing is wired into the Pits.** The live stage still uses the pose library. The stage's record of an exchange (`pitsStageBeat`, `pitsStageOutcome`) already carries what a phrase needs (who, tool, outcome, location, damage, consequences); it has to choose phrases instead of poses, call `pitsStageOnContact` at the contact time, and stop the clock at the pause key.
- **Starting from an arbitrary pose.** The phrases read the current pose, but every demonstration starts from guard. Chaining many exchanges (and the whole-fight replay) from wherever the last one ended is untested, as is the dagger attacking first from measure.
- **Other phrases:** thrusting and two-handed weapons, shields (parry and bash), other hit locations (the aim is general; the body reactions are written for the chest only), evade, trip, disarm, stand up, concede, a disabled limb, a dropped weapon, range changes, left-handed fighters, impaled and entangling weapons.
- **Judged from stills and filmstrips,** not watched at speed by a person. The owner's eye is the test.
- **Known compromises.** At the current spacing (300 units) a sword needs an advance and a passing step to reach; tightening the spacing would make shorter attacks possible (a layout choice for the owner). The scene is flat, so when the dagger steps in past the lowered sword the leg crosses the blade.

## For Sonnet: routine defects in the live stage

Fix only if the owner decides to keep the current stage running while the new movement is applied; all are in `experiments/pits-stage.js`.

1. **Confirmed (recorded frames): a partly parried blow shows its wound early.** The struck part turns red at the guard contact, about 250 ms before the blade reaches the body. `psEmit('contact')` calls `pitsStageOnContact` for the first of the two contacts (`kind:'deflect'`). Flush only on the body contact; add a case to `tests/visual/pits-flow.cjs`.
2. **Confirmed (code): three motions still end in the idle stance,** against the no-idle rule: the step-in in `psSetSpacing`, "Stays up" in the trip cue, and the stand cue. Use `psReady()`; extend the idle check in `pits-flow.cjs` to these.
3. **Suspected (code, not reproduced): a pose snap before a blow.** `psResolveBlow` sets the defender straight to its rest pose when no motion is playing (`def.cur={...psRest(def)}`), which can jump a figure that was holding a lull pose.
4. **Housekeeping:** the study page is not in `scripts/stamp-assets.py` (it loads its files without `?v=`). Add it to the stamped pages and to `tests/asset-versions.cjs` if it stays.
