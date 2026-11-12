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

## Spring exchange study (2026-11-12, owner's animation reference pack)

**Watch it:** `experiments/pits-exchange-study.html`. One exchange (sword cuts, dagger parries, dagger counters to the abdomen, minor wound, both recover) at normal, half or quarter speed, frame by frame, with the decision hold on or off. Contact sheet: `docs/pits-visual-checks/spring-exchange.png`. Code: `experiments/pits-spring.js` (presentation only; uses the rig, solver and drawing from `pits-motion.js`). Tests: `tests/pits-spring.cjs`, `tests/visual/pits-exchange.cjs`. Not wired into the live Pits: that waits for the owner's verdict on the look.

**Sources used.** David Rosen, *An Indie Approach to Procedural Animation* (GDC 2014): the slides only. The talk recording was not watched, so nothing here claims to match motion shown in it. Ideas taken from the slide headings: few keyframes; spring rather than linear or bicubic interpolation; anticipation; impact compression and a recoil spring; IK; simple overlapping systems; "animation and code must work together". Everything below that goes beyond those headings is this project's own proposal.

**What changed compared with the hand-keyed phrases.**

1. **Springs between a few key poses.** Each channel (hips, two spine angles, head, shoulder turn, both hands, wrist) follows its target with its own damped spring. The hips are heavy and well damped; the chest is looser; the head and the empty hand follow late and overshoot a little; the wrist is quickest. A new key reaches each part with a lag: hips first, the blade last. On a parry the order reverses. Nothing stops dead at a key, because a spring carries its speed through.
2. **Impacts are impulses.** At the parry the cut's hand and wrist lose their speed, and the defender's knees and elbow get a push down. At the hit the hips are pushed back, the spine forward and the head late. The reaction comes out of the springs, so it starts at the abdomen and travels up.
3. **Contacts are constraints on top.** The parry point is found from the free cut: where the blade, coming down, passes about 42°. The defender's dagger is blended onto that point over its last 140 ms. During the bind the sword's contact point rides the dagger. The thrust is held on the moving abdomen, and the empty hand is held on the sword arm's elbow, then on its own wound. A constraint never asks an arm to reach past its length, and the wrist and arm limits are hard joint limits (not springs).
4. **One stored simulation.** Both fighters are simulated together at 1 ms steps, once, and stored. The picture is still a function of the time on the bar, so pause, scrub, frame step and replay are exact.

**Not used, and why.** *GSAP:* the study's timeline is already a pure function of time with pause, speed, step and seek; GSAP would add a dependency without solving a timing problem we have. The official GSAP skills in the pack were not installed. *Mixamo:* no signed-in access, so no clips were viewed or downloaded and no clip names are claimed; the pack's search terms (sword, slash, parry, block, dagger, stab, hit reaction, stumble, combat idle) are still unverified suggestions. *Spine:* left for later, if visual authoring becomes necessary.

**What the tests hold** (numbers, not looks): bodies possible (no limb past its length, the wrist inside its turn); planted feet never slide; no joint jumps between 2 ms samples; both blades exactly on the shared contact point, and the dagger on the sword's edge for 80 ms of bind; the defender yields (hips drop, arm shortens); the cut keeps at least 8 units from the defender's body (19 from the head's centre); the counter goes in under the raised sword and keeps 10 units from it; the dagger lands on the abdomen and the reaction starts low with the head following; both held poses stand on two feet with the weight between them and nothing moving; continuing from the hold moves nothing more than 1.5 units in the first frame; hips start before the hand and the hand before the blade; neither fighter ends in its opening guard, and the blades stay apart in the recovery.

**What was checked how.** *From stills and numbers only:* every observation above, the contact sheet, and layouts at 390 and 1280 px in light and dark. *From playback in a browser:* only mechanics (it plays without errors, half speed takes about twice as long, the hold stops and resumes without a jump, frame stepping, the overlays draw). No one has yet watched the motion at speed and judged it natural. **The owner's viewing is the test of the look.**

**Remaining compromises.**

- The parry is staged flat: the dagger lifts the cut up and off the line. In a real fight it would be carried to the side, which the side view cannot show. The sword therefore ends high, and the counter goes in under it.
- The sword tip peaks at about 3.5 units per ms at the strike (roughly 35 m/s if a figure is 1.8 m). That is a little fast for a real cut but reads as a cut.
- The cut's tip stops about 11 units in front of the dagger fighter's face at the contact. A parry made just in time is intended, but it is close.
- The opening guards still cross blades (as in the earlier study).
- Tuning is for this one exchange and this measure. Other weapons, distances or orders would need their own keys, or a solver for reach.
- Springs make timing indirect: a key sets where a part goes, not when it arrives. Contacts are exact only because they are constraints.

**Second pass (owner's review, 2026-11-12).** The owner judged the study more natural than the movement study and asked for four fixes. Each is held by a test in `tests/pits-spring.cjs`.

1. **Sword recovery after the stab.** The elbow drops first, then the hilt comes down in front of the chest with the point up. Only once the dagger fighter's front foot is back is the point lowered into the low guard. The hand stays at least 30 units from the face and the blade at least 18. The point starts down at least 150 ms after the hilt, and the blade turns at under 40% of the cut's peak speed.
2. **The raised sword arm during the counter.** The sword fighter starts the sword down and forward. The dagger fighter's empty hand catches the forearm just behind the wrist (a ring on the page marks it), which stops the arm in front of the body, not beside the head. The hand holds it, lifting it a little, through the thrust. Then it lets go with a small push away, and the arm drops only after it is free.
3. **Grounded steps** (`Fighter.walk`). Before a step, the weight goes over the other foot, or a push-off drives the body there (out of the lunge, where the stance is too long to load the rear foot first). The foot rises before it travels and moves only while clearly off the floor (at least 2 units). It is set down a moment before it takes weight, and the hips then move onto the new base. The dagger fighter comes out of the lunge front foot first, then steps the rear foot back.
4. **The wounded end stance.** Bend at least 18 over the abdomen, the shoulders rounded and the wound side turned away, the empty hand on the wound, the weight behind the middle of the feet, the hilt low in front with the point forward and down.

Checked from stills at 50 ms intervals through the counter and recovery, and from numbers. Playback at normal and half speed was checked in a browser for mechanics only. Whether it now looks right at speed is for the owner.

**Still weak after this pass.** For about 180 ms of the push-off out of the lunge, the dagger fighter's centre of mass is about 28 units ahead of the rear foot. The body is moving back, but the frame is less settled than a slow step. The sword holds upright in front of the chest for about 250 ms while the dagger fighter steps out, which may read as a pause.

## Ten-beat fight study (2026-11-12)

**Watch it:** `experiments/pits-fight-study.html`. Contact sheet: `docs/pits-visual-checks/fight-study.png`. Code: `experiments/pits-fight.js`, on the spring movement in `pits-spring.js`. Tests: `tests/pits-fight.cjs`, `tests/visual/pits-fight-page.cjs`. The outcomes are scripted animation fixtures, not a validated Mythras sequence.

**Direction agreed with the owner** after the reference videos (a stick-figure duel and a melee-swing sheet):
- Keep the grounded bodies and footwork.
- Take the timing contrast: stillness, then a short, fast strike with the easing kept extreme.
- Add smears and impact flashes as a layer that can be switched off.
- Kicks, flips and one-off choreography are out: in the Pits the moves come from the rules.

**How a beat is written.** Key poses for the body; steps with their weight (`Fighter.walk`); and blows aimed with `aim()`:
- The hand snaps toward a point past the contact.
- Over its last 60 to 150 ms the blade is brought exactly onto the contact.
- The blade angle is the nearest one the arm can actually hold there: within reach, never folded against the shoulder, the wrist inside its turn.
- Parries are aimed at the same point, so both blades meet.
- A miss seen from the side is a point that falls just short of the body (about 8 units).

**New rules in the simulation:**
- Strikes can snap: faster, critically damped.
- Springs are per fighter; the fight uses firm springs, with damping 0.88 to 0.97 and under 1% overshoot.
- Hips sink rather than overstretch a planted leg.
- A blade rests on the floor rather than going through it.
- In the fight, a hand goes round its own shoulder rather than through it, so elbows do not flip.
- Runs resume from checkpoints, so the page builds in about 0.4 s rather than 2.5 s; the result is identical.

**The beats.**

| # | What happens | Contact |
|---|---|---|
| 1 | A still start; A comes in a short step (front foot, then rear); B gives a little. Points on different lines. | None |
| 2 | Diagonal cut from a shoulder chamber on a step; B leans in and meets it in front of the body, near A's point; knees and elbow give; the cut is turned down and wide. | Parry, exact |
| 3 | B advances (front foot, rear foot follows) and cuts rising from a low chamber at A's ribs; A draws the front foot back, turns, drops the point; the cut falls about 8 short and is reined in. | Near miss |
| 4–5 | A closes the rear foot, then steps in with a cut at B's forward thigh; B takes the front foot back (weight onto the rear leg) and lowers the blade; the blades meet low; A's travel stops in the front leg and hips, B sinks and holds. Bound through the decision. | Bind, exact |
| 6 | A lifts off B's blade, chambers and cuts high, following with rear then front foot; B steps away and parries above the head. | Parry, exact |
| 7 | From the high parry B cuts short onto A's sword forearm; the arm is knocked back and in, and the guard closes. The forearm stays marked. | On the forearm |
| 8 | B advances and thrusts; A gives a step and deflects the point up and out from waist height, arm bent; B's blade is carried outside the line. | Deflection, exact |
| 9 | A steps into the opening and cuts B's forward thigh; the pelvis drops, the chest comes back up, the sword arm flies up and back. The thigh stays marked. | On the thigh |
| 10 | B's weight drops onto the cut side; the rear foot is dragged under; B sits down hard and goes over onto the back, the sword along the floor, and never rises. A pulls the blade out, steps off twice, and stands guard with the point down and the cut arm held in. | None |

**Checked how.** Numbers, held by `tests/pits-fight.cjs`:
- Limbs within their length and wrists within their turn; nothing below the floor.
- Planted feet do not slide; steps lift, travel only off the floor, and move the weight.
- No snaps, and the springs are firm.
- All six contacts are exact, the miss is a near miss, and no blade enters a body outside the contacts.
- Parries stop the cut, and the wounds make the body react.
- Holds are still and resume without a jump; nobody returns to the opening guard.
- Injuries persist; B goes down and stays down; A ends standing.

Stills at 600 ms through the whole fight (normal-speed spacing) and at 70 to 90 ms through beats 3 and 8 to 10 (half-speed spacing). In the browser, mechanics only. Whether it reads as one connected fight at speed is the owner's call.

**Still weak:**
- Blades briefly cross in transitions (for example early in beat 3) where, from the side, they pass each other in depth.
- Hands come within a few units of the other blade near the hilts at the parries.
- B's legs fold awkwardly for a moment as it sits down.
- Several requested blade angles were adjusted to what the arm can hold (logged in `seq.notes`): B's low cover points less steeply down; the cut to the forearm comes in flatter than asked.
- Everything is tuned for this one fight; the live Pits would need these phrases generalised.

**Smoother and never still (owner's review, 2026-11-12).** The owner said the movement is basically there but not smooth: speed it up a little, and in a real fight nobody is ever still. These options in `pits-spring.js` are opt-in, so the exchange study is unchanged; the fight uses them all.

- **Smoothing** (`f.smooth`, 35 ms; strikes a third of that): each spring follows a target that itself eases toward the key, so a new key never starts a part from rest at full acceleration.
- **Alive** (`f.life`): two slow sines per channel with different periods (about 1.1 to 2.3 s), added to the targets, with each fighter on its own phases. Contacts stay exact, because the constraints override it.
- **Steps:** a smooth lift arc (`liftShape`), and the hips start travelling as the foot leaves (`stepLead`).
- **Hips:** the hip target is limited ahead of the hard leg limit, so the hips ease down rather than being caught.

Measured jerk (the third difference over 4 ms, worst 1%, outside contacts):

| | Before | After |
|---|---|---|
| Body | 0.06 | 0.01 |
| Hands | 0.26–0.43 | 0.16–0.17 |
| Blade tips | 1.1–1.5 | 0.7–0.8 |
| Time a fighter is still (in 100 ms windows) | 39% | A never more than 100 ms; B only once down, breathing |

The fight is about 12.3 s (the breathing gaps are 380 ms of live movement instead of 650). Decision boundaries now fall mid-movement; a hold freezes that exact pose and resumes from it.

**One continuous movement (owner's review, 2026-11-12).** The owner: the individual movements look great, but there is still too much time between swings. Right after a parry, hit or miss, the next action should begin, with not a single standstill frame. In the live Pits the only pauses are decision holds, where everything stops; a replay is continuous, and this study should be too.

- The breathing gaps (`GAP`, 380 ms, and the 520 ms of recovery before them) are removed. Each decision boundary is placed where the last recovery is slowest with both feet down (so a hold freezes a clean pose), and the next beat's first key follows within 0 to 80 ms. A recovery key that the next beat would override was dropped or moved earlier.
- The opening on guard is 300 ms shorter. The fight is about 8.5 s (was 12.3).
- Measured: from the first step to B's fall, the longest stretch where no hip, shoulder, hand or blade tip moves 1 unit per 20 ms is 60 ms (was 840; 1.1 s at 2 units). Each parry, bind, deflection, wound and miss is followed by the next beat within 420 ms (was up to 940).
- Because the drift is time-based, shifting the timeline changed its phase at the thigh cut, and A's withdrawing blade brushed B's knee. A now draws the blade back a little further with the point lifted.
- `tests/pits-fight.cjs` holds both numbers (next beat within 420 ms; no 200 ms lull).

**Crunch and pace (owner's review, 2026-11-12).** The flow is right; it needs more crunch: heavier parries, more brutal hits, and about half as fast again.

- **Pace:** `seq.pace = 1.5`; the page plays fight time 1.5 times faster at Normal. The movement is still written and tested in fight time, so every check in `tests/pits-fight.cjs` is unchanged; hit-stops and flashes are shown time and speed up with it.
- **Hit-stops** (fight time): parries 110 to 140 ms, the forearm wound 190, the thigh wound 220.
- **Impulses:** parried blows knock the attacker back through the hips and the head; the defender's knees, chest and head give about twice as much. The forearm recoil is about 1.5 times as strong, and the thigh cut drops B harder.
- **Shake:** each impact in `seq.fx` with a `power` shakes the whole scene (floor included) with a decaying jolt, 3.2 units times power for a clash and 5 for a wound, over about 260 ms of shown time. It is deterministic, so a still is repeatable. It is part of the smears and flashes layer and is off with reduced motion.
- **Flashes:** scaled by power, with a filled core for the first 70 ms; 8 rays for a clash and 12 for a wound.
- Checked by `tests/visual/pits-fight-page.cjs`: Normal covers over 1.85 s of fight in 1.5 s, the final wound shakes and has a core, and the layer switches it off.

**Pace chosen (owner, 2026-11-12):** 1.10 times the 1.5 pace on the slider, so `seq.pace = 1.65`; the slider is removed.

## Path to the live Pits: all weapons and shields (plan, 2026-11-12)

The fight study is hand-written: every beat's timing and every clearance was tuned by hand. The live Pits needs the same movement written by code, from the engine's resolved results, for any pair of weapons. The plan:

1. **An exchange writer.** Input: one resolved exchange from the engine's record (who attacks, weapon, hit location, the defence chosen, the outcome, damage, special effects). Output: keys, steps, impulses and contacts on the running spring fighters, starting from wherever they are, with the no-gap rule and the crunch. Proof: the ten-beat fight is rebuilt from ten fixture records and passes all of `tests/pits-fight.cjs`.
2. **Live, sword only.** The writer drives the live stage behind a flag (`?stage=spring`) for broadsword against broadsword; any other weapon falls back to today's stage. Decisions hold the scene; a replay is continuous.
3. **Weapon families, not single weapons.** Weapons move by how they are held and what they do, so each family is one set of phrases plus a profile per weapon (length, grip, weight and balance, guard):
   - one-handed cut (have it): broadsword, shortsword cut, and as a base for the heavy family;
   - thrust: dagger, shortsword, rapier;
   - **shields** (block with the shield, cover posture, bash), early because they are common at the table;
   - heavy one-handed: axe, mace, club, hammer (slower chamber, harder impact);
   - two-handed swing: great sword, great axe, maul, staff;
   - long thrust: spear, trident, pike and polearms, at their own range;
   - flexible: flail, chain, whip, net (last; a stand-in until then).
4. **A sweep instead of watching everything.** Every weapon against every weapon, with and without a shield, through every outcome and hit location, built headless and checked against the fight study's rules: exact contacts, no blade through a body, no lull, feet planted, limbs possible. The owner watches one short generated study per family; the sweep covers the combinations nobody will watch.
5. **Special effects and hit locations:** reactions per location (head, each arm, each leg, chest, abdomen), then trip, disarm, impale (blade lodged), bash and the rest, in the order they come up at the table.
6. **Retire the old stages** (the pose stage and the keyframe `PitsMotion.LIVE`) once the owner approves the spring stage in play.

**Changed by the owner (2026-11-12):** step 2 is not done on its own. Everything (the writer, every weapon family, the sweep) is built first and lands in the live Pits at once. Work stays on one branch until then; no PR per family.

## Exchange writer (step 1, done 2026-11-12)

**Code:** `experiments/pits-writer.js` (`PitsWriter.write(records)`), fixtures in `experiments/pits-fixtures.js`. `pits-fight.js` is now three lines: the writer fed the fixtures. **Tests:** `tests/pits-fight.cjs` (the study, unchanged, 19 checks) and `tests/pits-writer.cjs`.

**A record** is what the stage already has after an exchange: `{attacker, loc, outcome, lost, after}`. `outcome` uses the stage's words (`parried`, `full-parry`, `partial-parry`, `wound`, `armour`, `zero`, `miss`, `evaded`, `fumble`); `after` holds the cues that follow (an `end` with `how:'injury'` for the attacker means the blow ended the fight). `action` (`cut` or `thrust`) is optional; a sword thrusts at the abdomen unless told.

**How it works.**
- The phrases are the study's beats, written for an attacker and a defender. Every foot and hip position is relative to where that fighter stands (the midpoint of its planned feet) when the phrase starts, so a phrase plays from anywhere, by either fighter. Each phrase records the stance, measure and stance width the study had.
- **Measure:** if the gap is not the phrase's, the attacker first steps in (blade up into a middle guard) or out (point low until the step is made). **Stance:** a fighter whose stance is more than 16 wider or narrower than the phrase's gathers it with the rear foot. In the study's own order neither happens, so the study is unchanged.
- **Which phrase:** a parry at the body → cut parried; at the head → high parry; at a leg → low bind; a thrust parried → deflection; a miss, evade or fumble → the slipped counter; a hit to a leg → thigh cut (collapse if the record says the fight ended); a hit to the weapon forearm just after the other's high cut was parried → the short arm cut; any other hit or armour stop → **cut lands** (new: the study's first cut, with the cover too late, the blade drawn out back and up, and a reaction by location). A partial parry is drawn as a blow that lands and is noted as a stand-in (`seq.notes`, kind `stand-in`).
- **Decision boundaries:** every exchange ends on one. If the movement is still fast there, the boundary moves to the nearest quiet moment with both feet down (earlier only, up to 80 ms, so no decision falls after the next movement has started; the last one of an unfinished fight may also wait). Notes of kind `measure`, `gather` and `boundary` say when any of this happened.

**What the tests hold.** The study rebuilt from the records passes all of `tests/pits-fight.cjs` with no measure, gather, stand-in or moved boundary. With the roles swapped, with another order from other places, and for all 84 single exchanges (either fighter; head, chest, abdomen, both arms, both legs; parried, partial parry, wound, armour, miss, evaded): limbs within length, contacts exact, no blade into a body outside the contacts, feet down and no jump at each boundary, no sliding foot, no snap.

**Still weak.** The two faults first found by trying other orders are fixed (2026-11-12, second batch) and held by `tests/pits-writer.cjs`: the parried cut, turned down, passed 2.5 units from the defender's sword elbow even in the study (now 4.5), and a fighter stepping back out of a too-close measure lowered the blade through the other (it now lifts the point up and back). Open:
- A partial parry has no clash of its own yet; it is drawn as a blow that lands.
- Beat labels are the study's wording ("Disengage high", "Counter, slipped"), even where the phrase is not a disengage or a counter.
- **For the live stage (step 2, later):** a phrase's weight shift can start up to 170 ms before its first step, so before the decision boundary when the phrase starts at one. Written ahead (the study) that is fine; the live stage writes after the hold and cannot write into the past. Clamping it there spoils the weight transfer before the step (tried); the live stage will need the preparation folded into the phrase start instead.
- The parry clearance in the study's low bind is at the limit (3.0 units against a minimum of 3): a 1 ms shift in the phrase start breaks it. The study's numbers are kept exactly for that reason.

## For Sonnet: routine defects in the pose stage

Items 2 and 3 now apply only to the pose stage behind `?stage=poses`; fix them only if the owner wants to keep it. Item 1 is fixed for both stages (2026-11-12), item 4 is done.

1. **Fixed 2026-11-12: a partly parried blow showed its wound early.** The struck part turns red at the guard contact, about 250 ms before the blade reaches the body. `psEmit('contact')` calls `pitsStageOnContact` for the first of the two contacts (`kind:'deflect'`). Flush only on the body contact; add a case to `tests/visual/pits-flow.cjs`.
2. **Confirmed (code): three motions still end in the idle stance,** against the no-idle rule: the step-in in `psSetSpacing`, "Stays up" in the trip cue, and the stand cue. Use `psReady()`; extend the idle check in `pits-flow.cjs` to these.
3. **Suspected (code, not reproduced): a pose snap before a blow.** `psResolveBlow` sets the defender straight to its rest pose when no motion is playing (`def.cur={...psRest(def)}`), which can jump a figure that was holding a lull pose.
4. **Done 2026-11-12:** the study page was not in `scripts/stamp-assets.py` (it loads its files without `?v=`). Add it to the stamped pages and to `tests/asset-versions.cjs` if it stays.

## Weapon families: profiles and the thrust family (step 3, 2026-11-12)

**Watch it (optional; nothing is live):** `experiments/pits-fight-study.html?seq=thrust`, a dagger against a broadsword, generated by the writer from scripted records (`PitsFixtures.THRUST`). The page's top line links the fights.

**Profiles.** Each fighter's weapon key (the stage's keys, as `pitsStageWeaponKind`) gives a length and a family: `thrust` for dagger, knife, main-gauche (50), shortsword (68) and rapier (112); `cut` for broadsword (92), longsword (104), falchion, sabre and scimitar (84). Any other weapon is drawn as a broadsword and noted as a stand-in. `PitsWriter.write(records,{weapons:{a,b}})`.

**How the sword phrases fit other blades.**
- A contact point written for the broadsword sits at the same fraction of a shorter blade, and with the same length of blade beyond it on a longer one (so a long point does not reach past a parry into the other's body).
- The attacker's measure moves by three quarters of its blade's difference from the broadsword.
- If no blade angle fits at the contact point (a long blade, close in), the aim tries a point a little further out or nearer the hilt; the contact records the point used.
- A defender whose weapon is more than 15 longer lifts the point as the shorter weapon comes inside it (the side view cannot show it carried off the line).
- Longer blades: a low cover is steeper; a thigh wound flings the sword arm back with the point going down when it was down (up would sweep it through the attacker).

**The thrust family's phrases.** Thrust lands (any location; drawn out along its line, the body's travel stopped at the contact; a longer blade goes less deep and settles with the point higher), thrust falls short (the defender gives two steps), and a parried thrust is the deflection. A parried thrust at the legs is met low like a cut (stand-in). The collapse now follows any blow that ends the fight; after a blow at close quarters the falling fighter's weapon goes up and back over its own side.

**The sweep (step 4, started).** `node tests/sweep/pits-sweep.cjs` (about 3 minutes): the six weapons with a family against each other, 36 pairings, each with every hit location and four results (parried, wound, armour, miss): 1,008 fights, all within the movement rules on 2026-11-12. CI runs a sample (six pairings) in `tests/pits-writer.cjs`; the rules are in `tests/lib/pits-motion-rules.cjs`.

**Checked how.** Numbers (the sweep and the tests), and two stills of the generated study (the short thrust, the stab to the sword arm). Not watched at speed: whether a dagger fighter looks right is for the owner.

**Next families**, in the planned order: shields (block, cover, bash), heavy one-handed (axe, mace, club, hammer), two-handed, long thrust (spear and polearms, their own range), flexible.
