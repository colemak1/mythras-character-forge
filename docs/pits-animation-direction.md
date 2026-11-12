# The Pits: animation direction (2026-11-12)

Goal (owner): keep the stick figures; make them fighters with balance, momentum and intent, so that a replay reads as one continuous fight. Decisions pause the scene; the resolved exchange then plays without interruption, and each movement starts where the last one ended.

**Watch it:** `experiments/pits-choreography.html` (on the site after merge: `/experiments/pits-choreography.html`). One fight of five connected exchanges (plus Press Advantage), broadsword against dagger, with pause, frame step, quarter speed, a scrub bar, weapon paths and planted feet; a button starts from any exchange. A filmstrip of the fight: `docs/pits-visual-checks/movement-study-exchange.png`.

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
- **From the ground up.** A foot stays where it is until a step moves it. The pelvis carries the weight between the feet. The body can only be where the feet allow, so reach comes from footwork: the sword's attack is one step of the front foot from a close measure, not a slide.
- **Order of the body.** Legs and hips go first, the chest follows, then the hand, then the blade. In the cut the hips have done most of their travel while the blade is still behind the shoulder. On a parry the order reverses: the blade arrives first and the body settles under it.
- **Weapon weight.** A cut has five parts: load (slow, weight back), drive (hips, blade left behind), strike (the fastest moment, into contact), contact (a short hold), and what the blade does next, which depends on what it met. Stopped by a parry it is turned down and falls short of the body. Missing, nothing stops it: it runs out low and short, the body is carried forward with it, and the point has to be lifted back up over the shoulder. Landing, it is drawn through. A thrust is different: a short gather, then a straight line, and it comes back out along the same line.
- **The weapon is held.** The blade's angle is the forearm's angle plus the turn of the wrist, and a wrist only turns so far (about 12 degrees one way, 120 the other). To move the blade the arm has to move. A blow lands with the weapon in line with the arm; a parry holds it across. (Added after the owner's first viewing: the blade had been a free channel and turned in the hand like a hinge.)
- **Interaction.** Both fighters are written against one contact moment. The parry is aimed at the point where the cut will be; the defender's knees and elbow give when it lands. The counter goes in while the attacker is still trying to get the sword back, which is why it lands.
- **Continuity.** No phrase ends in the guard it began in. A hit fighter ends closed over the wound, the one who missed ends in a high guard, the winner of an exchange ends with the point in line. Recovery belongs to the start of the next movement: the pause comes at the end of the follow-through, and what happens next decides how the fighter gets out of it.
- **Timing.** Load about 190 ms, drive 140, strike 150 with the blade's own snap in the last 60 (480 ms from stillness to contact), impact hold 70 to 110 ms, follow-through 200, recovery 500 to 700. Slow, fast, still, slow. The impact hold is the only stillness, and nothing is hidden behind shake, flashes or particles (the study page draws one small mark at a contact and nothing else).

## The structural changes (three)

All three are in `experiments/pits-motion.js` (pure, no page or rules access; tests in `tests/pits-motion.cjs`).

1. **A rig driven from the feet and hands, not from the hips.** Channels: two foot positions, pelvis position, two spine angles, head, weapon hand and off hand measured from the shoulder, and the wrist (the blade's angle from the forearm). Legs and arms are solved (knees and elbows only bend the way they can). This replaces `PS_POSE`, `pitsStageGeom` and the after-the-fact foot rule.
2. **A track per body part instead of one blend per pose.** Each part has its own keys and its own curve, so parts can lead and follow, hands can swing in arcs or travel straight, and a step is a real event with a start and a landing. This replaces `psPlay`, `PS_LAG` and the momentum overshoot.
3. **An exchange is one function of time for both fighters.** Phrases (cut, parry, redirect, thrust, reaction, retire, collapse, press) write keys against a shared contact time, starting from the pose the fighter is in. Because the picture is a function of the clock, pausing for a decision is stopping the clock, a replay is running it again, and any moment can be inspected. This is item 11 of `pits-one-screen-plan.md` (one timeline per exchange).

## Demonstrated, and not

**Demonstrated** (study page). The fight is one timeline: each exchange starts from the pose the last one ended in, and nobody returns to the opening guard between them.

| Exchange | Attacker | Shows |
|---|---|---|
| 1. Cut, parry, redirect | Sword | The compact cut on one step; the parry; the sword turned down beside its owner's front foot. **Decision pause.** |
| 2. Counter over the lowered sword | Dagger | A short step in and a straight thrust above the sword hand; the hit reaction; both step out to new guards. |
| 3. A cut that misses | Sword | Cut from the hurt guard; the defender gives a half step; the blade runs on and the rear foot comes through under the body. **Decision pause.** |
| 4. A thrust beaten upward | Dagger | The sword comes up under the thrust, blade first; the same lift is the load of the next cut. |
| 5. The cut that ends it | Sword | A riposte with no separate wind-up; the fall; the winner steps out and lowers the point. |
| Press Advantage (separate tab) | Sword | The attacker stays on the blade with the point in the face; held, then released. |

**Refinements of 2026-11-12 (owner's five points),** each held by a test in `tests/pits-motion.cjs`:

1. **Miss follow-through.** The hips never sink below a fighting stance; the rear foot steps through after the blade has passed; the pose ends on a base at least 55 units wide.
2. **Empty hand.** On guard it is carried in front of the ribs; in a cut it swings down past the hip and trails long behind as a counterweight; after a hit it comes back in front. It is never folded up behind the shoulder.
3. **Counter clearance.** The redirect drops the sword close to its owner; the dagger fighter's foot lands short of the point and the thrust goes in above the sword hand. Nothing of the dagger fighter comes within 25 units of the blade.
4. **Attack preparation.** The fighters stand 200 units apart (was 300). The cut is one front-foot step of 34 units, the hilt loads beside the head with the blade near upright, and the order is hips, shoulders, arm, blade.
5. **Collapse.** The blow takes the chest back past the feet with no catching step; the rear knee folds and the hips drop faster as they go; the front foot leaves the floor; seat, back, head land in turn. The dagger arm goes dead at the blow and is never raised; the empty hand lands last.

**The decision pause** is the clock stopped at the end of a follow-through: both feet down, weight between them, the sword still spent low, nobody reset. The next exchange is written from that pose, so resuming continues from it.

**Wired into the Pits (2026-11-12).** The live stage now draws its figures with this movement language; the pose library stays behind `?stage=poses` for comparison until the owner has judged the new movement at the table, and is then to be deleted.

- **One clock per bout.** The stage keeps a clock (`PS.clock`). A decision or a manual roll stops it (the scene is paused as one); a contact holds it for the hit-stop; nothing else moves the picture. Every cue writes phrases from the clock time, starting from the pose the figures are in (`PitsMotion.LIVE` in `pits-motion.js`; anything written for later is dropped first, so a newer cue takes over without a jump).
- **Phrases chosen from the engine's record.** `pitsStageBeat` and `pitsStageOutcome` give the outcome; `LIVE.blow` picks the phrases: the cut on a step, or the thrust on a short lunge; the parry and the redirect (full parry or ward), the parry held then driven through (partial), the miss with the defender's half step (evade, miss, fumble), the landed blow with the hit reaction (or a small give for armour or no damage), and the collapse (a defeating blow, or a leg that goes). `pitsStageOnContact` is called when the drawn blade reaches the body, not at the guard of a partial parry (this also fixes item 1 of the defects list below).
- **What happens between exchanges.** The attack itself does not move until its result is known: it is then drawn as one movement from load to follow-through. The phrase ends spent; the pause comes there. Recovery belongs to the next movement: the next blow first puts a broken stance right and closes the measure with steps if one step will not reach. After a lull (about 1.3 s of stage time with nothing written) a spent fighter walks back to its station in a guard that is not the opening one.
- **Range is footwork.** The station gap comes from the engine's range and the weapon lengths (the longer weapon sets the measure; closing in brings it to the shorter one; apart is furthest). A change of range is walked, never slid.
- **Tests:** `tests/pits-live.cjs` (every outcome, seven weapon pairs, both sides, chained blows: bodies possible, contacts meet, no jumps, planted feet, the pause stands on two feet, nobody returns to the opening guard); `tests/visual/pits-motion-live.cjs` (whole bouts in a browser on the movement stage: no errors, the clock frozen while paused, the replay); `tests/visual/pits-scenarios.cjs` passes all 18 scenarios on the movement stage.

**The ordinary sword exchange (owner's review, 2026-11-12).** The quality standard for every other phrase; a contact sheet from the live stage (miss, parry, chest hit, head hit, finishing blow, one after another): `docs/pits-visual-checks/sword-exchange-review.png`.

- **A close-measure cut, not an overhead swing.** Preparation: the weight settles onto the rear foot, the shoulders turn away, the hilt comes to the shoulder with the blade laid back at about 45 degrees (never upright, never over the head). Commitment: the front foot leaves and the rear leg drives the hips while the blade is still back. Strike: the shoulders come round, the arm goes long, the blade arrives last, onto the target with the middle of the blade. 380 ms from stillness to contact. Where one step will not reach, the rear foot takes a gaining step during the preparation instead of a separate shuffle.
- **Shoulders and hips.** The rig has a shoulder turn: the weapon shoulder comes forward into the blow and the other goes back, so rotation shows in a side view. The hips stay over the base (never past the front knee); after a long step the rear foot comes up during the follow-through. When a planted leg would have to stretch, the hips sink into a deeper stance instead.
- **A miss clears the body.** The attacker commits a little less; the defender slips (weight back, chest out of the line, weapon drawn up out of the way) and the cut passes in front of the chest. On the way down the point passes short of the front knee, and the follow-through ends with the point on the attacker's own side of the defender's nearest foot. The sword is held there, low: the next movement starts from it.
- **A parry intercepts.** The cut is taken near its point in front of the defender's head, so the stopped blade never reaches past the guard; it is then turned straight down beside the attacker, short of the defender's knee, and ends in the same low hold.
- **A hit lands where the engine says, and the reaction is local.** The head snaps back and the empty hand comes up; the chest goes back; the body folds over the abdomen; the weapon arm is knocked back and down; the other arm is pulled in; a struck knee gives. Then a foot catches the weight and the fighter ends closed over the wound. The cut is drawn back out of the target before it falls.
- **A fight-ending blow** goes straight into the collapse; the hips never rise again.
- **Tests** (`tests/pits-live.cjs`): the miss keeps at least 14 units from every part of the defender and ends short of the nearest foot; both blades are at the meeting point of a parry and the turned blade keeps clear; each hit location has its own reaction; the cut's order (weight back, foot before blade, hips before blade, weight forward at contact), a hilt that stays below the top of the head and a blade laid back, not upright; a finishing blow that only goes down.
- **Still to do for the sword:** the landed cut on the chest arrives nearly in line with the arm (at this measure a straight line from the shoulder can only descend about 15 degrees); the blades cross at the opening guard; there is no feint or second intention; armour and "no damage" share one small give.

**Second pass (owner's review, 2026-11-12): target, balance, rhythm, defensive intent.**

- **The target shapes the cut early.** Three chambers (`CHAMBER` in `pits-motion.js`): high (head), the hilt beside the face, the blade back at about 45 degrees, the body tall, a steep descent; mid (body and arms), the hilt at the rear shoulder, the blade laid back flat, the shoulders turned further, a level cut that is drawn shorter while it swings toward the viewer (`fs`, flat again at contact) and lands nearly flat; low (legs), the hips sink and the chest pitches forward, the hilt at the hip with the blade back and down, a low sweep into the knee.
- **Rhythm.** 520 ms from stillness to contact: a controlled preparation (`io`, about 240 ms) that is still finishing in the hands when the legs start; the front foot lands 90 ms before contact; the hips accelerate (`in`) and are caught by the front knee (`out`), the two pieces meeting at the same speed; the blade waits in the chamber and swings once, accelerating, to contact (about 1.5 to 2 times the preparation's top speed). After contact the blade carries on through and settles in one easing.
- **Defensive intent.** The defender reads the preparation and goes to a short guard (the point at the face, never long enough to meet an attacker stepping in). A hit beats a guard: a middle guard and the cut goes over to the head; a raised guard and the cut goes under to the body or the leg. The late cover is still moving at contact and stays clear of the cutting blade, so a hit never reads as a parry. A parry is set across the line 40 ms before the cut arrives, takes it near its point, then binds: the parrying blade turns down and the attacking blade rides it (bearing nearer its own hilt as the bind closes) before it falls away on its owner's side; the defender's point comes back into line.
- **Tests** (`tests/pits-live.cjs`): hilt height, blade line and hips differ by target; a hit beats a guard (guard raised, blades at least 12 apart at contact, the cover still moving); a parry is set before contact and binds; the strike is at least 1.4 times faster than the preparation and the hips never stall in the drive; the defender's weapon never enters the attacker; the study sequence has no jumps.
- **Still weak:** a cut is still one of three shapes, not a continuous family (an abdomen cut uses the body chamber); the arm cuts have no shape of their own; the level cut's foreshortening is a length change only, so at full speed it can read as a blade shrinking rather than turning; the miss keeps its earlier slip and has no guard of its own; the parry binds the same way at every height (a low parry is set but its bind is short); the defender's guard is the same for every weapon a sword stands in for; there is no feint or change of line. A sword fighter's cut against a dagger still uses the earlier dagger parry. Balance is checked by eye and by the planted-foot test only: for about 80 ms of each lunge the centre of mass is well ahead of the rear foot while the front foot is in the air (a lunge falling into its step).

**Stand-ins on the live stage (no phrase of their own yet):**

- **Other weapons borrow a pair.** A short blade, a rapier, a spear or a trident stands and attacks like the dagger (thrust); everything else like the sword (cut). Two-handed weapons are held in one hand; a long blade turned down rests its point on the floor and is drawn shorter.
- **Shields** meet a blow with the off hand where the parry would be; there is no shield phrase.
- **Trip** is a blow at the front leg, then the collapse; **disarm** is a parried blow, then the weapon flies; **standing up**, **yielding** and **the winner lowering the point** are plain transitions; an evade that ends prone falls at the next lull.
- **Reactions** are written for the chest; other hit locations are aimed at the right part, but the body reacts the same way.
- **Press Advantage** is held still (no darting point); **a lodged weapon** is drawn from the wielder's hand, but the arm is not kept in the wound.
- **A disabled arm** hangs; figures are drawn at one size (SIZ no longer scales them).
- **Live tolerance:** in the stand-in recoveries an arm can be asked to reach up to 10 units further than it goes; legs no longer stretch (the hips sink instead). The study page still shows the earlier, higher sword load.
- **Still not watched at speed by a person.** The owner's eye is the test.

**Remaining compromises:**

- **The scene is flat.** "Down and away" can only be drawn as down and short: the redirected sword is pulled in beside its owner. In the last cut and in Press Advantage the sword passes in front of the dagger arm in the picture.
- **The dagger stays in the hand** of the fallen fighter (the rig has no loose weapon); it lies flat along the floor.
- **After the thrust is beaten up,** both blades are briefly upright at once, which can read as posed for a moment.
- **The phrases are hand-keyed for this pair and these stances.** They start from the current feet, but the reach numbers are tuned to these five exchanges; another order of exchanges will need its own tuning or a reach solver.
- **The miss shows the defender giving a half step.** The rules need no defender action for a miss; without it, at this measure, the cut would look parried.
- **The page stops at a decision until Resume is pressed** (untick "Stop where a decision would be made" to watch straight through).

## For Sonnet: routine defects in the pose stage

Items 2 and 3 now apply only to the pose stage behind `?stage=poses`; fix them only if the owner wants to keep it. Item 1 is fixed for both stages (2026-11-12), item 4 is done.

1. **Fixed 2026-11-12: a partly parried blow showed its wound early.** The struck part turns red at the guard contact, about 250 ms before the blade reaches the body. `psEmit('contact')` calls `pitsStageOnContact` for the first of the two contacts (`kind:'deflect'`). Flush only on the body contact; add a case to `tests/visual/pits-flow.cjs`.
2. **Confirmed (code): three motions still end in the idle stance,** against the no-idle rule: the step-in in `psSetSpacing`, "Stays up" in the trip cue, and the stand cue. Use `psReady()`; extend the idle check in `pits-flow.cjs` to these.
3. **Suspected (code, not reproduced): a pose snap before a blow.** `psResolveBlow` sets the defender straight to its rest pose when no motion is playing (`def.cur={...psRest(def)}`), which can jump a figure that was holding a lull pose.
4. **Done 2026-11-12:** the study page was not in `scripts/stamp-assets.py` (it loads its files without `?v=`). Add it to the stamped pages and to `tests/asset-versions.cjs` if it stays.
