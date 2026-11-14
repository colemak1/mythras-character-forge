# Changelog

All release notes, newest first. Add new entries at the top of this file; do not create new `CHANGELOG-*.md` files.
Entries before November 5, 2026 were merged from separate `CHANGELOG-<TOPIC>.md` files; each entry is preceded by a comment naming its original file.

---

## The Pits: Report fight (in place of Copy fight record)

- New **Report fight** button in the Pits top bar (every stage). It opens a window to type what went wrong; **Send report** saves the note with the fight record and the build the page was running to the site's database. No sign-in needed (owner: testers may play too); an optional name tells testers apart. Offline, the report is kept on the device and sent with the next one. At most 200 reports a day across the site; nobody can read reports from the site. **Copy the fight record** is still in the window.
- A manual workflow, **Export Pits fight reports**, copies the reports to the `pits-reports` branch, where Claude and ChatGPT both read them; diagnoses go in `docs/pits-report-ledger.md`. Setup and use: `docs/pits-reports.md` (a database migration for Work, one repository secret for the owner).
- Fixed: the Pits windows (Rules, and the new report window) had see-through boxes; the fight showed through the text.
- Tests: `tests/pits-report.cjs`; database permissions for the new table in `tests/db/permissions.cjs`.

## The Pits trial: collision, a blade cannot pass through the other fighter (comparison)

- New rule in the spring movement: the other fighter's head, body and arms are solid. When a blade would pass into them outside a real contact (a parry, a wound), the hand is pushed back out with the blade keeping its angle, or, where the arm cannot go, the wrist turns it away. It eases out over a few frames and never jumps. Off by default; the trial is unchanged unless opened with `&collide=on`.
- New page `experiments/pits-collide-compare.html`: the same test fight played side by side without and with the rule, with a red ring wherever a blade is inside the other fighter, and a count of those frames.
- Measured over 216 test fights (the motion check, all weapon families): frames with a blade inside the other's head fall by 90 to 96%, inside the body by 80 to 87%, through an arm by about 85%. No new jumps. Frames with a blade across its owner's own head rise by about 20% (that was already on the motion backlog).
- Tests: `tests/pits-collide.cjs` (in CI). The motion check `tests/sweep/pits-live-sweep.cjs` now also prints frame counts, and runs with the rule on with `COLLIDE=1`.

## The Pits trial: Work's spring batch (grips, Prone chip, Disarm timing, Keep hold, replay result)

- Work's batch was run on a preview two commits old. Its Severity 1 (C1: against the arena's opponent, the knockout came before the Endurance roll that caused it) was already fixed; a test now replays that exact sequence. The two-handed grips of the battleaxe, greatsword and great hammer (A5 to A7) were also already fixed.
- Poleaxe and quarterstaff (A8, A9): the lead hand no longer lets go of the shaft when its usual grip point is out of reach; it slides along the shaft to where the arm reaches.
- Trip (B1): the Prone chip waits until the tripped fighter is sat down. Other falls drawn without a blow also wait until the figure is down.
- Disarm (B4): when the Disarm is resolved before the throw distance, location or damage rolls, the weapon stays in the hand until the blow is drawn, then lands on the floor once.
- Impale, Keep hold (B6): the weapon is drawn once, lodged in the wound, with the wielder's hand on its grip; no second blade in the hand.
- Fight replay (D2): a **Show result** button during the replay stops it and opens the result window.
- Still open (Severity 2, motion): a held blade or a miss can still pass through the other fighter's head or body on a few beats (A11, A12, B5, C2). Recorded in `docs/pits-animation-direction.md`.

## The Pits trial: every weapon on the spring stage

- All 35 Pits weapons now fight on the `?stage=spring` trial (owner, 2026-11-14). Until now only blades and short one-handed axes, clubs, maces and picks did; two-handed weapons, polearms, spears, the quarterstaff, flails, whip and net fell back to the older movement.
- The new ones are stand-ins on the existing phrases: two-handed swords, axes and hammers, polearms, the quarterstaff, flails, whip and net use the cut phrases; the shortspear, trident, longspear, xyston and pike use the thrust phrases. Longer weapons stand further apart (the measure grows with length).
- Two-handed weapons are drawn with the off hand on the weapon: close to the weapon hand on swords, axes and hammers, well up the shaft on staves, spears and polearms. It lets go when the arm is disabled or the weapon is lost.
- New: `tests/sweep/pits-weapons-browser.cjs` plays a whole bout with every weapon in a browser (all 35 end with no errors).

## The Pits: a knockout waits for the dice that cause it

- Against the arena's own opponent, its Serious Wound and Endurance dice were shown after the blow: the opponent collapsed and Victory appeared before the Endurance roll that knocked it out (owner's fight record, 2026-11-14). The dice of a blow's consequences are now shown before the blow, as they already were when a person rolls them; the blow then lands with its outcome known. Dice that start something new (a Trip, the next attack, a new turn) stay where they were. Also applies to the fight replay.

## The Pits trial: trips sit you down, an impaled weapon stays put, a fight record to report faults

- A successful Trip now puts the fighter on its backside: the swept foot goes out, the hips drop back onto the floor, a hand goes behind and the weapon stays up toward the other fighter. It is no longer the crumble onto the knees used for a defeat (owner, 2026-11-13). Leg wounds and defeats still crumble.
- Impale, "Leave it in the wound": the weapon is drawn lodged in the wound only. The engine marks the wielder unarmed, and the stage had also thrown a weapon to the floor behind them as if they had been disarmed.
- New on the `?stage=spring` trial: a **Copy fight record** button in the top bar. It copies the fight's dice and rulings in the order they were shown, the engine's log, and what the stage drew, so a fault seen in play can be replayed exactly.
- The reported miss order (my miss drawn only after the opponent's next attack and my parry) did not reproduce in scripted or random bouts against either opponent type; a check for it is in the new `tests/visual/pits-spring-scripted.cjs`, with the Impale and Trip cases.

## The Pits trial: the Prone chip waits for the figure; action names shown whole

- On the `?stage=spring` trial a fighter's plate no longer says Prone before the figure is seen to go down. After an Evade the engine has the evader prone from the roll, but the dodge to the ground is drawn only when the exchange is resolved; through the hit location and damage rolls the plate said Prone over a standing figure. The chip now appears at the blow's contact, when the figure goes down (the opponent panel in the bottom layouts too). Rules and state are unchanged; other stages are unchanged.
- In the two-column action list, long names (Switch Weapon Hand, Change Range, Regain Footing) wrap onto a second line instead of being cut off. The list still fits without scrolling at 1024x768 and up.
- Checks added to `tests/visual/pits-spring-live.cjs` (plate against figure, every frame) and `tests/visual/pits-layout.cjs` (no clipped action name).

## The Pits: Work's code findings (Disarm, shield strikes, shield sizes, Press Advantage, result dialog, current exchange)

- A Disarm is no longer drawn before its exchange is resolved: it waits with the blow until location, damage and any Endurance roll are done. A Disarm won by the attacker is part of that one blow, and the weapon leaves the hand at its contact. A defender's Disarm is drawn after the parry.
- On the spring trial a shield strike is drawn as a shield strike, not a sword cut. A strike met by the blade is drawn at a longer measure, so there is room for the blade on the shield.
- Each shield keeps its own size (buckler, heater, kite, scutum, ...), both in the drawing and in where blows meet it.
- Press Advantage is drawn on the spring trial: the point stays in the other's face while the other covers.
- The result window is drawn once, in every bottom layout (it was drawn twice, with duplicate ids).
- A new opponent starts with an empty Current exchange; the last bout's blows stay in the chronicle.
- Movement fixes found once the shield-strike test passed: a failed shield parry against a thigh cut, and a long blade's failed parry against a stab to the sword arm.

## The Pits trial: owner's notes from play (order of blows, replay, falls, arm wound)

- A miss is drawn before the next attack. When the other fighter attacked at once after a miss and the engine waited for your reaction, the miss was held back behind that attack, so their swing and your parry were drawn before your miss. Now an exchange that is over plays whole before the next one is declared.
- A parry that wins a Trip or a Disarm is drawn as the parry first, then the sweep (the engine logs the effect before the blow).
- The fight replay runs on as one movement. Each exchange starts just after the last one's contact, and the wound, limb and weapon beats no longer hold the picture still.
- Falls are drawn as the body crumbling where it stands: the knees give, the fighter drops onto them and folds over (legs, failed evades, trips and the defeat). Getting up steps the feet back out into a stance.
- A Major Wound to an arm ends the fight with the blow, so the figure crumbles from the hit. Its end text mentions blood loss, which the stage had read as a fight lost to bleeding: it drew a plain hit and then a separate fall. A Serious Wound to an arm only makes the arm hang.

## The Pits trial: fluid flow (declare, hold, resolve); the round reset removed

- On the `?stage=spring` trial an exchange now plays the way the owner described it. Choosing Attack draws the weapon back (and brings the attacker in to striking distance) and holds; choosing a parry or an evade sets the blade or shield, or sinks the body, and holds; both figures are completely still while anyone chooses or the dice roll; when the exchange is fully ruled the blow lands at once from the held poses. Fighters no longer go back to a guard after a blow or at a new round: each movement starts from where the last one left them. Declared actions have several variants, picked at random.
- Fixed: a fighter going prone early, standing up to be hit and going prone again (evades and killing blows); the Arise effect; a killing blow on a fighter already on the ground; a knocked-away weapon jumping back into the hand; a disabled arm snapping to its hang; a wind-up undone by an older movement's late parts; the range marker left behind the fighters.
- Axe, hatchet, club, mace and military pick bouts run on the trial with the sword's cut phrases as a stand-in. Longer and two-handed weapons still use the earlier movement.
- New: `tests/pits-spring-live.cjs` (CI), `tests/sweep/pits-live-sweep.cjs` (random whole fights through the live flow against the movement rules), `tests/visual/pits-film.cjs` (slow-motion film strips for review). `docs/pits-animation-direction.md` has "Fluid flow" and "Instructions for Opus". Nothing released; `tests/pits-writer.cjs` still fails on the shield strike, as recorded.

## The Pits trial: round reset; fighters on the ground stay down

- In the `?stage=spring` trial, at each new round both fighters walk back to their places and settle into guard together (owner's idea, to judge by eye).
- An evade tried against a blow that missed anyway also ends in the dodge to the ground (the engine leaves the evader prone then too), and a fighter the engine has prone stays down while it attacks or defends from the floor, until it regains footing.

## The Pits: evade drawn as a dodge; the trial keeps the flow

- An evade that the engine ends prone is drawn as a dodge: the evader ducks out of the line, steps back long and goes down under control, propped on one hand with the head up and the weapon toward the attacker, instead of the knockout fall (spring movement and the `?stage=spring` trial; the default stage is unchanged).
- The trial no longer walks fighters back to their stations after every lull (owner: fluidity over strict range); real range changes still walk.

## The Pits: the spring movement on the live stage, as a hidden trial

- `?stage=spring` on the Pits draws bouts between blade fighters with the exchange writer (`experiments/pits-spring-live.js`); everything else, and the Pits without the switch, are unchanged. Nothing released.
- Findings recorded for the owner (range and the picture, time to write a blow, memory, stand-ins) in `docs/pits-animation-direction.md`, "Live trial".
- Work's own-blade finding (PR #323): chambers, raised holds and guards now keep a fighter's blade off its own head in the studies, held by a new movement rule; the shield strike still breaks it (one CI test fails, recorded).

## The Pits: a failed parry still looks tried (owner's request)

- When the record says a parry was tried and failed (`tried:'parry'` or `'shield'`, or a defence named for a blow that landed in full), the defender goes for the parry with the blade or the shield, a beat late and a little short, and the blow lands first.
- Shown in the thrust and shield studies; covered by the sweep (1,008 more fights) and the CI tests.

## The Pits: shields in the exchange writer (step 3, second family)

- **Shields** sized by type (buckler to scutum), carried forward on the off hand and drawn in the studies.
- **Shield parry and ward:** every parry meets the blow on the shield's face (low blows on the lower rim, or as low as the shield reaches).
- **Shield strike:** the shield driven onto the target; it knocks the defender back a step, is met by the blade, or stops short.
- **Generated study:** `pits-fight-study.html?seq=shields`, broadsword and heater against broadsword and buckler.
- **Sweep:** the 36 weapon pairings again with shields on both sides; CI runs a sample. General fixes found on the way: contact records use the point of the blade actually used; decision boundaries only wait, never cut a movement short; stepping back keeps the blade's angle until the step is made.
- Still not wired into the live Pits (owner: everything lands at once).

## The Pits: weapon profiles and the thrust family (step 3 of the path to the live Pits)

- **Weapon profiles in the exchange writer.** Each fighter's weapon gives a blade length and a family: short blades and the rapier thrust, the swords cut. The sword phrases fit any blade (contact points, measure, a long point lifted when a short weapon comes inside it).
- **Thrust family:** a thrust that lands (any location), one that falls short, and the deflection for a parried thrust. The collapse now follows any blow that ends the fight.
- **Generated study:** `pits-fight-study.html?seq=thrust`, a dagger against a broadsword, built from scripted records.
- **The sweep:** `tests/sweep/pits-sweep.cjs` checks 1,008 one-exchange fights (six weapons against each other, every location, four results) against the movement rules; all pass. CI runs a sample.
- **Fixes:** the parried cut, turned down, no longer passes close to the defender's sword elbow; a fighter stepping back out of a too-close measure lifts the point away instead of lowering it through the other.
- Still not wired into the live Pits (owner: everything lands at once).

## The Pits: the exchange writer (step 1 of the path to the live Pits)

- **New `experiments/pits-writer.js`.** It turns resolved exchanges, in the engine's terms (attacker, hit location, outcome, damage, what follows), into the spring movement, one exchange after another, each starting from wherever the last one left both fighters. Phrases are written for an attacker and a defender, relative to where each stands; the attacker takes the measure first when the gap is not the phrase's, and either fighter gathers a stance left too wide or too narrow.
- **The ten-beat fight study is now the writer fed eight fixture records** (`experiments/pits-fixtures.js`). It is the same fight, and passes all 19 checks in `tests/pits-fight.cjs`. One change: the decision boundary after the deflection is 80 ms later, so a hold freezes a pose rather than a swing (every exchange now ends on a decision).
- **New phrase "cut lands"** (head, chest, belly, either arm) and a withdrawal for a thigh cut that does not end the fight, so every result at every hit location can be drawn from an ordinary exchange.
- **Tests:** `tests/pits-writer.cjs`: the records and the phrase table; the fight with the roles swapped; another order from other places; all 84 single exchanges (either fighter, seven locations, six outcomes) against the movement rules.
- Not wired into the live Pits (owner, 2026-11-12: everything lands at once when all weapon families are done).

## The Pits: fight study pace fixed at the owner's choice

- The owner chose 1.10 times the previous pace on the slider. The fight now plays at 1.65 times its own time (about 5.7 s), and the slider is removed.

## The Pits: fight study, heavier and faster (owner's review)

- **Faster.** The fight plays at 1.5 times its own time: about 6 s at Normal. Half and Quarter are relative to that.
- **Pace slider** on the fight page, from the current pace (1.00×) to twice that (2.00×). The readout gives the multiple, the fight-time pace and the length, so the owner can name the exact speed wanted. Remembered in this browser.
- **Heavier parries.** Longer hit-stops (110 to 140 ms of fight time instead of 50 to 70). The defender's knees, chest and head take a bigger jolt; the attacker is knocked back through the hips.
- **More brutal hits.** Hit-stops of 190 ms (forearm) and 220 ms (thigh). The forearm recoil is half as big again, and B's collapse starts harder.
- **Screen shake and heavier flashes.** Each impact shakes the scene for a moment (harder for wounds). The flash has a bright core and more rays, red for a wound. All of it is in the "Smears, impact flashes and shake" layer, which can be switched off; no shake with reduced motion.

## The Pits: fight study, one continuous movement (owner's review)

- **No gap between actions.** The breathing gaps between beats are gone: the next action starts while the last parry, miss, bind or wound is still being recovered from. The only stops are the optional decision holds; played straight through (as a replay will be) it is one continuous movement.
- The opening on guard is shorter. About 8.5 s instead of 12.3.
- A's blade is drawn back from the thigh cut with the point lifting a little, so it no longer brushes B's knee as B goes down.
- Tests: `tests/pits-fight.cjs`, 19 checks. New: every resolution is followed by the next beat within 420 ms, and from the first step to B's fall there is never 200 ms where nothing travels with purpose (the old version had a 1.1 s lull).

## The Pits: fight study, smoother and never still (owner's review)

- **Smoother.** Every new pose is eased into, so no part jumps from rest to full speed. Hips start travelling as a foot leaves, feet lift and land on a smooth arc, and the hips ease down before a leg runs out of length. The body's worst-case jerk is a sixth of what it was, the hands' about half.
- **Never still.** A slow, never-repeating drift keeps both fighters alive: weight shift, breathing, the guard and the head. Once down, B only breathes. A decision hold still freezes the exact pose and resumes from it.
- **A little faster:** about 12.3 s instead of 15.
- **Fixed:**
  - After the deflection, B's point was left in A's chest. It is now thrown up and off the line.
  - A's thigh cut carried on into B's hip. It is now arrested at contact and drawn straight back out.
  - A's last step back was longer than a leg.
- Tests: `tests/pits-fight.cjs`, 18 checks, with new checks for never still, smoothness and blade clearance during contacts.

## The Pits: a ten-beat fight study (prototype)

- **New page: `experiments/pits-fight-study.html`.** A whole fight, broadsword against broadsword, about 15 seconds, on the spring movement from the exchange study:
  1. approach and measure;
  2. a parried cut;
  3. a slipped counter;
  4. a low attack;
  5. a low bind;
  6. a disengage to a high parry;
  7. a cut to A's sword forearm;
  8. a deflected thrust;
  9. a cut to B's thigh;
  10. the collapse.
  Every beat starts from where the last one left both fighters. The outcomes are scripted animation fixtures and say so on the page; the live Pits is unchanged.
- **Plays straight through by default.** Tick "Stop where a decision would be made" to hold the exact pose at each decision and resume from it. Normal, half and quarter speed, frame stepping, a scrubber with numbered beat marks, and a button per beat.
- **Movement:**
  - Strikes ease hard: a short fast part, no overshoot. Springs are firm, so nothing wobbles.
  - Contacts are exact, and blows are aimed at angles the arm can actually hold.
  - A miss falls just short of the turned body.
  - Hips sink rather than overstretch a leg.
  - A hand cannot pass through its own shoulder, and a blade rests on the floor rather than going through it.
- **Wounds:** only the cut segment is marked (A's forearm, B's thigh), and both stay marked to the end.
- **Smears and impact flashes:** a layer you can switch off, on both study pages.
- Tests:
  - `tests/pits-fight.cjs`: 15 checks, CI.
  - `tests/visual/pits-fight-page.cjs`: browser, local.

## The Pits: exchange study, second pass (owner's review)

- **The sword arm is caught, held and let go.** The sword fighter starts to bring the sword down. The dagger fighter's empty hand catches it at the wrist and stops it in front of the body, holding it up through the thrust (a ring marks the grip). Then it lets go with a small push, and only after that does the arm drop.
- **A deliberate sword recovery.** The elbow drops and the hilt comes down in front of the chest with the point up, clear of the face. The point is lowered only once the dagger fighter has stepped out, at under a third of the cut's speed.
- **Steps that carry weight.** Before a foot leaves, the weight goes over the other foot, or the foot pushes off (out of the lunge). The foot rises before it travels, is set down, and then the hips move onto the new base. The dagger fighter comes out of the lunge front foot first.
- **The wound shapes the end.** The sword fighter ends bent over the abdomen with the hand on the wound, weight back and the point low in front.
- New jump buttons: *Sword arm caught*, *Arm let go*, *Sword recovers*. Tests: `tests/pits-spring.cjs` (19 checks).

## The Pits: a spring-driven exchange study (prototype)

- **New page: `experiments/pits-exchange-study.html`.** One exchange, broadsword against dagger: cut, parry, counter, wound, recovery. Results are fixed in advance and labelled; the live Pits is unchanged.
- **How it moves.** Each body part follows a few key poses on its own damped spring, so parts arrive one after another instead of all stopping at each key. Feet still move only in steps. A parry or a hit is an impulse into the springs: knees and elbow give, the hips are pushed back and the head follows. Contacts are constraints: both blades meet at one point, and the dagger stays on the sword's edge through the bind.
- **For inspection.** Normal, half and quarter speed, frame stepping, the decision hold (on or off), jump buttons (parry contact, held decision, counter, wound reaction, end pose), and overlays for planted feet and centre of mass, blade paths, the contact point and clearance from the sword.
- Tests: `tests/pits-spring.cjs` (15 checks, CI) and `tests/visual/pits-exchange.cjs` (browser, local).

## The Pits: sword cuts that know their target, and defenders that defend

- **The target shapes the cut from its first frame.** A cut to the head chambers beside the face and comes down steeply; a cut to the body keeps the hilt at the rear shoulder with the blade laid back flat and comes round level; a cut to the legs sinks the hips, pitches the chest forward and sweeps in low.
- **One movement, not three poses.** A slower, settled preparation; the foot and hips drive while the blade waits; then one accelerating swing to contact, and a follow-through that carries on and slows. The hips no longer surge and stop mid-step, and the front foot lands before the weight arrives on it.
- **Defenders defend.** As the cut is prepared the defender goes to a guard. A hit now beats a guard: over a middle guard to the head, under a raised guard to the body or the leg, with the defender's late cover still moving when the blade lands and kept clear of it. A parry is set across the line before the cut arrives, takes it, then binds and carries it down before it falls away.
- Fixed: a blade could spin a full turn between two keys when its wrist angle wrapped past half a turn.
- Presentation only: no rules, rolls or choices changed, and committed attacks still play after they are resolved. Tests: `tests/pits-live.cjs` (22 checks).

## The Pits: watch the sword exchange on its own page

- The movement study page now opens on **Sword against sword (the live Pits)**: a miss, a parry, hits to the chest, head and leg, and a blow that ends the fight, drawn exactly as the Pits draws them, one after another. Play, pause, step a frame, quarter speed, or start from any exchange; no fight setup needed. Link: `experiments/pits-choreography.html?seq=sword`.

## The Pits: a sword exchange you can read without the result text

- **A shorter, grounded cut.** No more overhead wind-up: the hilt comes to the shoulder with the blade laid back, the weight settles onto the rear foot, then the front foot steps, the hips drive and the shoulders turn into the blow. The fighters stand a little closer.
- **A miss clears.** The defender slips back out of the line and the cut passes in front of the chest; the follow-through ends low on the attacker's own side, never across the other fighter's legs. The lowered sword is held, and the next movement starts from it.
- **A parry intercepts** in front of the head, and the stopped sword is turned down beside its owner.
- **Hits react where they land:** the head snaps back, the body folds over the abdomen, the arm is knocked back, the knee gives. A blow that ends the fight goes straight into the fall.
- Other weapons share the improvements; their own phrases are still stand-ins.

## The Pits: the fighters now move like the movement study

- **The live Pits uses the new movement.** Each resolved exchange is drawn as one movement for both fighters, from the pose they are in: the cut on a step or the thrust on a short lunge, the parry and the sword turned down, a partial parry held and then driven through, a miss carried through a step, a landed blow with the hit reaction, and the fall when a blow ends the fight. Nobody goes back to a common standing pose between exchanges.
- **Decisions stop the scene.** The stage runs on one clock: a choice or a roll stops it, a contact holds it for a moment, and it resumes from the same frame. The attack does not move until its result is known.
- **Range changes are steps,** never a slide, and the distance between the fighters now comes from the weapon lengths.
- **A partly parried blow no longer shows its wound early:** the plates take the damage when the blade reaches the body.
- Other weapons, shields, trips, disarms, standing up and yielding use simple stand-ins for now (listed in `docs/pits-animation-direction.md`). The earlier poses are still there for comparison: add `?stage=poses` to the Pits address.
- The movement study page is now stamped like the other pages, so returning visitors get its newest version.

## The Pits movement study: five connected exchanges

- The study page (`experiments/pits-choreography.html`) now plays one fight of five exchanges as a single movement: each exchange starts in the pose the last one ended in, the attacker changes, and the scene stops twice where a decision would be made. A button starts from any exchange. Press Advantage stays as a second tab.
- The fighters stand closer and the sword's cut is tighter: one step of the front foot, the hilt beside the head, then hips, shoulders, arm and blade in turn.
- A missed cut carries the body through a step and ends on a wide stance; the sword fighter's empty hand guards in front or trails behind as a counterweight; the dagger's counter goes in above a sword that has dropped beside its owner; the finishing fall tips backward and buckles, with the dagger arm dropped.
- The Pits itself is still unchanged.

## The Pits movement study: second pass

- **Three exchanges, one fight** is the new first sequence on `experiments/pits-choreography.html`: the sword cuts and is parried, the dagger counters and wounds, the sword comes again and lands. The attacker changes, there are two decision pauses in the middle of the action, and each exchange starts from the pose the last one left.
- **Closer and tighter.** The fighters stand closer; the sword cuts from the shoulder with one lunge (no overhead wind-up, no long advance), and the dagger has to step in to reach.
- **A clear counter.** The dagger fighter's empty hand holds the sword overhead by the wrist and the dagger goes in underneath, instead of crossing the lowered blade.
- **The miss** is caught with a step instead of a squat. **The empty hand** balances or guards instead of folding behind the back. **The collapse** is a failed catching step and a fall, with the arms slack, instead of a sit.
- The Pits itself is still unchanged. Details and remaining compromises: `docs/pits-animation-direction.md`.

## The Pits movement study: the sword is held, not hinged

- On the study page the blade used to turn in the hand as if on a hinge. The weapon is now gripped: its angle follows the forearm, with only as much turn as a wrist has, so moving the blade means moving the arm. Cuts land with the sword in line with the arm, the wind-up carries it overhead, and a little of the hilt shows behind the hand.
- The five sequences were re-posed to suit (the miss now runs out low and is lifted back up; a landed cut is drawn down and out). The Pits itself is still unchanged.

## The Pits: movement study (animation direction)

- **New page, `experiments/pits-choreography.html`:** five short fights between a broadsword and a dagger that show how the stick figures should move: an attack, parry, counterattack, hit reaction and recovery as one continuous motion; a miss; a damaging hit; Press Advantage; a fight-ending injury. You can pause, step a frame at a time, slow it to quarter speed, drag to any moment, and switch on weapon paths and planted feet.
- This is a demonstration only. **The Pits itself is unchanged**: nothing is wired in yet, and no rules or saved data are touched. Every result on the page is fixed in advance; nothing is rolled.
- The direction, what is and is not demonstrated, and a short list of small defects in the current stage: `docs/pits-animation-direction.md`.

## The Pits: continuous combat animation

- **One exchange, one animation.** A blow is shown only once its whole exchange is resolved: any Endurance or resist roll that follows the contact is done first (rolls stay manual, in their usual order). The contact then flows straight into its real consequence: a fight-ending hit goes from contact into the collapse, with no reset and no second hit. The plates, wounds and chronicle change at the contact moment, not when the engine logged them.
- **Decisions pause the scene.** While you choose or roll, the figures, trails, particles and camera hold their exact pose together and resume from the same moment; dice and buttons stay live.
- **No compulsory idle.** Recoveries go to a ready stance, a fighter relaxes only after a real lull, and joint speed carries into the next motion. Beats are paced by the animation, not by timers.
- **Better movement.** Hips and legs lead, shoulder, elbow and weapon follow; strikes accelerate into contact; feet stay planted and step instead of sliding; a failed parry shows the guard beaten aside.
- **Press Advantage** has its own paired look (the aggressor pressing, the opponent covering) that lasts exactly as long as the effect and is named briefly. Nothing is added: no range change, damage or extra attack.
- **Finishing consequences are specific:** a disabled leg buckles then falls, a disabled arm hangs limp with the weapon leaving the hand, incapacitation collapses at the contact, a concession bows. Nothing is inferred about severing.
- Fixes: contact now waits for the strike to arrive (it was a fixed timer), banners clear themselves, a resisted wound no longer draws a limp arm. Diagnosis and limits: `docs/pits-animation-batch-20261112.md`.

## The Pits: every blow animates like the parry, and the replay flows

- **Same treatment as the parry.** The parry works because everything is aimed at one contact point, with impact effects there and a follow-through. The other outcomes now get the same care: a body hit freezes for a few frames at contact (longer for bigger damage), pushes the scene in slightly and throws the defender back further the harder it lands. An evade carries the strike through into an overextension with a swish at the near miss; a miss gets a swish too. Trips and disarms get the same spark, ring, freeze and push-in.
- **Replay paced by the animation.** The replay no longer waits fixed times per chronicle line. Each beat starts the moment the previous animation finishes, the fight opens on the first real attack (no dead initiative beats), the hit-location reticle beat is skipped, and the figures are still settling as the next attack winds up. A recorded replay of a short bout went from about 13 beats and 9 seconds to 8 beats and about 4 seconds, with no idle gaps.
- No rules or saved data changed. Parry timing is untouched.

## The Pits: Serious Wounds to the weapon and shield arms

- A Serious Wound to an arm that fails Endurance now drops what that arm holds unless strapped on (Core p.110): a one-handed weapon falls at the fighter's feet. A shield stays on its arm but the arm cannot use it. A two-handed weapon is not lost but cannot be used with one arm. A resisted wound never drops anything.
- Getting a dropped weapon back takes a working, free hand and two actions (Pick Up, then Ready; Move to Weapon first when it is far). It ends up in that hand, so a fighter whose sword arm is out fights on with the other. A hand kept busy by a strapped shield is not free; a fighter with no free hand can only use the shield or concede.
- A fighter can now be left-handed (a checkbox in the setup forms): the weapon goes in the left hand and the shield on the right arm.
- The disabled shield arm can no longer parry, strike or choose a Ward Location with the shield. The weapon arm is unaffected.
- **Switch Weapon Hand** is now a Free Action (0 AP) between two working hands, with no readying step (app policy, not Core RAW, labelled as such; see `docs/decisions.md`). It no longer ends the turn and is not offered with a shield, a useless hand or a dropped weapon. It replaces the old 1 AP switch that was only possible after the weapon arm failed.
- Between Hardcore fights the weapon is picked up again, in a working hand.
- The arena now draws a dropped weapon on the floor and keeps a resisted-wound weapon in the hand.

## The Pits: fight replay, result screen back, range by weapon length, scoring removed

- **Replay fight:** after a fight, a **Replay fight** button (in the end panel and on the Victory/Defeat window) plays the whole fight again as fight animations only (no dice, no tray, no Continue stops, no choices), back to back like one fluid fight. It starts both fighters at full health, steps the range and the wounds as they happened, and ends on the real result. **Stop replay** (or Quick pace) cuts it short. Nothing in the fight changes.
- **Result screen:** closing the Victory/Defeat window no longer loses it. A **Show result** button in the end panel opens it again.
- **Range meter:** the label under the arena now names the range by weapon length: the longer weapon's reach (Medium range, Long range, Very long range) while it controls the distance or the weapons are about even, and Close range once the shorter weapon has closed inside. Apart still shows the gap. During a replay it follows each beat's own range.
- **Removed:** Glory, Momentum, Pit Marks (and their toast), the bout recap ("Pit Marks and streaks", hits and damage totals, moment of the bout) and the win-streak lines on the end screens. The Sound switch and the hit shake stay. The Gauntlet leaderboard on the setup screen is untouched.
- No rules or saved data changed.

## The Pits: five bottom-third layouts to choose from

- The bottom of the battle screen can be drawn five ways, picked from the new **Bottom** list in the top bar (also `?bottom=A` to `E`): **A** Command bar, **B** Duel table, **C** Ground dock, **D** Step flow, **E** Odds first. The current layout stays the default and the choice is remembered in the browser. The list is temporary: it goes once the owner picks one.
- All five use the real game: the engine's own actions, costs and AP, the real target and odds, the reaction choices, and the last exchange read from the log (rolls, grades, result). The chronicle panel is gone from these layouts; **A**, **C** and **E** have a history button that opens the full list in a window.
- **D** and **E** are select-then-confirm; number keys select (1 to 9) and Enter confirms. In **A**, **B** and **C** the number keys act at once.
- **D** shows the opponent's body map with real hit points and armour for context only. The attacker does not choose a hit location before rolling in this ruleset, so nothing there is aimed. **E** shows your target, their Evade and their Parry, not a combined hit chance, which would be invented maths.
- Desktop only: phones keep the current layout. No rules or saved data changed. Notes: `docs/pits-bottom-layouts.md`.

## The Pits: one-screen polish and faster, smoother exchanges

- Reaction choices (Parry, Evade, Do Not Defend) sit side by side, and the prompt is capped so the exchange breakdown always keeps room. Every action and every choice is reachable without scrolling at 1280×720, 1366×768 and 1440×900.
- Short windows: smaller plates, body diagrams and dice tray, so nothing covers the fighters' heads or the contact point.
- The chronicle header is one row (title and entry count); the deck always lists everything and scrolls.
- Timing: a beat now lasts about as long as its own motion (attack and parry about 0.35 s, hit about 1.1 s). The dice tray is the reading pause.
- Fewer stops: the Continue checkpoint between automatic actions waits only when Guidance is on; otherwise play moves on after half a second.
- The arena HUD (plates, strip, tray) is only rewritten when its content changes, so chip and tray animations no longer restart on every beat.
- Fighters get a faint glow in their own ink, and a step with dust when the range changes.
- Phone layout is untouched; the owner may drop the Pits from mobile. No rules or saved data changed.

## The Pits: one-screen battle shell and held exchange poses

- On a desktop window the battle now fills exactly one screen and the page no longer scrolls: the arena takes the top, the command deck the bottom. The chronicle sits in the deck's third column and scrolls inside its panel; the exchange breakdown is under the prompt; the actions are a compact two-column list.
- Rules notes and the Special Effects catalogue open in a window from **Rules**. A **Full screen** button is in the top bar.
- Animation: the attacker stays wound up and the defender stays in guard until the blow resolves, including while a person chooses a reaction or rolls. Before, both drifted back to a standing pose between steps.
- What is left (layout polish, timing, phone) is listed in `docs/pits-one-screen-plan.md`. No rules or saved data changed.

---

## The Pits arena: full-screen battle and truthful strikes (visual review batch)

Built from `docs/pits-visual-review-20261111.md` (VIS-01 to VIS-08). Combat rules, dice, saved data and prompted rolls are unchanged; this is presentation only.

- **Full-screen battle:** the Sit’ota navigation and the phone tab bar are gone while you fight; **Exit Battle** stays in the top bar and brings them back. At 1280×800 and 1440×900 the fighters, the dice (top centre) and your current decision are on screen together. The chronicle runs the full width below.
- **Strikes aim at the struck place:** hand, weapon tip and lunge are solved for the location the engine resolved, so a head, torso and leg strike meet at different heights, and a thrust (spear, trident, whip) moves differently from a cut. The damage number and the blood appear at the point of contact. Left-handed wielders and shield bashes use the right arm.
- **Parry and armour are drawn for what actually happened:** a full parry or ward stops the blow in front of the body, with weapon or shield contact and a recoil. A partial parry shows the deflection, then only the residual hit. Armour that absorbs a blow gives a neutral spark and "Armour −N", with no injury or flinch. An evade goes through empty air (and the evader goes prone, as the engine says). Misses and fumbles go wide. Sparks are never blood-red.
- **Honest labels:** a critical attack roll says "Critical attack" at the roll stage; nothing is called a hit until the blow resolves. A successful defence roll alone no longer decides the picture.
- **Lodged weapons and entanglement from engine state:** a weapon stuck in a limb is drawn in that limb while the engine says it is there. If the wielder still has hold, they stay reaching into the wound; if they let go, they are unarmed and the weapon stays; when withdrawn, it is back in hand. An entangling weapon is drawn as a line to the entangled limb.
- **Current and previous exchange:** the deck shows the current exchange with its result in words and arithmetic (damage − parry − armour = HP lost, location before and after), and the one before it separately. The new exchange starts empty. The dice tray keeps the newest result instead of falling back to an older roll.
- **Neutral range wording:** "Engaged" replaces "Matched reach" when no reach advantage applies. The round strip keeps initiative on its own row and stays inside its lane with long names.
- **Safe cancellation:** Show results, a new bout, Exit Battle and Quick pace cancel running animation and snap to the engine's state, with no late blood, duplicate weapons or old banners.
- **More weapons drawn:** dagger, falchion and sabre, rapier, greatsword, hatchet and axes, club and mace, pick, flails and chains, quarterstaff, trident, halberd, spears of each length, whip and net.
- **Structured facts instead of parsing prose:** the engine now attaches the resolved facts of each blow (exchange id, tool, parry or evade result, damage, parry/ward/armour reductions, HP before and after) to its log entries as extra data; the log text is unchanged. The weapon lodged in a wound is recorded so an abandoned weapon can be drawn. `tests/fixtures/pits-golden.json` was regenerated: only the state hash changed (it covers that extra data); every log line, decision and final state is identical.
- **Evidence:** `tests/visual/pits-scenarios.cjs` plays 18 scripted exchanges in a real browser (both fighters human, dice queued) and checks HP, AP, outcome and the exact contact geometry, with screenshots frozen at contact; `tests/visual/pits-layout.cjs` checks layout at both sizes and cancellation. Results and what is not covered: `docs/pits-visual-checks.md`. Unit tests: `tests/pits-stage.cjs`, `tests/pits-arena.cjs`.

---

## The Pits arena redesign (animated stick-figure fight screen)

The fight screen in The Pits now follows the the-pits-mythras prototype, but runs on the Forge's own combat engine. Same rules, dice, Action Points, Special Effects and log; new look and flow.

- **The arena:** two stick figures duel on a stage. Each fighter has a plate (name, weapon, Combat Style and Evade, a body map with HP and armour per location, AP pips and conditions). A strip shows the round, whose turn it is, the range and initiative.
- **Dice tray at the top:** the player's roll waits for the Roll button (or Space), with the target and an odds band; computer rolls play automatically. New **Auto-roll** toggle presses Roll for you.
- **Animations follow the real result:** lunge on a hit, parry sparks and "Parried", an evade that leaves a ghost, blood and a damage number where the blow lands (or "Armoured"), Trip Opponent (down, or "Stays up"), Disarm Opponent (the weapon flies and stays on the floor until picked up), Choose Location and Hit Location (a target ring), Critical hit / Fumble / Serious wound / Useless arm / Legs gone banners, and Victory or Defeat poses. Beats wait for their animation; Quick pace shortens them.
- **Injuries stay on the figures:** any body part that has lost HP turns red, darker at Serious and Major. A disabled weapon arm hangs limp, a prone fighter stays down, a disarmed fighter has no weapon. Fighters draw their real weapon (sword, dagger, greatsword, mace, axe, spear) and shield.
- **Command deck:** every action with its AP cost and, when it is not available, why; the current prompt (reactions, resist choices and so on, with the engine's own buttons); the exchange breakdown; the combat chronicle.
- **Windows:** Special Effects and Choose Location open as windows over the arena, with the engine's own choices.
- **Look:** Stone tokens, Light and Dark, desktop and 390px. Fighters are neutral ink, so red only ever means injury.
- **Old layout:** `?layout=classic` on the arena page brings the previous fight screen back. `?stage=duel` opens a ready-made Sword v Spear fight at the opponent intro.
- **Code:** `experiments/pits-stage.js` (scene and animation), `pits-arena.js` (screen layout), `pits-stage.css`, `pits-arena.css`; both only read engine state. `tests/pits-stage.cjs` and `tests/pits-arena.cjs` check cues, layout, that every button is one the engine handles, and that seeded bouts play out identically with and without them.
- **Not drawn yet:** Impale (a lodged weapon is shown as an "Impaled" condition only), entangle, and fine range steps (the gap follows the engine's reach and separation).

## Spirit Combat and casting restrictions (Subsystem 6 follow-ups)

Built from `docs/core-source-followups-20261111.md` (AN-F06, AN-F07, SO-C02; Core pp.119, 131, 137–138). Policy: D-9.

- **Spirit Combat:** Play Mode → Spells has a Spirit Combat card. Enter the spirit's name (or pick a recorded one), its Spectral Combat % and MP. Each exchange, choose who attacks and enter the GM's d100 for the spirit; the app rolls your Binding (or Willpower without it). An unparried hit drains Magic Points by the Spirit Damage table, never Hit Points; a recorded spirit's MP is kept in step.
- **Effects:** the winner of the differential may take that many effects, and only the ones its side may legally take (offensive or defensive, critical-only, Spirit Fumbles, mortal-only, spirit-only, possession). Spirit Lance takes the better of two damage rolls; the GM applies the rest.
- **Defeat:** at zero MP the loser is helpless. Nothing happens until the GM picks the outcome (Possession, Binding, Exorcism and so on) and ticks that it is decided; it is saved.
- **While invoking (SO-C02):** with a multi-turn Sorcery casting under way, attacks, other skill rolls and other spells are refused (cancel the casting first). Parry and evade are allowed; after one, the GM can make the final Invocation roll up to two Grades harder.
- Tests: `tests/spirit-combat.cjs`. Checked headless at 390px (light) and 1280px (dark).

## Fix: the Cult step is back in character creation (Severity 1, #284)

Work's live check of Organisations (`docs/organisations-live-283-20261111.md`) found the Cult step unreachable: it had been taken out of both creation flows earlier ("to revisit later"), so the Organisations features from #283 had no way in. Restored at the owner's request.

- **Cult** now sits between Community and Passions in quick and full creation.
- Saved drafts keep the screen they were on: a step at or after Passions moves up by one, and GM overrides move with it (flow version 3). This runs once, after the older Community migration.
- Tests: `tests/organisations.cjs` checks both flows (names and screens line up, Next from Community reaches Cult, the archetype picker shows, the step is optional) and the migration; `tests/rules-smoke.cjs` now checks that old saves land on the same screen through both migrations. Checked in a headless browser by clicking Next from Community in both modes.

## Organisations: promotion, training discount, leaving (Subsystem 6)

Built from `docs/magic-organisations-code-cases-20261109.md` (OR-C01–C03; Core pp.196–200). Policy: D-8 in `docs/decisions.md`.

- **Starting rank:** on the Cult step the rank picker is now the starting rank. Above Common asks for the GM's approval (a veteran character) and says so on the page. After a promotion it is locked.
- **Promotion (OR-C01):** enter years at the current rank and mark which skills the GM counts as cult skills. The Promotion card shows each requirement for the next rank (skills at the threshold, years, and any gift or service for the GM to judge). Promote needs the GM's tick; meeting the numbers never promotes by itself. A GM override can promote without them and is logged.
- **Training discount (OR-C02):** shown on the Cult step and in Improve Skills → Train with a mentor, as a guideline on the price of training from the organisation. It never changes skill % or Experience Rolls.
- **Leaving or switching (OR-C03):** asks first, keeps the organisation's skill on the sheet and a dated record under Membership history, and ends its discount. A miracle from a cult the character left can't be learned or chosen as starting until they rejoin. A pick made today with nothing recorded is treated as a correction, not a departure.
- Older saves keep their cult and rank, and their starting-magic review stays valid.
- Tests: `tests/organisations.cjs`. Checked headless at 390px (light) and 1280px (dark).

## Sorcery and Theism: learning new spells and miracles, starting miracles (Subsystem 6)

Built from `docs/magic-sorcery-code-cases-20261109.md` (SO-C01) and `docs/magic-theism-cults-code-cases-20261109.md` (TH-C01, TH-C02); Core pp.118, 161, 179–181.

- **Acquired (SO-C01, TH-C02):** each Sorcery spell and miracle on the Magic step now records how it was acquired: Starting ability, Learned in play, or Reference only. A newly added one can't be cast or combined until this is chosen; a Reference entry is never castable and Play Mode tags it.
- **Learn in play:** a Reference or new entry has a Learn button. It needs the source (grimoire, school or teacher; the cult for a miracle), the GM's tick for the month of study and approval, and 5 banked Experience Rolls, which it spends. A miracle also needs its level, its cult and a rank that grants it. The date and source are kept and shown, and the Experience Roll log lists it.
- **Saved spells and miracles** from before this change are marked "Recorded before tracking": still castable, never charged.
- **Starting miracles (TH-C01):** choosing Starting ability for a miracle checks its cult, its level against that cult's rank, and the count: one per 20% (or part) of that cult's Devotion, counted per cult. More needs the GM's approval, which is saved with the miracle.
- Tests: `tests/magic-learning.cjs`. Checked headless at 390px (light) and 1280px (dark).

## Mysticism: Augment Skill on real rolls, concentration, switching Talents (Subsystem 6)

Built from `docs/magic-mysticism-code-cases-20261109.md` and the MY-C03 ruling (Core pp.155–157).

- **Augment Skill (MY-C03):** an Augment Talent can be linked to a skill on the Magic step ("Augments skill"). While it is learned and active, that skill is one Grade easier per Intensity, after any harder Grades, and never easier than Very Easy, so extra Intensity soaks up later penalties. The shown %, the roll and the log all use the same Grade, and the Grade reasons list the Talent. Automatic and Hopeless are not moved.
- **Disrupted (MY-C02):** with Talents active, Play Mode → Spells → Mysticism has a Disrupted button. It lists every active Talent with its own Roll Willpower, Held and Lost buttons; only the ones marked Lost end. The GM decides what counts as a disruption and the opposing roll.
- **Switching Talents (MY-C01):** at the half-POW limit, ticking Learned on a new Talent opens a switch: choose the Talent it replaces and tick that the GM confirms the Core p.157 retraining. Stopping practice asks first and keeps the Talent recorded. Every change is logged under "Practice changes".
- Play Mode now has Mark active / End Talent on each Talent, and builder messages for Talents show on the Magic step (they used to appear only in Play Mode).
- Tests: `tests/magic-mysticism.cjs`. Checked headless at 390px (light) and 1280px (dark).

## Animism: Trance purposes, summoning, bindings and fetishes (Subsystem 6)

Built from `docs/magic-animism-finish-20261109.md` (Core pp.131–137). All in Play Mode → Spells → Animism.

- **Trance (AN-F01):** choose what it's for. Each animist rank sees only the purposes the Core p.131 table allows (Converse from Spirit Worshipper, Project Self and Draw a Spirit from Shaman, Drag Souls for a High Shaman), each with its own preparation time. A critical still saves one step. A higher purpose reminds you that an unwilling target resists with opposed Willpower, which the GM calls.
- **Summon (AN-F02, AN-F03):** each spirit has a Summon button. It needs a named spirit, a distance within your Binding % in kilometres and MP equal to the spirit's Intensity, which is spent on the attempt. A critical brings it in 1d3 rounds and a success in 1d4 minutes. A failure lets you retry the following day ("Rest one day" clears it). A fumble suspends the bond until the GM confirms amends. On arrival you record its attitude, who won its Willpower against your roll, and the service agreed; the GM applies the Core p.137 table. Summoning never marks a spirit bound.
- **Make a binding (AN-F04):** for a spirit acquired by bargain or Spirit Combat, choose a fetish, location or creature. The Experience Roll cost (one per Intensity; an upgrade of the same vessel type costs the difference) is shown at the start and charged only when the GM confirms the work is complete. A binding made for someone else uses their spirit slot, not yours, and they command it.
- **Fetish spirits (AN-F05):** Release is a Free Action and shows the spirit's range (its POW in metres). Return costs 1 Action Point in a fight and no MP; a neutral or hostile spirit makes you roll Binding.
- **Not built:** Spirit Combat (AN-F06–F07) stays GM-managed until the p.131 Spirit Damage table and the p.138 effect list are transcribed.
- Tests: `tests/magic-animism.cjs`. Checked headless at 390px (light) and 1280px (dark).

## Subsystem 7 reclosed; item 2 Ready

- Work's recheck after #275 passed all three creature HP checks (`docs/creature-hp-live-275-20261110.md`). Session Zero item 2 is Ready and Subsystem 7 is closed again. Session readiness 13 of 14; 7 of 8 built, 7 closed.

## Creature characters: arms and legs keep their HP (Severity 1)

- **Fix:** a GM-approved creature character's Right/Left Arm and Leg showed 0/0 HP in Play Mode and after reload (Work, `docs/session-zero-live-273-20261110.md`). Play Mode looked their maximum up under the human "Each Arm"/"Each Leg" rows; a creature now uses its own entry's HP for every location. Damage, permanent-injury maximums and the party board use the same lookup. Human characters are unchanged.
- The Attributes step, character sheet and Markdown export now list a creature character's own locations, ranges and HP (and natural armour on the sheet and export) instead of the human seven.
- The Concept note no longer says Play Mode tracks only human locations; The Pits still refuses creature characters.
- Tests: `tests/creature-pc.cjs` (Work's winged fixture: every location, a wound surviving reload, party board, permanent injury, Attributes, sheet, Markdown; a human still shares Each Arm/Each Leg).
- Status from Work's report: Session Zero item 14 (restored tracker opens) is Ready; item 2 waits on the HP recheck. Subsystem 7 reopened until that recheck passes. Session readiness 12 of 14; 7 of 8 built, 6 closed.

## Typed boxes keep every entry; Subsystems 7 and 8 closed

- **Fix (every character, not only creatures):** typing a number into an allocation box and moving to the next one rebuilt the page under the next box, so its entry was lost. Culture points typed box by box stuck at 50/100 (Work, `docs/session-zero-live-20261110.md`); with Tab only every fifth box counted. Any text or number field that re-renders on change now waits until focus has moved (keyboard) or the click is over (mouse), then puts focus back on the new copy of the field. Checkboxes, selects and buttons render at once, as before.
- **Fix:** on the Concept step, pasting a creature's stat block and then ticking "My GM approved" at normal click speed lost the tick, so "Use this creature" refused it. The tick is now kept in state.
- Tests: `tests/render-focus.cjs`. Checked headless in Chromium: culture 100/100 by fill, click, slow click and Tab; a creature character completes Culture and Career.
- **Subsystem 7 (Creatures) and 8 (Campaign) closed** under the revised close rule, with Known limits in `docs/subsystem-plan.md`. Session readiness 11 of 14 (items 9 and 10 Ready); 7 of 8 built, 7 closed.

## GM tracker: cards from a backup always open (Subsystem 8 recovery follow-up)

- Work's live restore check (`docs/subsystem8-recovery-live-20261110.md`) found that a backup whose tracker cards lacked fields (here: no AP) restored fine but then broke GM Tools ("Cannot read properties of undefined (reading 'max')").
- Tracker cards are now filled in when a backup is restored **and** whenever saved GM state is read, so a campaign already holding such cards opens too. Missing AP gets the new-card default (2). Saved HP is kept. A location with no HP shows 0 / 0 for the GM to fill in, and a card with no locations gets none; no HP is invented. Unreadable effects and entries are dropped.
- Restore now refuses a file whose tracker isn't a list, has a card that isn't readable, or has an unreadable creature, before anything is written.
- Tests: `tests/campaign-restore.cjs` (sparse cards restore and draw; a sparse saved tracker opens and is filled in place; three new refusals).

## Restore campaign from backup (Subsystem 8, D-S6 option B)

- **Campaign page > Restore from backup:** choose a `.campaign.json` file. The file is checked first (format, version, 20 MB limit, every character, custom item and GM state), then a preview shows the campaign name, backup date and what it holds. Nothing is written until **Restore as a new campaign**.
- It always makes a **new** campaign, "<name> (restored)", run by you: rules and home settings, briefing, GM notes and tracker, and custom content. You tick which characters to copy; each becomes a new character of yours in the new campaign, and tracker cards point at the copies. Nothing existing is overwritten; members aren't copied (players join with the new code). If a step fails, the message says what was already restored.
- **Import character backup** now accepts a campaign backup and lets you pick one character from it (a new, unlinked character).
- Fixed the `buildCampaignBackup` comment, which said its characters could already be re-imported. Tests: `tests/campaign-restore.cjs` (backup → restore round trip, local and signed in). Not live-checked; progress stays 5/8.

## Creatures: Rabble and Underlings, Vulnerable and Intimidate fixes (Subsystem 7)

- **Rabble and Underlings (optional, Core p.111, CRTR-C21–C26):** each creature card in the GM tracker has "Fights as": a normal creature (default, unchanged), Rabble or Underling. Either mode uses one HP figure for every location, one fifth of the average CON+SIZ (from the dice), rounded up; per-location HP is hidden. Rabble get no Special Effects and leave the fight at the first injury: below the HP they flee, at it they collapse, at double they die. Underlings keep Special Effects; at the HP they automatically fail Endurance and take the Serious Wound; double kills; a second injury makes them withdraw. Group morale counts creatures with the same name and mode: a third of Rabble down and the rest flee; half of Underlings and the rest withdraw (announced once, shown on each card).
- **Add several at once:** "How many" (1–20) next to "Add creature to the fight"; copies are numbered.
- **Vulnerable (B15, PR #230 reading of Core p.218):** the listed source now skips the creature's natural armour only; worn armour still counts. **For Chat to confirm** against p.218.
- **Intimidate (B17, Core p.216):** a Critical now ignores the creature and its brethren (tracker creatures with the same name). New "stopped threatening" ends holding, falling back and fleeing; Critical immunity stays for the encounter.
- CRTR-C03-W (wing/tail wound class) was already built and tested (`tests/creature-pc.cjs`). Tests in `tests/creature-cases.cjs`. Not live-checked; progress stays 5/8.

## Site home page keeps what you typed (#258)

- **Account → Site home page:** "Use the default painting" or choosing a picture no longer clears the Quote, Said by and Picture credit you'd typed but not yet saved (found in Work's live check, `docs/site-admin-verification-20261109.md`). The typed text is kept until Save succeeds, and is cleared if a different account signs in. Test in `tests/site-admin.cjs`.

## Improve skills: no guessed 1d4 while campaign rules load (#255)

- **Finding (live check #255):** a 1d6+1 campaign's linked character showed "+1d4+1%" in the Improve skills help. The help and the roll both read the same `skillImprovementDie()`, so once the campaign's rules have loaded they always agree (1d6+1 under the option, Core p.72). The mismatch came from the help text guessing 1d4 while the rules were still loading or had failed to load. In that state no roll is ever spent: the Spend button is refused. **The mechanics never rolled the wrong die.**
- **Fixed:** while loading, the help says the campaign's rules are loading. If they failed, it says so, shows the reason and offers **Retry**. Spending then explains that the rules didn't load instead of "still loading". Standalone characters still show Core 1d4+1.
- Test added in `tests/advancement-options.cjs`.

## Site admin: change the Home quote and picture from the site

- **Account → Site home page** (site admins only): set the quote shown at the top of Home for everyone, signed in or not, and who said it. Upload a new Home picture or go back to the default painting, with a credit line for it. Pictures are resized in the browser to 1920px wide.
- A campaign's own quote, set by its GM, still shows first for that campaign's players.
- Admins are listed in the database only (`site_admins`); nobody can make themselves one from the site. New migration `20261110120000_site_admin_and_settings.sql`; setup steps for the owner's account are in `docs/site-admin-setup.md`. Until it runs, Home looks exactly as before.
- Tests: `tests/site-admin.cjs` (page) and four new database permission tests (everyone reads, only admins write, only a JPEG picture, the admin list is private).

## The Pits header in sentence case

- The Pits header now reads "Sit’ota · The Pits" and "The Pits" in normal case, matching the rest of the site. Before, both were in wide-tracked capitals (found in the live check of the Stone reskin, `docs/live-check-stone-20261110.md`).

## Sit'ota "Codex · Stone" look, Light and Dark

- **One look everywhere (owner's v0 handoff, 2026-11-09):** every page, including the Forge, Play Mode and The Pits, now uses one set of stone-grey colours with a single crimson accent, in Light (default) and Dark. Fonts are Fraunces for headings and numbers and Public Sans for everything else; the other seven fonts are gone. Cards have the double "bound journal" rule, buttons and fields have small square corners, and headings are in sentence case.
- **Light / Dark** is in Settings on the Account page and in Play Mode's Settings: Light, Dark or Match device. It's remembered on this device and applied before the page draws, so there's no flash.
- **Renamed:** "New Sit'ota" is now "Sit'ota" throughout.
- **Home:** the painting fills the top of the page behind a see-through top bar. Over it: the campaign's quote and the next session. The GM sets both in the campaign manager's new **Home page** panel (stored with the campaign; no database change). With no quote set, Home shows the Sit'ota title. The hero's Continue card is gone; an unsaved character in progress now shows under Your characters instead.
- **Character cards:** show race, then culture and career. The combat style and Action Point chips are removed.
- **Top bar:** text links only, crimson underline on the current page, round account seal. The logo switches between its light and dark versions.
- **Forge:** paper main column, every step shows its number (no tick glyphs), stat numbers in Fraunces.
- **Play Mode:** the default colour scheme is now **Stone** (follows Light/Dark), replacing Verdigris; a saved Verdigris choice falls back to Stone. The other eight schemes stay. Primary buttons are inverted ink; crimson marks wounds and failures.
- **Party Board:** the Refresh button is plain text (no broken icon box); its health bars use the new colours.
- Not changed: routes, saved characters and campaigns, rules, sign-in and Supabase. The painting is still the existing art with its credit; swap in owned art when it's ready.

## Phone More menu, Pits display fixes, Animist Trance

- **More menu (phone):** choosing Rules, World Guide or Account now closes the More sheet. Before, it stayed open over the new page (live batch 2026-11-09).
- **The Pits:**
  - A new bout starts with an empty "Last roll" instead of the previous fight's last roll.
  - The Impale choices (pick damage, keep hold or let go, resist withdrawal) and trip resistance now show their own guidance instead of the generic Attack/Delay advice.
  - The exchange recap stops where the next action or round begins, so a later wound isn't shown under an older "misses" headline.
- **Trance (Animism, AN-C01, Core p.131):** a "Roll Trance" button on the Animism section of the Magic tab. It costs 1 MP and shows the time to Observe the Spirit Plane for the animist's rank: Follower 1 hour, Spirit Worshipper 1 minute, Shaman 1 round, High Shaman 1 Action. A critical saves one step. A fumble bars Trance until "Rest one day".

## Creature characters track their own body; hurt while casting

- **Creature characters in Play Mode (CRTR-C03):** a GM-approved creature character now has its own hit-location boxes: the entry's locations, d20 ranges, HP and natural armour, instead of the seven human ones. Damage goes through natural armour, wounds are tracked per location and saved, and the GM's combat tracker takes the same locations. A location ending in Arm or Leg counts as a limb for wound effects.
- **Hurt while casting (D-5, Core p.119):** the Magic tab has a "Hurt while casting" choice. Minor Wound: roll Willpower, a failure makes the casting roll one grade harder. Serious Wound: one grade harder on a success, two on a failure. Major Wound or mental domination: the casting fails, with no roll. The app never guesses this from HP.

## Combat engine: Play Mode and The Pits now agree (D-CE1 to D-CE4)

ChatGPT's rulings on the differences found when the combat engine was shared.

- **Failure against Fumble wins one Special Effect** in Play Mode too, as it already did in The Pits (Core p.94). The contested roll calculator for non-combat contests is unchanged: two failed rolls gain nothing (Core p.51).
- **Difficulty grades round up** in Play Mode, as in The Pits (D-4): 65% at Hard is 44%, 80% is 54%. This covers skill rolls, spell casting and unfamiliar weapons.
- **Names:** The Pits says "Wearied" (the Fatigue table's name). Play Mode's effect is "Weapon Malfunction", still firearms only; older saved roll logs are renamed when loaded.
- Bypass Armour stays as it was: stackable in Play Mode, once per exchange in The Pits (one armour layer).

## One shared combat rules engine

Nothing you can see changes. The Pits and Play Mode now work their combat numbers out with the same code, so a rule fixed once is fixed in both.

- **New `js/combat-rules.js`:** Action Points, Initiative Bonus, Healing Rate, Hit Points per location, Damage Modifier, the hit-location table, parry reduction, success levels, opposed rolls, Special Effects won and on offer, damage through parry and armour, wound levels and Serious/Major Wound outcomes, Bash, Knockback, Impale withdrawal, Damage Weapon and Disarm. Pure functions: no screen, no fight state, dice passed in.
- **The hit-location table is data.** A creature's own table can be passed in later; nothing creature-specific is built yet.
- **The Pits** keeps its prompts, narration, AI and screen and asks the shared rules for every result. Its Fatigue numbers now come from the site's Fatigue table.
- **Play Mode** uses the same functions behind its existing helpers (`apCalc`, `dmCalc`, `hpLocs`, `resolveRoll`, `parryDamage`, the differential table, wound tags, effect eligibility).
- **Proof it didn't change:** five complete seeded bouts (`tests/pits-golden.cjs`) recorded before the work play out identically after it, log line for log line. `tests/combat-rules.cjs` has a test for each rule with its Core page.
- **Cheaper to read:** no line of The Pits' script is over 200 characters (the longest was 7,282).
- **Differences found and left alone** for a ruling: `docs/decisions.md`, D-CE1 to D-CE5 (for example, The Pits gives a Special Effect for a Failure against a Fumble and Play Mode doesn't).

## Creature characters and entry abilities (CRTR-B18, B20)

- **Play a creature your GM approved** (Concept step, Core pp.218–219): paste its stat block and tick "My GM approved". A sapient creature with INT 8+ then becomes your species: its own characteristic dice and ranges, its Points Build pool (its averages added up, rounded up), its Move and its hit-location table. Culture and career work as normal. Your INT can't go below 8. Instinctive (INS) creatures and INT below 8 are refused.
- **GM Combat Tracker:** after ticking "GM permits it as a player character", the GM can copy the stat block for the player.
- **Entry abilities:** a creature stat block can now keep its own Ability, Poison, Magic/Spells and Weapon effect lines. The tracker shows them, and traits it has no controls for, as GM-resolved. Nothing is applied automatically.
- **Limits:** Play Mode's HP boxes and The Pits still use human locations. The sheet and Play Mode show the creature's own table, and The Pits doesn't accept creature characters yet.

## GM tracker keeps your place; campaign migration hand-off (live batch 2026-11-09)

- **Party Board redraws** (every 15 s and on each live update) no longer close the creature form or wipe what you typed. Open sections, typed-but-unsaved fields and the cursor are kept; a field the server actually changed shows the new value. A redraw can no longer start inside another redraw, which a field's change handler could trigger.
- **Server:** production is missing the November campaign migration (Work's diagnostics). `docs/server-install-20261109.md` gives Work the confirmed file, a pre-check and verification steps.

## Folk Magic specialist starting spells (D-4)

- The Folk Magic picker now shows a specialist career's starting spells, one tenth of the skill rounded up (e.g. 41% → 5). Before, it asked the GM to decide the rounding. Decided 2026-11-09 in `docs/decisions.md`, along with D-5 (interrupted casting, Core p.119), which is built in the first Magic batch.

## Fixes from the live batch of 2026-11-08 (#213)

- **Campaign server errors:** New code, Remove and Make GM now show the server's real error and code. Before, any "does not exist" error was reported as a missing server update, which hid the real cause. The campaign migration now asks the API to reload its function list. A read-only check for the owner is in `docs/server-check-20261109.md`.
- **Messages from another account:** status messages (campaign, menu, Play Mode, The Pits) are cleared when the signed-in account changes or signs out, so one account's error no longer shows on the next account's pages.
- **Deleting the open character:** its queued and failed saves are dropped and the sheet is closed, so sign-out no longer stops with "Character not found on the account".

## Creatures: body plans, Chaos Features, nonhuman Points Build (CRTR-B04 option, B18, B19)

Checked against the owner's Core PDF; see `docs/creature-cases-batch-1.md`.

- **Body plans:** the GM tracker's creature import can start from any of the 13 Core nonhuman hit-location tables (pp.276–277). You fill in each location's armour and HP; a missing HP is reported by name.
- **Chaos Features:** a creature with the trait can roll d100 on the Core table (pp.274–276). Each result is kept on the creature with a short summary of its effect, and can be removed. The GM applies the effects.
- **Creature as a character:** once the GM permits it, the card shows the Points Build pool (the species' averages added up, rounded up) and each characteristic's allowed range (pp.8, 219). B15 Vulnerable and B17 Intimidate were confirmed against the book with no changes.

## Fix: character sheet page scroll

- An older rule still locked the page in Play Mode on desktop, so the page scroll from #231 did nothing. It is removed, and the sheet is now a full screen tall, so scrolling down moves the header fully out of view. Columns keep their own scroll.

## New site header and campaign manager (v0 handoff, 2026-11-09)

- **Header (v0 "Style A"):** sticky 76px bar with line icons, a 2px gold underline for the active tab (no pills), and an account button showing your initial and name. Phones get a 64px bar, the five-tab bottom bar with a gold top line on the active tab, and a More sheet (Rules, World Guide, Account) with icons. Styles in the new `sitota-header.css`; the old per-page header overrides are removed.
- **Header on every page (owner):** The Pits fight page and the character sheet (Play Mode and the printable sheet) now show the site header. Play Mode's ☰ dropdown is gone; its Rules reference and Settings are header buttons. "Choose a character" and "Reset bout" sit under the header on The Pits. Printing still hides the header.
- **Scrolling (owner):** Play Mode's columns keep their own scroll, but the page itself now scrolls a little: the header scrolls away so the sheet fills the screen, and a column hands the wheel back to the page at its ends.
- **Campaign manager:** party cards first (sigil, tier and career, player, HP/AP/Luck, Open or View, Unassign), a New character card, your unassigned characters with Add to campaign, and table notes (GM edits with a Saved indicator; players read them). Side column: invite code with Copy and Copy invite link, New code with an inline confirm, members with two-tap Make GM / Remove, and collapsed GM tools (rename, backup, and Delete that needs the name typed). Rule settings show as chips. All existing handlers are reused.

## Creature resistances, senses, Intimidate and PC eligibility (CRTR-B15–B18)

ChatGPT's #227 review is merged (docs #228). The Chaos Feature table and anatomy presets wait for clear Core pp.274–277 page images from the owner.

- **Resistances (B15):** traits written with their source in brackets, e.g. `Trait: Immunity (fire, poison)`, `Vulnerable (silver)`, `Allergy (iron)`, are kept whole (commas inside brackets no longer split the trait). When a hit is applied, a source box appears and the source is checked before armour: Immunity takes no damage, Vulnerable ignores armour, Allergy notes contact at that location and leaves the armour question and effect to the trait (GM).
- **Senses (B16):** Camouflaged, Echolocation and Earth Sense show what they do and that they work only within their own sense and range, never as invisibility or detection of everything.
- **Intimidate (B17):** record each target's Willpower: Critical ignores the creature for the encounter, Success holds, Failure falls back next round, Fumble flees. Results stay until "encounter over"; a target who ignored it can't be intimidated again that encounter.
- **As a character (B18):** a sapient (INT) creature shows a GM-permission switch; an instinctive (INS) creature can't be a player character. Building one in the character builder needs the Core point-buy total and minimums (pp.218–219) first; not built yet.
- New cases in `tests/creature-cases.cjs`.

## Creature traits: head loss and Inject Venom corrected (fixes from the #225 review)

ChatGPT's review of #225 (docs #226, merged with this change) found two rule errors, both fixed:

- **Multi-headed (B09, Core p.216):** a head at 0 HP keeps its action. It loses it only when the GM ticks it **incapacitated or severed** (a tick per head on the card; it can be unticked). A head at 0 HP or less gets a prompt to resolve its wound.
- **Venomous (B12, Core pp.97, 218):** an ordinary hit never injects venom, however much damage gets through. Poison comes from the **Inject Venom** special effect, chosen on a successful attack *instead of* damage, and it gets through whatever the armour. The card has an "Inject Venom chosen" button; the old "got through armour" check is gone.

## Creature combat traits in the GM Combat Tracker (CRTR-B06–B14)

ChatGPT's #223 review is merged (docs #224): Core p.214 confirms INS stands in for INT. Anatomy presets (pp.276–277) wait for verified tables. The stat-block box is a transcription format, one item per line.

A creature card now shows controls for the combat traits it has (names as in its `Trait:` lines). Values specific to one creature (breath recovery, its poison, how an undead is destroyed) come from its entry via the GM.

- **Flying (B06):** an Airborne switch; while airborne it defends with Fly (from its Skills line) instead of Evade.
- **Leaper (B07):** record the opposed leap; only a win adds one natural-weapon hit.
- **Grappler (B08):** a reminder that its natural hits bring the trait's grapple; no other creature gets one.
- **Multi-headed (B09):** one extra action per working head (locations named "Head") beyond the first; a head at 0 HP or less removes its action, and the body is unaffected.
- **Breathe Flame (B10):** breathing costs 1 AP and starts the entry's recovery, counted down on the creature's turns; it can't breathe again until then. The card reminds the GM it's a cone with Evade to halve.
- **Trample (B11):** a target above half the creature's SIZ is refused; notes the doubled base Damage Modifier and stationary (AP) vs moving pass.
- **Venomous (B12):** after "apply after armour", says whether the hit got through armour (Inject Venom possible) or not (no venom).
- **Frenzy (B13):** a Frenzied switch; ending it reminds the GM to apply the trait's fatigue.
- **Undead (B14):** wounds don't incapacitate or fatigue it; records its binding location and the entry's destroy condition.
- New cases in `tests/creature-cases.cjs`.

## Creatures in the GM Combat Tracker (Subsystem 7, CRTR-B01–B05)

- **Add a creature from its stat block (B02):** the Combat Tracker has a new "Add a creature from its stat block" box. The GM pastes or types the entry from their rulebook, one item per line: characteristics (with dice), INT or INS, Move, hit-location rows (`1-3 Right Hind Leg 2/5`, natural+worn as `2+1/4`), `Weapon:` lines (ending "natural" for natural weapons), `Trait:` lines, `Worn armour ENC:`, `Skills:` and `Notes:`. Missing or unreadable lines are listed and block adding; nothing is guessed or filled with human defaults. No bestiary data ships with the app.
- **Instinct (B01):** a creature with INS uses it wherever INT would be: Action Points, Initiative and INT-based skill bases. A sapient creature keeps INT.
- **Armour (B03):** natural armour protects its location but adds no Initiative penalty; only worn armour ENC does (Core p.58). "Apply after armour" takes off natural plus worn armour at the location hit.
- **Hit locations (B04):** the creature's own d20 table must cover 1–20 exactly once, with no repeated names. "Roll hit location" rolls on that table, never the human one, so a wing or a tail stays a wing or a tail. The generic anatomy tables (Core pp.276–277) aren't built in yet.
- **Natural weapons (B05):** without the Formidable Natural Weapons trait, the card shows natural weapons can't parry (use Evade or armour).
- "Roll initiative for everyone" now adds a creature's Initiative bonus.
- New tests: `tests/creature-cases.cjs` (an invented test creature, not a Core entry).

## Magic: confirmed cult rank required, Core animist rank names (fixes from the #219 review)

ChatGPT's review of #219 is merged (docs #220).

- **Miracles need a confirmed cult rank (MAG-N07):** until "Rank for this pool" is set, that cult's miracles can't be requested (Core pp.180–181). Saved pools and miracles are kept, and the builder says what to confirm.
- **Animist ranks use the Core names (MAG-N09):** Follower (¼ CHA), Spirit Worshipper (½), Shaman (¾), High Shaman (all), from Core p.136. Saved characters keep their rank.
- **Overflow is the GM's call:** Core says the strongest spirits break free but doesn't define "strongest". The builder now says the GM decides; the app's Intensity-then-POW list is shown only as a suggestion, and its button asks for GM confirmation. Commands stay blocked until the overflow is resolved.
- **Rounding (MAG-N06):** an odd half cost on a critical still rounds up. Comments now call this app policy pending D-4, not a book rule (Core p.156 gives no direction).

## Magic: miracle rank, bound-spirit slots, pending-cast checks (MAG-N06–N10)

ChatGPT's #217 review is merged (docs #218): Core p.178 does not require a separate Exhort per cult, so a generic Exhort stays valid. Cult-specific miracle and pool links are kept. The Exhort choice per pool is now labelled as an app setting.

- **Miracle rank (MAG-N07):** a miracle above its pool's confirmed rank can't be requested (Initiate → level 1, Acolyte → 2, Priest and High Priest → 3; a Lay Member none). The builder flags it. The cult and rank checks now come before the cost check, so the message names the real problem.
- **Bound-spirit slots (MAG-N09):** new **Animist rank** (¼, ½, ¾ or all of CHA). A spirit can be marked bound only after its acquisition is recorded (a bargain or a Spirit Combat win, GM confirmed) and only into a free slot. A fractional limit isn't rounded: the GM enters it (floor or ceiling). With more spirits bound than the limit, commands stop and the builder names the strongest (highest Intensity, then POW) as escaping, with a button to mark them so. Spirits already bound stay bound.
- **MAG-N06, N08, N10:** Mysticism and Exhort outcome costs, bound-spirit command results and pending-cast invalidation already worked. They now have their own tests: deleting an entry, or changing a miracle's pool or cult, mid-casting needs a cancel; a reload keeps the cast; it resolves and charges once; another character starts with none.
- New tests: `tests/magic-build-n06-n10.cjs`.

## Magic: each cult's miracles use that cult's Exhort; Sorcery source guard (MAG-N05 follow-up, MAG-N10 part)

From ChatGPT's review of #215 (docs #216). Core p.165 confirmed the Combine cost already in the app (Combine 1 alone = 3 MP, 2 turns), so the formula is unchanged.

- **Miracle cult (MAG-N05):** with more than one cult pool, each miracle names its cult (the builder's "Cult" choice). A miracle is rejected through another cult's pool, and renaming a pool's cult means its miracles must be confirmed again. Adding a second pool no longer moves existing miracles anywhere: each one asks for its cult. A theist with one cult casts as before.
- **Exhort per cult:** each pool uses one Exhort skill. That is the pool's chosen Exhort, else an Exhort whose speciality names the cult, else the character's only Exhort. If the character has several Exhort skills and none matches, the builder asks for one; it never guesses. The pool row also shows its matching Devotion skill.
- **Pending Sorcery (MAG-N10, part):** a casting in progress now also records every combined spell's Invocation source. Changing one mid-casting needs a cancel instead of silently rolling a different skill on the final turn.
- New cases in `tests/magic-build-n01-n05.cjs`: two cults with different Exhort %, wrong-cult rejection, a renamed pool, Exhort choice, legacy single cult, the N10 source change.

## Magic: Combine choices, learned Talents, one pool per cult (Subsystem 6, MAG-N01–N05)

- **Sorcery Combine (MAG-N02):** each Combine point now asks which *different* recorded spell it joins, and for confirmation that the spells share target(s). Casting is blocked until that's done. A character with several Invocation skills picks each spell's source, and a combined casting rolls the lowest of them (one grade harder per extra spell, as before).
- **Mysticism (MAG-N04):** a recorded Talent isn't usable until it's ticked **Learned / practised (GM confirmed)**. At most half POW distinct Talents can be learned (the same Talent at two Intensities counts once). Existing Talents start unticked, like unbound spirits. The 34% → Intensity 2 and Meditation/10 limits are unchanged.
- **Theism (MAG-N05):** a theist can record one Devotional Pool per cult, each with its own cult name, rank limit and available points. All pools together hold at most POW. A miracle draws only on its own cult's pool; with several pools it must name one. Personal MP and other pools are never used instead. Play Mode shows each pool with its own +, − and refill, and donations go to the chosen pool. The first pool keeps the old save fields, so existing characters load unchanged.
- **MAG-N01 and MAG-N03** were already built (Shaping 47% → 5 points, no Intensity shaping, cost and turns by modified component, critical/failure/fumble costs). They now have their own tests.
- New tests: `tests/magic-build-n01-n05.cjs`. Existing Sorcery and Mysticism test fixtures gained the combined-spell and learned fields.

## Display names for signed-in users only; database permission tests; Pits strip fix

- **D-S3 option A (owner):** any signed-in user can see other users' display names, and nothing else on a profile. Signed-out visitors can't read profiles at all. **Needs the new migration** `supabase/migrations/20261108130000_display_names_signed_in_only.sql` run once in the Supabase SQL editor (safe to re-run). The app already asks only for names, so nothing changes on screen.
- **Database permission tests:** `tests/db/permissions.cjs` runs every migration on a real Postgres (PGlite) and checks, account by account, what a GM, players, another campaign's GM and an outsider can and can't do: profiles, GM notes, character edits, assignment, GM tools, new invite code, removing members and handing over the GM role. CI runs it as a second step.
- **The Pits:** while the initiative dice played, the strip under the dice already named the opponent with "Reacting · 1 AP left". It now names whoever's die is on screen, with their AP at that moment (found in ChatGPT's live batch after #209).
- Docs from ChatGPT merged: creature cases (#210), magic build spec (#210), live batch after #209 (#211).

## Campaigns: new invite code, save conflicts, GM handover and backup (Subsystem 8)

Implements the owner's decisions D-S1, D-S2 and D-S4 (`docs/decisions.md`). **Needs the new migration** `supabase/migrations/20261108120000_campaign_continuity_and_save_conflicts.sql` run once in the Supabase SQL editor; until then the app works as before.

- **New code (D-S1):** the GM can replace a campaign's invite code. The old code and its join link stop working at once; players already in stay. Members now see the code too.
- **No silent overwrites (D-S2):** each character has a revision that goes up whenever it's saved. A sheet that's out of date (another tab or device, or the GM changed the inventory) no longer overwrites the newer copy. It stops saving and shows a warning with **Download my version** and **Reload latest**. A GM's "Give an item" still arrives quietly, and a GM's inventory edit is only stopped if the player changed the inventory meanwhile.
- **GM continuity (D-S4):** on the campaign page the GM can **Remove** a player (their characters are unassigned, never deleted), **Make GM** another member (the old GM stays as a player; the tracker and notes go with the campaign), and **Download campaign backup**: one JSON file with the campaign, GM notes, members, every character's full sheet and homebrew.
- New tests: `tests/campaign-continuity.cjs`. The migration was also run (twice) on Postgres with stand-ins for Supabase.

## The Pits stays melee only

- The owner decided ranged combat is not an option in The Pits, so the ranged and thrown weapons from #206 are removed (reverted). Missile weapons on a character are listed as "The Pits is melee only". The melee fixes from #205 stay.

## The Pits: every melee weapon and shield works with saved characters

- Bringing a saved character into The Pits only accepted the five original weapons (Broadsword, Shortspear, Mace, Dagger, Greatsword) and three shields (Buckler, Heater, Hoplite). A character with any other weapon or shield got "could not be loaded". All 35 supported Core melee weapons and all 8 shields now load and fight.
- A Combat Style now offers every supported weapon and shield it trains, whether or not the character carries it (carried ones are listed first). Before, a style whose weapons weren't also in the character's equipment showed "Choose a style containing an owned Broadsword, Shortspear, Mace, Dagger or Greatsword". That outdated message is replaced too.
- New regression test in `tests/practice-character.cjs` builds a real saved character carrying every supported melee weapon and shield, and starts a bout with each one.

## The Pits: fixes from ChatGPT's live check

From the live acceptance in #196:
- **PUI-F01:** the setup screen (Choose your challenge, mode descriptions, practice fighter, leaderboard) is now readable in dark schemes like Basalt.
- **PUI-F02:** the phase pill, the Last roll bar and the end-of-bout recap now follow the exchange being shown, not the result that's already been worked out:
  - the Last roll bar shows a roll only once its dice have landed on screen;
  - the pill follows whose dice are on screen;
  - the recap appears after the Victory or Defeat window, not during the final damage roll.

## The Pits UI live acceptance — 2026-11-07

- Owner-only deployed pass after #193–#195: guest and saved-character victories, odds/action hints, Mark toast, hit feedback, recap and Basalt inheritance observed at 1363×936.
- Two UI failures documented: dim Basalt setup text and phase/roll/recap advancing ahead of playback. Exact 1280/390 and audible sound remain unverified due to browser limitations.
- Evidence: `docs/pits-ui-live-acceptance-20261107.md` and eight screenshots. Docs only; main Combat stays closed, progress 5/8.

## Rules, World Guide and Account

From the owner's menu redesign handoff (Part A, items 8–10):
- **Rules** is now a table of contents: chapters grouped under Making a character, Playing the game, Magic and Running the game, each with a dotted line to its Core page number. There's live search and buttons to show one group. The repeated "CORE" badge is gone; the page says once that page numbers refer to the Mythras Core Rulebook.
- **World Guide:** the chapter list stays in view beside the parchment on desktop. On phones, chapters become a row of buttons you can swipe. The "Back to the table" link is gone; Home is in the navigation.
- **Account, signed out:** Sign in and Create account tabs, errors shown in a clear banner at the top of the form, a Show/Hide button for the password, "Forgot password?" as a link, and a short "Why sign in?" list.
- **Account, signed in:** a profile card (initials, name, email, sync status), your display name (now editable), and Sign out.

## The Pits lobby

From the owner's menu redesign handoff (Part A, item 7):
- Pick your fighter from a list of cards instead of a drop-down. Each card shows the portrait or initials, the best Combat Style % and Action Points.
- On desktop, a summary panel stays beside the list: the fighter's culture, career, Combat Style, AP and campaign, the **Enter the Pits** button, and "Wounds here never touch your saved character". On phones it sits below the list.
- When this device has arena runs on record, a strip shows your best run, best hardcore run, and how many fighters are on the board.
- "Fight without a character" is always there, signed in or out.

## Characters and Campaign pages

From the owner's menu redesign handoff (Part A, items 5 and 6):
- **Characters:** a card grid (1 column on phones, 2 on tablets, 3 on desktop), with the same cards as Home: real Combat Style %, Action Points and campaign, a Play button, and a ⋯ menu with Edit, Print sheet and Delete. There's a search box (name, culture or career) and a sort (Recently saved, Name A to Z).
- **Delete now offers Undo:** the card disappears with an Undo button for six seconds, and the character is only deleted when that runs out. The old × button and the "are you sure?" box are gone.
- **Campaign:** one card per campaign with your role (GM or Player), when it started, and Open / Party board. **Join with a code** is on this page: beside the list on desktop, below it on phones.

## Home: Continue card, character cards and table tiles

From the owner's menu redesign handoff (Part A, item 4):
- **Continue:** the hero has a Continue card for your most recently saved character. It shows their best Combat Style, and Explore Sit’ota sits beside it as a quieter link. Signed out, it's a "Sign in to continue" button.
- **Your characters** shows up to three cards plus a dashed New character card. Each card shows the portrait or initials, culture and career, the best Combat Style %, Action Points, the campaign when linked, when it was saved, a Play button, and a ⋯ menu (Edit, Print sheet, Delete with Undo). Signed out: "Your table is waiting".
- **At the table:** four tiles for Campaign, The Pits, Rules and World Guide. The Pits tile shows your best local run when you have one. Create campaign and Join a campaign sit just below.
- The ORC licence attribution is now visible at the bottom of Home.

## Menus: shared page header, phone tab bar and sign-in gates

From the owner's home and menu redesign handoff (Part A, items 1–3):
- Characters, Campaign, The Pits, Rules and Account open with the same header: a small label, the page title, a one-line description and the page's main button (New character, New campaign). The "Main Menu" buttons are gone; Home is in the navigation.
- **Phones (under 900px):** a tab bar along the bottom (Home, Characters, Campaign, The Pits, More). More opens a sheet with Rules, World Guide and Account. The top bar shrinks to the logo and a round account button.
- **Signed out:** Characters and Campaign now show a "Sign in to see your characters / campaigns" card on their own page, instead of jumping to Account. The Pits shows the same card and still lets you fight without a character.
- After you change page, keyboard focus moves to the page title.

## The Pits: game feel (v0 design, steps 3 and 5)

- **Bout bar:** Glory, a Momentum meter (Steady, Warming, Hot, Surging) and Pit Marks sit above the arena. They're **for fun and never change a roll**, and the bar says so.
- **Pit Marks:** First Blood, Near Thing, Dead Eye, Hold the Line, Stayed Standing, On a Roll and Serious Business. A toast appears when you earn one.
- **Recap:** Marks (or the end of a bout) opens a recap with hits, damage dealt and taken, your best streak, the moment of the bout and your Marks.
- **Hit feel:** the struck fighter shakes, the location flashes, and the damage floats up. All of it is off when your device asks for reduced motion.
- **Sound and haptics:** off by default, with a toggle in the bout bar.
- **Chronicle:** each line shows its round and cycle (R2 · C1), and new lines get a brief highlight.
- The end-of-bout window and the next-opponent panel now use the Stone look.
- No rules changed. A test plays whole bouts with a fixed seed with and without this layer and checks they come out identical.

## The Pits: prompt follows the fight (v0 design, step 2)

- The pill at the top of the middle column now names the moment: Your turn, Defend, Special Effects, Resist, Roll or Opponent.
- Actions you can't take right now stay on screen and say why ("Needs 1 AP", "Out of reach", "Not prone", "No reach to contest"). Delay is tagged "Holds 1 AP".
- **Roll bar:** under the dice, a strip shows the latest d100 roll against its skill, split into critical, success, failure and fumble zones, with the verdict in words.
- **Odds preview:** hovering over or focusing Attack, a parry, Evade or Regain Footing shows the same strip for that skill, with the chance to succeed, crit and fumble. The zones come from the game's own roll grading, so they always match.
- Behind the scenes, a small read-only view adapter (`experiments/pits-view.js`) turns the fight's state into what the screen shows, so later rules fixes don't touch the look. No rules changed.

## The Pits: Stone look (v0 design, step 1)

- The Pits now looks like Play Mode: the same stone panels, Cinzel headings and colour scheme (it follows the scheme picked in Play Mode's Settings).
- The layout follows the chosen v0 mockup: your fighter on the left, the opponent on the right, and the round, whose turn it is and the engagement range across the top of the middle column. The prompt and dice sit below that, with the combat chronicle full width underneath. On phones, the prompt comes first, then both fighters, then the chronicle.
- Fighter panels show weapon Size and Reach, Action Point pips, condition chips and wound tags (Minor, Serious, Major) on each hit location. Actions show their AP cost as a tag.
- No rules changed. The rules footer now describes concurrent tied Initiative and shield strikes correctly.

## The Pits PIT-SE03 Unarmed rules source cases and shield conventions — docs only

- Added **44** Core-cited, deterministic `PIT-SE03-*` cases to `docs/the-pits-combat-procedure-review.md`: **8** Unarmed attack, **6** Unarmed parry, **7** Grip, **5** distinct full-Grapple, **5** Flurry, **6** Take Weapon, **5** effect-eligibility, **2** two-fighter scope cases.
- Verified the owner's private Core printed **pp.9,43,89,91–92,95,97–98,100–101,105–106**, plus **p.222** for default human natural-weapon/hand-fist data. Core p.97's earned **Grip** effect must not silently impose all p.106 **Grappling** restrictions; Flurry's different-limb follow-up costs another AP, and Take Weapon works offensively or defensively against the original Unarmed roll (p.101).
- Source-checked #191 shield conventions: shield Short Reach follows p.63 and optional Reach p.106; automatically picking the better eligible skill for a p.96 barrier test is an acceptable arena input convention; an impaled Target shield remaining unavailable for the whole bout is **not Core-mandated**, since p.97 permits later withdrawal. Keep clearly labeled as a Pits-only limitation, **not** a Sit'ota campaign rule. Ruling updated in `docs/decisions.md`.
- PR #188, #190, #191 already merged; no files outside `docs/`, `HANDOFF.md` or `CHANGELOG.md` changed. Source/docs verification only: no local Node suite or deployed live acceptance performed in Chat. **Main Combat Subsystem 5 CLOSED; project 5/8**.

## The Pits: shield strikes and shield Bash

- Fighters with a shield can now **strike with it** for 1 AP. Each of the eight Core shields uses its own damage, Size and effects: Bash for all, Stun Location for most, Impale for the Target.
- **Shield Bash** pushes 1m for every two full points of damage before parry and armour; bludgeons stay at three.
- A Bash into the ring's barrier now lets you use Acrobatics instead of Athletics if it's better.

## The Pits: tied Initiative acts concurrently

- When both fighters have the same Initiative, they now act at the same time (Core p.90). The game still shows one turn after the other, alternating who declares first each cycle, but nothing done in the first turn can stop the second fighter's action that cycle. A fighter who is dropped in the first turn still gets their blow in, and if both fall it's a draw.
- Before, the player always went first on a tie.

## The Pits P2 tied Initiative and shield attacks — Core case specifications (docs only)

- Added **28** detailed child acceptance cases to `docs/the-pits-combat-procedure-review.md`: eight under PIT-P02 for initial and later-round concurrent Initiative ties (Core p.90), and twenty under PIT-P07 for all eight shields' attack profiles, reach/Size interactions, Bash and defensive regressions (Core pp.63,91,95–96; p.104 ordinary Knockback).
- Source rulings: compare final modified totals, **ties act concurrently**, and original initiative dice carry into later rounds unless forced to reroll. A shield's own damage/Size/Short Reach/effects govern shield strikes. Shield Bash moves one metre per **two complete points** of damage before armour/parry; other bludgeons use **three complete points**, with no additional first metre.
- Docs and handoff only; no production code or tests changed. Claude to implement in code PR(s), run the full suite, and merge after Tests passes. Main Combat Subsystem 5 remains CLOSED; progress **5/8**.

## The Pits: Entangle trip uses the original roll

- After entangling a foe, the 1 AP trip no longer rolls your Combat Style again. The victim resists against the roll that won Entangle, as Core pp.97 and 101 describe (ChatGPT source check).

## The Pits: Entangle, Entrapping and other Special Effect rules

From ChatGPT's source review (#182), second batch:
- **Entangle** works. Whips, chains, nets, the ball & chain and the halberd can wrap the location they hit. A held arm can't use its weapon or shield, a held leg can't move, and a held head or body makes every roll one grade harder. The holder can spend 1 AP to try to trip; the victim spends 1 AP on Brawn to break free, or uses Slip Free, Damage Weapon or Disarm.
- **Entrapping weapons** (Main Gauche, Whip, Net) can Pin Weapon without a Critical.
- **Disarm** is only offered against foes with up to twice your STR.
- **Trip** can be resisted with Acrobatics, if the character has it.

## Parry rounding: the blocked half rounds up

- When a weapon one Size smaller parries, it blocks half the damage. With odd damage the blocked half now rounds **up**, matching how the rest of the site rounds: 5 damage blocks 3 and 2 gets through. This applies to The Pits and Play Mode's parry calculator, which used to leave the half point to the GM.

## 2026-11-06 — Four more Play Mode palettes

- Settings → Colour scheme now offers The War Room, Night Watch, Ivory & Ink and Deep Cypress alongside the existing five. Backgrounds, panels, text, accents and dice colours change together.
- The new palettes inherit shared wound-severity colours. Selection still saves on this device. Gameplay is unchanged.

## The Pits: first combat-procedure fixes

From ChatGPT's source review (#182):
- **Knockback** now happens on any hit that does more damage than the target's SIZ, not only with Bash: 1m per 5 points over, then Athletics to stay standing. Stand Fast prevents it.
- **Major limb wounds** knock the victim prone. The fatal clock only applies if the GM rules the limb severed, punctured or ripped off.
- **Impale:** after impaling, choose to keep hold of the weapon or leave it in the wound. Pulling out a Barbed weapon (Trident) does full damage. Withdrawal injuries now show up for First Aid.
- **Reach:** when a longer weapon keeps you off its wielder, you can still attack their weapon.

## The Pits Core combat-procedure source reconciliation (docs only)

- Compared The Pits' own `experiments/practice-combat.html` engine to the uploaded **Mythras 2e Core** printed pp.86–111 and the previously source-audited Combat ledger; added **51** `PIT-*` cases in `docs/the-pits-combat-procedure-review.md`. Distinguishes **21** `NEEDS CODE` cases plus **1** `NEEDS COPY` item from **21** already-correct paths, rounding decisions, and declared arena exclusions.
- Highest-priority mismatches: unconditional Major limb injury death clock (p.110), ordinary Knockback omitted unless Bash (p.104), Impale always left embedded (p.97), short-reach fighter cannot target enemy weapon (p.106), Entrapping Pin Weapon exception and Entangle/Unarmed effects. A normal-mode HP reset is documented as a roguelite convention, not Core natural recovery.
- **Core p.95 parry half rounding:** printed table says Half but gives no odd-integer rounding instruction. Arena `parryAbsorption()` floors the **blocked** amount, increasing pass-through on odd numbers. Mark as a decision rather than silently certifying that choice.
- **Docs only**, no production code, test files, workflows or deployments changed. No local Node suite or signed-in acceptance in this source review. Prior Main Play Mode Combat Subsystem 5 remains closed; progress **5/8**.

## The Pits (was Practice Combat): its own tab, every Core melee weapon, shared rules

- **The Pits** is a new tab in the top bar (and in Play Mode's ☰ menu). Pick one of your characters there and enter, or fight without one. The Practice Combat button on each character card is gone.
- The Pits now uses the same weapon table as the rest of the site: **35 Core melee weapons and 8 shields** instead of 5 and 3. Bring any character with a melee weapon and use it. Damage, size, reach, Special Effects and durability all come from the source-checked table.
- Ranged, mounted-only (Lance) and ambush-only (Garrotte) weapons are listed as not simulated yet, with the reason.
- Rule fixes: Initiative Bonus now rounds up, as in the main app (it showed halves like 13.5). Weapons that can't parry (the whip) no longer offer a weapon parry.
- New tests check the arena's Action Points, hit points, Damage Modifier and Initiative against the main app at every value.

## Item search: source check passed

- ChatGPT checked the item search and Core trait data against Core pp.58, 62 and 89 (#179): every ammunition price, armour value and Core trait matches. Sling bullets are now listed as "Lead sling bullets", as in the book. Mail keeps the book's own figures (5 ENC per location, 30 for a suit).

## 2026-11-06 — Item catalogue and Core trait source check

- Compared uploaded Core rendered pp.58,62,89 (and Skirmishing p.108) with #176/#177 data: all 5 ammunition quantities/prices, all 8 armour per-location AP/ENC/prices and all 26 offered traits PASS. No required rules correction.
- `docs/item-search-core-cases.md` records every checked row, valid description clarifications, optional Lead sling bullets label, and the book's Mail ENC inconsistency (5 per location versus 30 per suit).
- Docs only; 34 local test scripts pass. No live UI acceptance claimed; progress stays 5/8.

## Add armour and ammunition by search, too

- **Add an item** in Play Mode's Inventory now also finds armour (one location or a full suit, carried at full ENC until worn from the Money & Gear step) and ammunition bundles (Core p.62; ENC is the GM's call), alongside weapons and gear.

## Add items to your inventory by searching; Core-only Combat Style traits

- **Play Mode → Inventory → Add an item:** type part of a name (e.g. "sword", "rope") to search all Core weapons and gear, then tap **Add**.
  - Items are found (free) by default; tick **Paid for it** to take the listed price from your silver.
  - Weapons you add also appear on the Combat tab, ready to attack and parry with. ENC is counted once.
  - Anything not in the list can still be added by hand with **+ Add item**.
- **Combat Style traits:** only the 26 Core traits (p.89) are offered for now. Traits from supplements will return as per-book options. Characters that already have a supplement trait keep it, marked "(supplement)", and can remove it.

## Fixes from the live check (#174)

- **Assign to campaign** now lists a campaign you've just created. The builder was showing an out-of-date list.
- **Play Mode tabs** stay on one line at smaller desktop sizes: "Features & traits" shortens to "Traits" when space is tight. Between 1100 and 1300px wide, the side columns give way so the tabs column keeps at least 300px.
- **Roll damage** now rolls its dice in the tray (weapon dice, Damage Modifier and the d20), instead of leaving the attack roll showing.

## 2026-11-06 — Final Subsystem 4 gates on the new desktop Play Mode

- Owner-only (g)–(i), hazard tables, Settings colour switch, skill description and Dagger→Impale→Roll damage all PASS. Natural ER17+INT16 gained+3; maiming2HP and Luck refill persisted. Three live screenshots: `docs/advancement-stone-live-20261106.md`.
- Both fixtures deleted and absence checked after reload. Older #172 campaign also absent. Original Verdigris restored. No code changes; all33 scripts pass.
- UI observations for Claude: Finish picker omits new campaign despite working rule; Notes wraps at1363px; dice tray retains attack result after damage. Preserves Claude closeout #173 and progress5/8.

## Subsystem 4 closed: Advancement, hazards and recovery (5/8)

- The final live checks (#172) passed: the 1d6+1 campaign option, the Passion helper, permanent-injury maximum HP and the new-session Luck refill, each surviving a reload. Together with steps (a)–(f) (#164), source checks and regression tests, Subsystem 4 is closed. Progress is now **5/8**.
- One leftover: a disposable test campaign may still be listed; delete it if so. The new Play Mode look still needs its own live walkthrough.

## 2026-11-06 — Subsystem 4 final focused live gates pass

- Owner-only (g)–(i): campaign 1d6+1 ER gained +6, Weak Passion helper/floor 0/reload, maiming maximum 2 HP persisted, and new-session Luck refilled. Acid/fall/fire tables present.
- Evidence: `docs/advancement-final-live-20261106.md`. Formula appears in instructions, not repeated on the result history. Character deletion/reload verified. Campaign delete confirmed, but environment reset prevented final absence verification and removed the captured screenshot.
- Docs only; 33 current local test scripts pass. Claude to review closeout; progress remains 4/8. This pass predates the Stone layout and does not verify that later UI.

## Play Mode: damage roll rule fixes, corrected skill summaries, centred Settings

- **Damage roll, checked against the rulebook by ChatGPT (#170):**
  - **Maximise Damage** now works with natural weapons such as Unarmed (Core p.98).
  - **Impale** shows both weapon rolls. Pick one; the total is that roll plus your Damage Modifier once (Core pp.97, 110).
  - **Choose Location** gives you a location picker instead of rolling a d20 (Core pp.95–96).
- **Skill summaries:**
  - **Brawn** gains its +1 SIZ per 10% carrying bonus.
  - **Courtesy**: a fumble *may* give offence.
  - **Literacy** is capped by your skill in that language.
  - **Exhort** and **Folk Magic** now have page references (pp.178 and 121).
- **Settings** opens in the middle of the screen rather than in the side panel.

## Play Mode: race under the name, Settings menu, cleaner skill rows

- Under the character's name: **race**, culture and career. The campaign name is gone.
- **Settings** in the ☰ menu: colour scheme and animated dice. The palette button left the header.
- Skill rows no longer show the ✓ "checked" mark; it's still in Improve Skills, and a Critical still sets it.
- On phones, **Improve skills** is just its icon, with the number of Experience Rolls as a small badge.

## Play Mode: skill descriptions, tidier sheet, no zoom on phones

- **Skill descriptions:** tap a skill's name to read what it covers in the side panel, with its formula, value, page reference and a Roll button. These are short summaries of Mythras Core pp.38–50 in our own words (the site is public, so the book's text isn't copied).
- **Rules reference** now lives in the ☰ menu: skill and task rulings, combat actions, combat situations, all Special Effects, hazards and recovery, and casting. Their links are gone from the sheet.
- **Combat tab:** initiative is no longer repeated there; it's in the top row. The **…** button next to it holds your own d10, Surprised and End fight.
- **Left column fits without scrolling:** the wound watch moved into the body location panel.
- **Phones:** no zooming (pinch or double-tap), and the Home button left the bottom bar (Home is in the ☰ menu).
- **Thinner, quieter scrollbars.**

## Play Mode: site menu button, mockup-style combat card, smaller dice

- **More room:** the site's top bar is hidden in Play Mode. A menu button (☰) beside the character's name opens Home, Characters, Campaign, Rules, World Guide and Account. On phones the bottom bar also ends with **Home**.
- **Combat card, closer to the v0 design:** one question at a time. The opponent's result is four large coloured buttons (plus No defence). Special Effects are a tick list with a one-line summary each; ? opens the full rule. **Change** next to the opponent's result lets you correct it.
- **Smaller dice:** the physics dice in the side panel are now a small tray beside the result, like the mockup.

## Play Mode: new "Stone" look (from the v0 design)

- **New look:** carved-stone cards, a dark character header, and five **colour schemes** from the palette button in the header: Verdigris (default), Basalt & Ember, Sandstone & Indigo, Moss & Gold and Basalt (dark). The choice is saved on each device.
- **Body:** a new contour figure, shaded by wound level. The list beside it shows each location's d20 range, HP bar, armour and wound level as a word (OK, Minor, Serious, Major).
- **Skills:** each row shows the formula under the name, the percentage and a Roll button; Passions have a Test button.
- **Combat:** a four-step bar (Attack, Opponent, Effects, Resolve) on the combat card. Weapon cards show your percentage on the Attack and Parry buttons. New **Roll damage** button for a successful attack: weapon damage + Damage Modifier and a d20 hit location, before parry and armour. It never changes HP. Rules check pending: `docs/play-mode-damage-roll-cases.md`.
- **Side panel:** the physics dice now roll at the top of the panel, above Details and Roll log tabs.
- **Phones:** five sections in the bottom bar: Sheet, Body, Skills, Combat and More.

## 2026-11-06 — Subsystem 4 live steps (a)–(f) pass

- Owner-only disposable pass verifies characteristic maintenance/atrophy, free fumble +1 before an Experience Roll, mentor training lock/unlock, learning for 3 rolls, Serious weekly and Major treated monthly recovery, and reload after each stage.
- Final saved account reopen retains Athletics 54%, Acrobatics 28%, pool 2, Chest 0/7 and Right Arm −3/4. Fixture deleted and absence confirmed after reload. Evidence/screenshot: `docs/advancement-live-acceptance-20261106.md`.
- All 32 local test scripts pass. Docs only; Subsystem 4 stays OPEN, progress 4/8. Added campaign-option step (g) was outside this requested pass and remains untested.

## Hazards and recovery notes, checked against the rulebook

- The Body → Hazards and recovery panel now covers **acid** (it was missing). It also has compact tables for **falls** and **fire**, plus the exact **exertion** check times and grades.
- It's clearer about **disease and poison**: the specific listed cure stops new Conditions, not just any treatment. It gives **healing** intervals (day, week or month), the 1d3 strenuous-activity penalty, and when an untreated Major Wound becomes a permanent injury.
- Everything stays a reference for the GM; nothing is applied automatically. Source check: `docs/advancement-hazard-notes-review.md` (PR #161).

## New site logo

- The spear-and-ribbon logo now sits beside "New Sit'ota" in the site header (in ivory and red, to show on the dark bar). It's also the browser tab icon and the home-screen icon.

## Advancement options: faster skill improvement, Passion shifts

- **Optional campaign rule:** the GM can set **skill improvement to 1d6+1** instead of 1d4+1 in Campaign rules (Core p.72), for faster progress without extra Experience Rolls. It applies to Passions too. Characters outside a campaign use 1d4+1.
- **Passion deepening and waning:** in Improve Skills, each Passion has **deepen** and **wane** buttons. Pick Weak (1d10), Moderate (1d10+5) or Strong (1d10+10), as the GM decides (Core p.82). A Passion never drops below 0.
## Subsystem 4 hazard notes source audit (docs only)

- Checked `Body → Hazards and recovery` (`pmHazardsHTML()`) against the owner's privately uploaded Core: Acid **p.68** (not pp.71/74–85), asphyxiation and blood loss p.71, disease/poison pp.74–75, falls and sleep p.78, fire/physical effort p.79, and healing p.80. Reviewed rendered tables, not garbled PDF text alone.
- New `docs/advancement-hazard-notes-review.md` distinguishes **correct**, **missing**, and **imprecise** instructions with short suggested wording. Missing include acid entirely, fall/fire intensity thresholds, physical effort intervals and healing restrictions; p.74's generic successful-treatment wording needs a cure-specific qualifier. Cause-specific Fatigue recovery already works separately and must be preserved.
- All medical/hazard/disease mechanics remain **GM-assisted**. This PR does not modify application code, calculations, tests, Core sourcebook or release assets. No live check or Node suite run. Subsystem 4 remains **OPEN**, progress **4/8**.

## Play Mode skill descriptions and damage helper source review (docs only)

- Compared **58** `SKILL_INFO` entries in `js/data.js` with the privately uploaded Mythras Core (56 ordinary skill-chapter entries from printed pp.38–50 plus Exhort p.178/181 and Folk Magic p.121). `docs/play-mode-skill-info-source-review.md` lists every entry, page and verdict.
- Small corrections recommended for **Brawn** (p.39 capacity increases with skill), **Courtesy** (p.45 fumble does not invariably insult), **Literacy** (p.47 language cap and non-alphabetic records), and blank page references for **Exhort** and **Folk Magic**.
- Source-verified **R1–R10** in `docs/play-mode-damage-roll-cases.md`: R1 successful parry reduces attack damage by weapon Size (pp.94–95), R4 negatives floor at zero (p.9), R6 natural weapons **are eligible** for Maximise Damage (p.98), R7 Impale rolls weapon damage twice then applies DM once (pp.97,110) but current total shows only the first roll, R8 Choose Location supersedes a random d20 (pp.95–96). R9 software invalidation is app logic, not a separately printed Core rule.
- **Docs only:** no JS, CSS, tests, HTML or workflow changes and no live/Node verification in Chat. Claude to patch three narrow helper issues in code with tests. Keep Combat S5 closed for its earlier scoped acceptance; S4 remains open; progress **4/8**.

## Advancement: regression tests

- New automated tests cover Experience Rolls, fumble bonuses, skill training and teachers, learning new skills, Passion improvement, characteristic training and permanent improvement, natural healing intervals and Fatigue recovery times. No calculation errors were found. What's left for Subsystem 4 is two optional owner decisions and one live check.

## Subsystem 5 (Combat) closed: progress 4/8

- The Combat audit is complete for player characters. Every section of the Core Combat chapter is mapped to tested cases (380 in all). The fixes passed live checks on the site, including one full fight from start to finish.
- What stays with the GM by design: positioning, fights with many actors, and complex wound outcomes. Creatures are Subsystem 7; multi-account play is Subsystem 8.

## 2026-11-06 — PR #156 End fight live re-check passes

- All four focused checks pass: both End fight controls restore AP, clear own Surprised and initiative, and persist after reopening. Natural d10s 7 and 5; deployed play.js stamp `3657984677`.
- Resolves the final fight's step-8 failure. Evidence/screenshot: `docs/combat-pr156-step8-recheck-20261106.md`. Disposable deleted and absence confirmed after reload; 29 local scripts pass.
- Docs only. Recommend Claude's final Combat closeout review; 3/8 retained pending that decision.

## End fight resets everything, wherever you press it

- The **End fight** button beside initiative now does the same as Advance time → End the fight: it clears initiative and Surprised and restores your Action Points. Before, it only cleared initiative (final Combat fight, step 8, PR #155).

## 2026-11-06 — One final Combat fight on deployed #154

- Steps 1–7 pass, including target Surprise adding exactly one SE without touching own Surprised, natural attack/Parry, armour subtraction, daily healing/reload and ranged helper. Exact dice/stamps/screenshots: `docs/combat-final-fight-20261106.md`.
- Step 8 fails: top-bar End fight clears initiative only; AP and own Surprised remain. Advance time → End the fight performs the complete reset. MP remained full throughout, so deficit recovery was not tested.
- Owner-only disposable character deleted and absent after reload; all 29 local test scripts pass. Docs only. Subsystem 5 stays OPEN; overall 3/8.

## Combat closeout fixes

- **Surprise bonus (Core p.105):** if your attack succeeds against a target that was Surprised, and it's the first successful attack on them, tick the box on the combat card to earn **one extra Special Effect**. A Success against their automatic Failure then gives 2 effects, as in the book's example.
- **Grappling** is in the Combat situations panel. It covers:
  - holding an arm or leg vs a head or torso;
  - follow-up damage equal to your Damage Modifier;
  - escaping with Struggle, which is opposed Brawn or Unarmed.
- **Choose Location** can't target a location the defender is passively blocking with a shield.
- **Throwing weapons:** a second one already in your off-hand can be readied as a Free Action.

## 2026-11-06 — PR #150 focused live acceptance passes

- All four groups pass: Sweep eligibility, contextual Pin Weapon badges (list and side panel), Impale table fit at 1363px desktop width, and unchanged Knockback reminder.
- ChatGPT re-read rendered Core p.104 and retracts its earlier extra-metre finding. Claude's TA22 interpretation is correct; no Knockback code change needed. Prior live report corrected.
- Owner-only throwaway deleted and absence checked after reload. All 28 local scripts pass. Evidence: `docs/combat-pr150-live-recheck-20261106.md`. Docs only; overall 3/8, Subsystem 5 OPEN.

## Combat follow-ups from the Batch 3 live check (PR #149)

- **Sweep attacks** now say they only apply to weapons or creatures of unusual size (Core p.105).
- **Pin Weapon** shows "No Critical needed" instead of "Critical Only" when your weapon's exception applies (Entrapping weapons, or a thrown javelin against a shield).
- The Impale table fits narrower side panels without scrolling sideways.
- **Knockback unchanged:** a re-check of Core p.104 confirms it's 1m per 5 points (or part) over SIZ, with no extra starting metre. The case ledger is corrected.

## 2026-11-06 — Combat Batch 3 independent live acceptance

- PR #148: five of six requested groups pass in the owner session. Whip Parry restrictions, Entrapping/Javelin Pin Weapon exceptions, weapon notes and wound wording pass; all 25 Impale matrix cells match Core p.98.
- Combat situations needs Knockback's initial metre and Sweep's unusual-size qualification. Corrected the earlier TA22 source specification and clarified TA07. Pin Weapon's static Critical Only badge also needs qualification for working weapon exceptions.
- Evidence: `docs/combat-batch3-live-acceptance-20261106.md` and screenshot. Disposable character deleted; absence verified after reload. All 28 local test scripts pass. Docs only; progress remains 3/8, Subsystem 5 OPEN.

## Combat rules fixes (Combat Batch 3)

- **Offensive weapons can't parry** (Core p.61). The Whip shows Attack only, everywhere.
- **Entrapping weapons** (Main Gauche, Net, Whip) can Pin Weapon without a Critical (p.61).
- **A thrown Javelin** can Pin Weapon without a Critical against a shield (p.62). Tick "The target defended with a shield" on the combat card.
- **Weapon cards explain their traits:** how many locations a shield passively blocks, "only from the back of a moving mount" (Lance), "only from ambush" (Garrotte), missile parry, Set, Barbed, Thrown and the Atlatl as a launcher.
- **Combat situations:** a new reference in the side panel. It has the Impale Effects table and how to pull a weapon free, plus aiming, Outmanoeuvre, Sweep attacks, Knockback, pulling a blow, climbing and swimming, mounted combat and aerial combat.
- **Clearer wound text:**
  - After a torso Serious Wound, you can be revived, but you can't rejoin the fight until the location heals.
  - The 5× Healing Rate death deadline for a Major limb wound applies only when the limb is severed, punctured or ripped off.

## Combat Batch 3 — remaining player-facing Combat source cases (docs only)

- Added **92** `C5-B3-*` Core acceptance rows to `docs/combat-cases-batch-1.md`, with explicit initial **72 HANDLED / 20 NEEDS CODE** status. Focus: weapon traits/shields, individual ammunition/Force/Load profiles, multiple opponents, cover, Sweep, mounted/aerial action, impaling exceptions, rare wounds and reload persistence.
- Rulebook verified against user's uploaded Mythras 2e Core, printed pp.61–65, 96–110. Creature-specific hit locations and anatomy are deferred to Subsystem 7.
- Highest-value code corrections to evaluate: **Offensive** weapons must not offer Parry; **Entrapping** and thrown **Javelin vs shield** permit Pin Weapon without the usual Critical; add lean situational guidance where missing, especially p.98 Impale matrix and p.104 Outmanoeuvre. The rest are player-reference or GM-led resolutions, not requests for a second combat engine.
- No production code, tests, CSS/HTML, workflows or deployments were altered. This is specification/code-review work, **not** proof of tests or live behavior; Subsystem 5 stays OPEN and progress 3/8.

## Subsystem 5 Combat closeout chapter map and final fight — docs only

- Source-mapped **81 Combat chapter heading/section groups** plus all **43 named Special Effects** against the existing 368-case ledger, Core printed pp.86–111, in `docs/combat-closeout-review.md`. Added **12 distinct child cases** to `docs/combat-cases-batch-1.md`, now **380 cases**: **6 initially HANDLED and 6 NEEDS CODE**.
- Primary new implementation blocker: first successful attack against a Surprised target must earn **one additional Special Effect** (Core p.105); the existing UI warns of it but its effect counter uses only the differential table. Remaining code/guidance gaps cover p.106 grapple/Struggle outcomes, passive blocking vs Choose Location (p.105), and the ready offhand thrown-weapon Free Action (p.109).
- Designed **one owner-only end-to-end Work combat scenario** spanning initiative, melee attack/parry, earned Special Effects, location armour/wound, Advance time and reload, ranged shot and Distance helper, and disposable fixture deletion.
- **Conditional closeout recommendation:** after Claude fixes/tests any required child cases and that final deployed Work fight passes, S5 may close (3/8 → 4/8). Creature anatomy/Rabble-Underlings remain S7; multi-account access and GM/Party Board belong to S8. Reasserts Knockback no extra metre (p.104).
- Began S4 reconciliation in `docs/advancement-reconciliation.md` against the existing 216-case ledger. Docs only, no product/test files changed; local Node suite was not run in Chat runtime. CI/Claude to verify.

## Reach summary lists melee weapons only

- The optional Reach rule's "your weapons" list no longer includes ranged weapons. A bow's Force was being shown as if it were Reach (spotted in the Combat Batch 2 live check, PR #145).

## 2026-11-06 — Combat Batch 2 live acceptance (docs only)

- Verified all five requested PR #144 check groups live: corrected trait text/provenance, Dagger Kill Silently eligibility before/after Assassination, bow/shield controls, a natural bow fumble, Core p.108 distance/size and crowd guidance, and optional p.106 Reach text.
- Results and observation limits are in `docs/combat-batch2-live-acceptance-20261106.md`, with a Distance helper screenshot. All requested checks passed; the fumble UI defers opponent choices, so the report distinguishes live absence from the separately passing firearm-filter test.
- Used a disposable character as the owner, deleted it, and confirmed absence after reload. No accounts created and no code changed. All 27 local test scripts passed. Progress remains 3/8.

## Combat rules fixes (Combat Batch 2)

- **Blind Fighting** now ignores penalties for poor light or temporary blindness, as Core p.89 says (it used to reduce them by one grade only).
- The trait **Skirmisher** is now called **Skirmishing**, as in Core, and mentions the Athletics cap. Styles that already had it keep it.
- **Mounted Skirmisher** is no longer labelled as a Core trait.
- **Kill Silently** can only be chosen when the Combat Style has the Assassination trait. Your GM still confirms it's the first attack on a surprised victim.
- **Weapon Malfunction** is only offered for firearms.
- The optional **Reach** rule now reads correctly: inside a longer weapon's Reach, its Size drops by the difference in Reach and it only does 1d3+1 with the haft, when the two weapons are at least two Reach steps apart.
- **Distance helper:** a new button on ranged weapon cards. Enter the distance and the target's SIZ to see how many steps harder or easier the shot is (Core p.108), and what that makes your final grade. It also explains firing into a crowd and firing on the move.
- Ranged weapons have no Parry button (owner's decision); shields still parry incoming missiles.

## Combat Subsystem 5: Batch 2 source cases and gap triage (docs only)

- Added **85** numbered Core cases to `docs/combat-cases-batch-1.md` with printed references and explicit initial `HANDLED` vs `NEEDS CODE` triage. Covers 26 Core Combat Style traits, 11 close-combat conditions, ranged modifiers and target-size/distance thresholds, charges/cover, and special effects.
- Identified targeted correctness issues in current code/reference: Blind Fighting description is too restrictive; the Core Skirmishing name is not used; Kill Silently prerequisite is not enforced by effect selection; Weapon Malfunction can be offered to non-firearm ranged weapons; optional Reach guidance incorrectly assumes a fixed two-Size reduction. Existing shield-weapon Parry button is available and needs live check.
- Core book source checked visually on printed pp.89,97–98,101–103,105–109. These are source/code-review findings, not tested user-visible regressions. No production code, tests, workflows, or deployments changed. Subsystem 5 remains **open**, project progress **3/8**.

---

## Play Mode fixes from the live check (PR #141)

- **Combat:** a finished roll is now one short card, e.g. "5 Critical · Attack Shortspear vs Failure → Impale, Bypass Armour". It has **Attack again** and **Parry** buttons for the same weapon and Combat Style, plus Change and Record damage.
- **The page no longer scrolls on any desktop size.** Leftover height is trimmed automatically; checked at 1363×936 and 1440×900.
- **Comatose and Dead** now say "no activities are possible" and "Dead" (Core p.79) instead of showing Hopeless rolls. All rolls and initiative are refused, and skills show "—". Semi-Conscious stays a Hopeless grade.
- All five right-hand tabs fit on one line at common desktop widths.

## 2026-11-05 — Owner-only Play Mode and Core live acceptance (docs only)

- Recorded desktop layout, side panels, Attack/Parry and effects, skill pin/search, all four Advance time options, and a fresh Character Builder rules spot-check in `docs/play-mode-live-acceptance-20261105.md`, with four screenshots.
- Found desktop document overflow, a resolved combat card that remains tall, and Comatose/Dead wording that should distinguish terminal states. Derived attributes, all 22 Standard bases, allocation controls, active Fatigue grades and Minor Wound daily healing passed this fixture; all four time actions left MP unchanged.
- Exact 390px phone testing remains unverified: responsive DevTools was blocked and native window resizing unavailable. Supplemental 340px zoom checks exercised all bottom sections, bottom-anchored details and a clicked tip; they are not a phone-height/touch pass.
- Used only the owner account. Created and deleted one disposable character, confirming deletion after reload. No code changed; all 26 local test scripts passed on the tested baseline.
- Updated the handoff to reflect the previously completed live security migration (table present; counts 1/0), without publishing its private backup. Multi-account permission checks remain outstanding.

## Play Mode: Advance Time, quicker combat, no Sheet button

- **Advance time** (header button) opens a menu with four options:
  - **Rest one day:** each Minor Wound heals your Healing Rate. Serious and Major Wounds say they need a week or a month (Core p.80).
  - **Recover one Fatigue level.**
  - **End the fight:** clears initiative and Surprised, and restores Action Points.
  - **Start a new session:** refills Luck Points.

  Magic Points stay manual.
- **Combat:** once you've chosen your Special Effects (or no effects are won), the combat roll card shrinks to one line, e.g. "vs Failure → Impale, Bypass Armour". Attack and Parry sit right under it for the next roll. Change reopens the choices.
- The **Sheet** button is gone from Play Mode.

## Play Mode: characteristics row, steady side panel, cleaner tabs

- **The characteristics sit in their own row across the top**, like D&D Beyond's ability scores. Action Points, Initiative, Magic Points, Luck and Fatigue follow in the same row. Damage modifier, Initiative bonus, Movement, Healing rate and Experience modifier are in an Attributes box above the Body.
- **Nothing moves when a side panel opens.** Its space on the right is always kept, with a short hint while empty.
- **No scrollbars on the tab row** (Combat, Spells, Inventory, Features & traits, Notes).

## Play Mode layout v2: one screen, columns that scroll, side panel

Built from the owner's sketch and D&D Beyond's sheet.

- **Desktop fits the window: the page itself no longer scrolls.** Three columns each scroll on their own:
  - **left:** Characteristics with Action Points, Initiative, Magic Points, Luck and Fatigue, then the Body (figure and hit locations);
  - **middle:** Skills, with search, pins and Passions at the foot;
  - **right:** tabs for **Combat, Spells, Inventory, Features & traits, Notes**.
- **A side panel, like D&D Beyond's.** Descriptions and detail open in a panel on the right, and the columns narrow to make room, so nothing is covered. This covers a hit location's damage controls, a Special Effect's rules, the roll log, combat action descriptions, fatigue, hazards, GM skill rulings and casting notes. Close it with × or Esc.
- The header shows the character portrait (or initials), with Roll log, Sheet and Improve skills buttons.
- Clicking something no longer jumps a column back to the top: each column keeps its scroll position.
- **Phones:** one area at a time from the bottom bar (Stats, Skills, Combat, Spells, Items, Traits, Notes). The side panel slides up from the bottom.

## Play Mode redesign, batch 5: tips, Gear, Notes and Magic

- **Short tips:** a small **?** beside Health, Action Points, Initiative, Magic, Luck, Fatigue, Surprised, Special Effects, Difficulty Grades and Encumbrance explains the term in a sentence or two. Hover on desktop, tap on a phone. The Luck tip follows Core: reroll, one extra Action Point when you're out, or downgrade a Major Wound to Serious.
- **Gear tab:** an encumbrance bar against your limit (and money left, if you rolled starting money). Armour shows one line when none is worn. The inventory has clear columns, and labelled fields on a phone.
- **Notes tab:** Passions come first, and each one can now be **rolled** like a skill. Combat Styles and background notes follow, without the old styling.
- **Magic tab:** the long casting notes are folded under "How casting works here".
- This completes the five-batch Play Mode redesign. Rules, calculations and saved data are unchanged, apart from the new pinned-skills list.

## Play Mode redesign, batch 4: skill search, pins and the Body tab

- **Search skills:** type in the box at the top of the Skills tab to narrow the list by name or characteristic (e.g. "pow").
- **Pin skills:** tap ☆ beside a skill to pin it to a Pinned group at the top. Pins are saved with the character.
- **Body tab:** the figure is smaller and sits beside a clear list of hit locations, each with an HP bar, armour and wound status. Tap a location (on the figure or the list) to record damage or healing; the damage entry itself is unchanged.
- The Fatigue picker is easier to read.

## Play Mode redesign, batch 3: combat flow

- **Each weapon has Attack and Parry buttons** with your Combat Style percentage beside them. Ranged weapons show only Attack. Evade has its own button. The roll remembers whether it was an attack or a defence, so there's no dropdown to fill in afterwards.
- **A combat roll card** at the top of the Combat tab shows the result. You tap what your opponent rolled (or "No defence"), and the card tells you who wins how many Special Effects. If it's you, it lists **only the effects this roll allows** with that weapon, each with a Choose button. The full list of 43 is still there, folded under "Special Effects reference".
- **A turn strip** groups Initiative, Action Points, New round and Surprised.
- **Actions are compact chips** that spend AP; "What each action does" opens the descriptions.
- Fatigue and the hazards rules moved to the Body tab, next to the hit locations. "Record damage" takes you there.
- The Rolls panel now shows a short summary of each combat roll with a button back to the card. On a phone it sits below the tab content, since the dice tray already shows each result.

## Play Mode redesign, batch 2: physics dice

- **Every roll now shows the physics dice from Practice Combat.** A tray in the corner (above the tab bar on a phone) tumbles the two d10s, then shows the number and result: Critical, Success, Failure or Fumble. It closes after a few seconds, or with its ×.
- The roll is decided and logged before the dice move, so the animation never changes a result. Reloading the page doesn't replay old rolls.
- Players can turn the animation off with **Animated dice** in the Rolls panel. It's also off for anyone whose device asks for reduced motion. Without the animation, the tray shows the number straight away.

## Play Mode redesign, batch 1: the new layout

- **Play Mode has a new, cleaner layout.** A slim header, then a vitals bar that's always visible: Health (your worst wound), Action Points, Initiative, Magic Points, Luck and Fatigue.
- **Tabs:** Skills (the default), Combat, Body, Gear, Magic (only if the character has magic) and Notes. On a phone the tabs sit at the bottom of the screen like an app.
- **Desktop has three columns:** characteristics on the left, the open tab in the middle, and your rolls on the right, so a result appears beside the thing you rolled.
- Nothing scrolls sideways any more, on desktop or phone. The roll rules are folded under "How results work".
- Every rule, calculation and saved field is unchanged. Coming next: a roll panel using the physics dice from Practice Combat (batch 2), then combat flow (batch 3).

## Security: GM notes hidden from players; campaign assignment checks

- **GM session notes and the Combat Tracker are now GM-only.** They used to be stored on the campaign record, which every player in the campaign can read, so a player could see your notes and NPC stats with their browser's developer tools. They now live in a separate table only the GM can read.
- **Needs the owner to run the database change once:** open Supabase → SQL Editor, paste `supabase/migrations/20261106120000_gm_private_state_and_assignment_checks.sql`, and run it. It copies existing notes and tracker data across. Until then, the app keeps working the old way.
- The same change stops a player moving their character into a campaign they don't belong to, and makes the GM inventory function accept only an item list.
- All 183 campaign and account cases (ChatGPT, PR #129) are mapped in `docs/campaign-cases-batch-1.md`, with four decisions for the owner and a multi-account test plan.

---

## Subsystem 8 — Campaign and live integration case inventory (docs-only)

- Added `docs/campaign-cases-batch-1.md`: **183** app-acceptance cases across **10** groups for campaign setup/rules, auth and account isolation, invites, character ownership and assignment, Party Board/GM tools, save/reload/concurrent edits, imports/backups, backend RLS/RPCs, campaign continuity, and end-to-end session workflows.
- Cases use **App/security contract — not Core** where no rulebook rule applies; Core pp.72–73 are cited only for the two characteristic advancement methods.
- **Highest priority:** deny unrelated-account access, ensure members' read-only character views and the GM's narrowly scoped inventory/unassign rights, prevent stale autosaves from undoing assignments or losing progress, and keep the GM's campaign accessible through creation/service failures.
- Source review used current client code and project decisions, **not live server migrations**. No implementation passes, signed-in test results, or server-policy certification are claimed. **Subsystem 8 open; project progress 3/8.**
- Docs only; no JavaScript, CSS, HTML, tests, Supabase or deployment settings changed. Full local Node suite not run (repository checkout unavailable); CI/Claude must verify.

---

## PR #128 live acceptance blocked on test-session setup (2026-11-05, America/Los_Angeles)

- Confirmed live GM sign-in and DM campaign access. The inspected New Campaign has only the DM member and no linked characters. An independent test-player browser session was not established.
- Item reveal/notice ordering, acknowledge-and-reload behavior, and third-item/AP-save concurrency remain **not run**, not passed or failed. No items, campaigns, memberships, characters or AP were changed; campaign creation was abandoned before submission.
- HANDOFF.md records the missing prerequisites and exact remaining checks. Documentation only; progress remains 3/8.

---

## New item pop-ups for players

- **GM:** open a player's sheet from the Party Board, go to Inventory, and use **Give an item** (name, quantity, ENC, cost, an optional note). Tick **Reveal** for the full-screen reveal; leave it unticked for a small notice.
- **Player:** the next time their sheet loads or saves, or within about 30 seconds while Play Mode is open, they see "New item" with the item's name, details and your note. The full reveal is a dark crimson panel with a slow light burst (still for anyone who has reduced motion turned on). Each gift shows once; several gifts queue up one after another. Gifted items are tagged "new", then "gift", in the inventory list.
- **Fix:** a player's open sheet used to save its whole inventory, so anything the GM added while the player was in Play Mode could be erased by the player's next autosave. Their sheet now pulls in the GM's gifts before saving. Items the GM edits in other ways (not through Give an item) can still be overwritten this way; that's a wider fix for later.

To test: as GM, give a test character an item with Reveal ticked. Open that character as its player: the reveal appears; Continue dismisses it and it doesn't come back after a reload.

---

## Advancement rulings: 20-point trainers and maiming

- A mentor exactly 20 percentage points better than the student now trains on the first row of the Training Improvement table (1d2). The book's text says "at least 20%" but its table starts at 21%; the owner ruled for the text.
- Play Mode's permanent-injury box now shows the Core p.80 Permanent Injury results for the selected location. Results 1 and 2 remove one third or two thirds of its HP, with the HP lost rounded up; result 3 leaves 1 HP. Click a result to fill in the new maximum, then confirm. A location never drops below 1 HP.
- Both rulings are recorded in `docs/decisions.md`.

To test: in Play Mode, select a location, open "Permanent injury: location maximum" and check the three buttons (e.g. a 5 HP arm shows 3, 1 and 1). In the Experience panel, train a skill with a mentor exactly 20 points higher: it should gain 1–2%.

---

## Combat follow-up live acceptance after PRs #121/#122 (2026-11-05, America/Los_Angeles)

- One signed-in batch passed all six requested checks: initiative/surprise/reset, action groups, Club-linked Special Effects, unfamiliar-weapon penalty/floor, Unarmed combat tools and nonzero armour subtraction.
- Club success at 35% blocked Bleed and allowed Stun Location. Dagger Broadly similar rolled at Hard 23% from 35%, and retained the 20% STR+DEX floor when using a 20% style. Chest armour AP 1 reduced 4 damage to 3 HP.
- Restored temporary weapons/armour, HP, money, AP, initiative and surprise; retained roll evidence. Updated `docs/combat-cases-batch-1.md` and `HANDOFF.md`. All 19 local test files passed. No production code changed; Subsystem 5 stays open, progress 3/8.

---

## Advancement cases mapped; unarmed damage display fixed

- All 216 Advancement, hazards and recovery cases (ChatGPT, PR #124) now have an app status in `docs/advancement-cases-batch-1.md`. No incorrect calculations were found: Experience Rolls, improvement, characteristic training and permanent improvement, new Professional Skills, ageing, Fatigue and natural healing already match the book. Hazards, disease and traps stay GM-assisted.
- Two rulings are needed from the owner: trainer exactly 20% better, and how to round a third or two thirds of a maimed location's HP.
- Fixed the doubled plus sign on the Unarmed damage line found in the live check (PR #123): it now reads "1d3+1d2", "1d3-1d4", or just "1d3".

---

## Subsystem 4 — source-verified advancement, fatigue, healing and hazards cases

- Added `docs/advancement-cases-batch-1.md`: **216 individual acceptance cases** across ten groups for Core Experience Rolls, skill and Passion improvements, temporary/permanent characteristic boosts, mentor training, ageing, fatigue/exertion, medical and natural healing, maiming, environmental hazards, disease/poison conditions and examples, survival, traps, weather, Luck Points and relevant interactions (printed Core pp.68–85 with cited supporting pages).
- Checked original PDF and visually verified key ageing, training, disease, Fatigue, falling, fire, maiming and trap tables. Explicitly left the exact +20 training differential and fractional maiming calculations for GM/owner interpretation rather than inventing missing rules.
- **Documentation only:** implementation/test status, live acceptance and GM-managed scope remain for Claude's mapping. Subsystem 4 is **OPEN**; 3/8 prior closeouts retained. No JS, HTML, CSS, tests or deployment configuration changed; local Node suite not run; CI is the required PR test signal.

---

## Combat live acceptance after PR #121 (2026-11-05, America/Los_Angeles)

- Signed-in checks passed for initiative arithmetic/manual d10/New Round retention, the three action groups and sampled 1-AP buttons, human unarmed stats, a successful attack against No parry, and selecting Press Advantage.
- Temporary chest armour AP 2 reduced 5 entered damage to 3 HP (Chest 7→4/7, Minor Wound). Restored the audit fixture's HP, armour, silver, AP and initiative; retained test roll evidence.
- Documented a cosmetic unarmed damage double plus (`1d3 + +0`), with correct numeric values. No production code changed. Full evidence and limits are in `docs/combat-cases-batch-1.md`; `HANDOFF.md` updated. All 19 Node test files passed. Subsystem 5 remains open; progress 3/8.


---

## Combat: weapon-specific Special Effects, unfamiliar weapons, surprise

- **Roll with a weapon.** Each carried weapon in Play Mode has a roll button for the Combat Style that covers it, and Unarmed has its own. The roll remembers the weapon, and the Special Effects list then hides effects that weapon can't use. A club can Bash and Stun Location but not Bleed; only ranged weapons get Marksman; only Small weapons get Remise. You can also set "Weapon used" on any combat roll. With no weapon set, every effect stays available.
- **Unfamiliar weapons (Core p.88).** A weapon outside your Combat Styles offers the book's choices: similar (no penalty), broadly similar (1 grade harder), reasonably different (2 grades), used with a trained weapon (1 grade), substantially different (base STR+DEX). The penalty never takes you below STR+DEX.
- **Surprised (Core p.105).** A toggle on the Actions tab: initiative −10, Attack disabled, and a reminder that you can't defend until your initiative and the first hit on you gains an extra Special Effect. New Round clears it.
- Unarmed rolls now count as combat rolls, so they get the attack/defence and Special Effects tools.

To test: in Play Mode, roll a carried club, mark it as an attack, click "No parry", and open Special Effects: Bleed should not be choosable but Stun Location should. Tick "Surprised" and roll initiative: it should be 10 lower.

---

## Combat: Core action list, initiative roll, unarmed stats, and case mapping

- **Action list** in Play Mode now follows Core pp.91–93: proactive actions (Attack, Brace, Cast Magic, Change Range, Dither, Hold Magic, Mount, Move, Outmanoeuvre, Ready Weapon, reloads, Regain Footing, Struggle), reactive actions (Counter Spell, Evade, Interrupt, Parry) and Free Actions at 0 AP (Delay, Assess Situation, Drop Weapon, Signal, Speak, Use Luck Point, Ward Location). Non-Core labels like "Change Combat Stance" and "Shove / Grapple" are gone. Each action shows its conditions.
- **Initiative roll:** roll 1d10 + your current Initiative Bonus (armour and Fatigue included), or type in your own d10. It stays for the whole fight; New Round doesn't clear it.
- **Unarmed attacks** are always listed: 1d3 + Damage Modifier, Size S, Reach T (Core pp.105–106).
- All 191 Combat cases from ChatGPT are mapped to app status in `docs/combat-cases-batch-1.md`. Claude checked the Differential table (p.51), armour initiative penalty (pp.58, 90), Combat Actions (pp.91–93) and all 43 Special Effects (p.100) against the book: the app matches.
- New `tests/combat-cases.cjs` covers AP, initiative, the action list, Differential results, no-parry, the parry Size matrix, hit locations, wound levels, armour on applied damage, and all 43 Special Effects' eligibility.

To test: open Play Mode, Actions tab. Click "Roll initiative" and check the total is your d10 plus the Initiative shown in the top bar. Check that the action list has Proactive, Reactive and Free groups, and that "Unarmed (human)" appears under weapons.

---

## Subsystem 5 — Combat Core case inventory (documentation only)

- ChatGPT added `docs/combat-cases-batch-1.md`: 191 individual **Given → Core p.N → expected app behaviour** cases for action economy, AP and initiative, Combat Styles, attacks/parries, all 43 Special Effects, melee/ranged situational rules, damage, armour and wounds (Core Combat pp.86–111, plus supporting pp.8 and 51).
- Cases identify GM-assisted rules and the enabled optional Reach/Range rule. This is a source-verification batch only: the implementation status, automated tests and signed-in acceptance remain for Claude/ChatGPT Work. **Subsystem 5 remains open; overall progress 3/8.**
- No production source, tests, site assets or deployment configuration changed. Local Node suite not run (clone unavailable); PR CI is required before merge.

---

## Folk Magic catalogue accepted live after PR #118 (2026-11-05, America/Los_Angeles)

- Signed-in catalogue-only recheck passed: the builder lists all 70 Core choices. Selecting Beastcall (X) shows Instant, Ranged, Resist (Willpower), Core p.124 and the animal-type speciality box; Play Mode shows its traits.
- Observed content-hash stamps match PR #118's merged revision. The earlier empty-picker failure is retained as history in `docs/magic-cases-batch-1.md`; `HANDOFF.md` now closes this specific live check.
- No casts, cost checks or reload regressions repeated; no production code changed. Magic remains paused, Subsystem 6 remains open and progress remains 3/8.

---

## Fix: updates not reaching returning players

- Each script and stylesheet in `index.html` carries a `?v=` stamp so browsers know when to fetch a new copy. The stamps were numbered by hand and weren't bumped for the last three releases, so a browser that had the site cached could keep running old code. That's why the new Folk Magic spell list didn't show up in the live check.
- The stamps are now a fingerprint of each file's contents, set by `python3 scripts/stamp-assets.py`. A new test fails if any stamp is out of date, so this can't silently happen again.
- Three older tests that pinned specific stamp numbers now just check the files are linked with a stamp.

To test: after this deploys, open the site and reload once. The builder's Folk Magic step should list 70 spells.

---

## Live magic acceptance evidence (2026-11-05)

- ChatGPT (Work) verified PR #110 in one signed-in session: immediate reload recovered turn 1/2 for Mysticism, Sorcery and Theism; declining recovery once did not prompt again on character reopen. Preparations and cancellations did not spend resources.
- Folk Magic live failure/success spent 1 MP each, critical spent 0 MP, 0 MP refused before rolling, and card timing/potency/range matched Folk Magic 29%. Five catalogue entries matched rendered Core pp.124/128, including Bladesharp's d8 values.
- **Catalogue live acceptance remains open:** this browser still received the previous empty picker/manual-entry interface after PR #116's successful Pages deployment. Beastcall traits, Core page and speciality could not be accepted live. The ledgers separate this failure from passing main-data tests; Claude should check served assets/invalidation.
- Recorded detailed evidence in `docs/magic-cases-batch-1.md` and `docs/magic-subsystem-cases.md`, and updated `HANDOFF.md`. All 17 Node test files passed. Documentation only; no production code changed. Progress remains **3/8**.

---

## Folk Magic spell catalogue

- The builder's Folk Magic picker now lists all 70 spells from Mythras Core pp.123–129, with traits, full descriptions and page numbers. Play Mode spell cards show each spell's traits. Spells typed in by hand before still work, and if the name matches a Core spell, they now show its details.
- Data comes from `docs/folk-magic-catalogue.json` (ChatGPT, PR #114). `scripts/build-folk-magic.py` copies it into `js/data.js`, and a test fails if the two differ.
- Fixed PDF-extraction errors in the source: Bladesharp's damage steps had lost every "8" (now 1d4>1d6>1d8>1d10>2d6>2d8>2d10), two stray "·" characters, one missing space.
- Added the Trigger trait explanation.
- Spell effects (damage steps, durations, resistance) are still resolved at the table (decision D-3).

To test: in the builder's Magic step, give a character Folk Magic, open the spell list and pick Beastcall (X). It should show its traits, "Core p.124" and a speciality box for the animal type. In Play Mode the card should list its traits.

---

## Documentation: Folk Magic catalogue, Animism case inventory, and Magic decisions (2026-11-05)

- ChatGPT prepared `docs/folk-magic-catalogue.json` from the user-provided Mythras Core pp.123–129: all 70 spells, printed names and traits, full reflowed descriptions, page numbers and two `(X)` specialization hints (PR #114). **Claude implementation in `FOLK_MAGIC` is still pending.**
- D-4: proposed rounding up for fractional specialist starting-spell counts and Magical Strength ceilings; neither Core p.121 nor p.116 specifies a fractional example. D-5: recommended GM-led casting interruptions, pending owner decision (`docs/decisions.md`).
- Separately, ChatGPT opened PR #115 with 66 initial Animism source cases (pp.130–145) and explicitly identified unfinished spirit-type and ability children.
- Docs-only source work. No code, tests or deployments changed; CI and subsequent live checks remain necessary.

---

## Magic cases Batch 1 and Folk Magic card details

- Filed ChatGPT's Subsystem 6 Batch 1 cases (Core pp.112–129) in `docs/magic-cases-batch-1.md`, with the app's current status for each case and five open decisions.
- Folk Magic cards in Play Mode now show 1 Turn, Intensity 1, Magnitude 1 and range in metres (the Folk Magic skill, unaffected by difficulty grade).
- New `tests/magic-folk-cases.cjs` covers Folk Magic casting costs (critical 0, success 1, failure 1, fumble 1d3 without overdrawing), the 0 MP block, the single Folk Magic skill, and the card display.

To test: open Play Mode for a Folk Magic character and check a spell card reads "1 Turn · Intensity 1 · Magnitude 1 · ranged N m", where N is the Folk Magic skill.

---

## Account save on reload and tab switch

- Play Mode changes reach the account 1.5 seconds after the last click. A reload inside that window opened the older account copy, which explains the lost Mysticism preparation turn in the November 5 paired-skill batch. Waiting saves now start as soon as the page is hidden, reloaded or closed instead of waiting for the timer.
- If the owner declines the "restore local draft" prompt, that draft is no longer offered again on the next open.
- The local draft and recovery prompt remain the fallback when the browser abandons a request during unload.
- Regression tests cover the immediate save on page hide, draft acknowledgement, and the declined draft not being offered again.

To test (signed in): start a two-turn Mysticism preparation, then reload immediately. Turn 1/2 should be kept, either directly or through the recovery prompt. Repeat, decline the prompt, then reopen the character: no second prompt should appear.

---

<!-- merged from CHANGELOG-PRACTICE-RECENTER-2.md, added 2026-11-05 -->
## Practice Combat — Recenter update 2

Combat choices now explain the current situation during the gauntlet, with optional guidance and readable descriptions on the choices themselves.

### Changed

- Guidance is on by default in Normal and Hardcore. It can be switched off without changing the fight, dice or pace. The preference is remembered. Guided Tutorial always keeps its explanations.
- Guidance stays visible when a choice is focused or hovered. Hovering no longer replaces the situation explanation, and the duplicate helper line is removed.
- A missed attack explains the tradeoff: spend an AP attempting to earn defensive Special Effects, or keep the AP.
- Weapon and shield parries show their effective roll target and the actual Size comparison for the incoming weapon. Evade makes its prone consequence explicit. Disabled reactions name the current restriction.
- Attack and Delay are both visible on ordinary turns. Useful range changes, shield wards and immediate recovery actions are surfaced when applicable; other actions stay available under More actions.
- Action descriptions are readable without hover and use the engine's current target, including fatigue and other applied conditions. The last AP, reach disadvantage, prone state and disarm state have distinct context.
- Legal Special Effects are grouped by purpose: control, damage/protection, and position/recovery. Grouping does not remove or auto-select any legal effect.
- Corrected shield wards: a warded shield can be used for an active parry, which ends its ward. Parrying with the separate weapon keeps the shield ward intact.
- Normal roll screens keep their existing roll instructions without repeating a guidance panel. Tutorial retains its roll explanations.
- Manual roll prompts, left/right fighter positions and the existing meaningful result pauses are preserved. No new Continue steps were added.

### What to test

1. Enter Normal Gauntlet. Look for both Attack and Delay, with short explanations. Switch Guidance off and on; the fight and Action Points must not change.
2. When an opponent misses, inspect the explanation for choosing a parry anyway.
3. Compare weapon and shield parries against a larger weapon, including their current roll targets and protection.
4. Set a shield ward, then actively parry with that shield. Its passive ward must clear. A weapon parry must leave the separate shield ward intact.
5. Earn Special Effects and check the purpose groups. All legal options should remain selectable.
6. Check a last-AP decision, a reach disadvantage and a prone recovery decision. Guidance should describe that situation rather than repeat a generic tutorial line.

### Source verification

Used the uploaded **pdfcoffee.com_mythras-2e-2-pdf-free.pdf** (Mythras Core, 2e). Searched its parsed text first. Because the text encoding is garbled, rendered page images were then checked directly. Printed pages 91-95 cover actions, Delay, standing, wards, missed-attack parries, damage reduction and Special Effects; p.100 supplies the effect summary table; pp.101 and 103 cover prone fighting and Evade; pp.106-107 cover optional weapon reach. PDF page numbers are one higher than the printed page labels.

The in-app text uses concise teaching summaries and the book's action names. Source page references are available in each expanded Why explanation. Arena-specific limitations are identified as such. This is a focused decision/teaching update, not a declaration that the entire combat engine has been re-audited.

### Validation

319 automated checks passed: 14 tactical-guidance checks, 175 practice UX/pacing checks, 14 character-practice checks, 96 rules smoke checks and 20 unified workflow checks. The browser review used a synthetic practice fighter and the actual arena runtime.

- Tactical-guidance integration checks verify displayed targets, disabled reactions, retained legal effects, AP-safe preference changes, source-verified shield ward transitions, last-AP decisions and relevant reach choices.
- Existing practice UX/pacing, character handoff, rules smoke and unified workflow checks passed.
- Browser preview checked ordinary choices, a missed attack, weapon/shield Size comparisons, an active parry from a shield ward, Special Effect grouping, a reach disadvantage and the Guidance Off view.

### Next

Tune generated opponents into coherent tactical challenges and make the gauntlet's increasing difficulty clearer while testing several actual character builds.


---

<!-- merged from CHANGELOG-PRACTICE-RECENTER-1.md, added 2026-11-05 -->
## Practice Combat — Recenter update 1

Saved characters can now enter the practice gauntlet from **Characters → Practice Combat**. The arena continues to open on its existing page.

### Changed

- Added a Practice Combat action to each saved character card.
- Uses a temporary, rested copy with the character's actual Combat Style percentage, advanced characteristics, six combat/recovery skills, Action Points, location HP maximums, location armour and armour initiative penalty.
- Select a Combat Style and a supported weapon/shield that the character both owns and has listed in that style. An unsupported loadout cannot silently become the preset fighter.
- Normal restores the imported HP maximums after a win; Hardcore carries only practice injuries forward. Retrying starts another fresh practice copy.
- Setup identifies abilities and equipment outside the arena's current scope. Combat Style Traits, species abilities, magic, Luck, encumbrance modifiers, ranged attacks, dual wielding and in-combat weapon switching remain unimplemented.
- Fixed unreadable setup headings, made the character loadout compact, and added a return link to My Characters.
- Decision help now reports the current Action Point situation. Manual rolls and the existing result pacing are preserved.

Supported weapon profiles: Broadsword, Shortspear, Mace, Dagger and Greatsword. Supported shields: Buckler, Heater and Hoplite. The existing five weapon profiles are reused; this update adds no new weapon data or rule interpretations. Derived character values come from the existing Forge sheet calculations.

### What to test

1. Open Characters, choose Practice Combat on a saved character, and compare the available style, skills, AP, armour and HP maximums with the sheet.
2. Select a weapon and shield; select a Greatsword and check that the shield becomes unavailable.
3. Start a fight, take damage, then return to Characters. The saved character's wounds and resources must be unchanged.
4. Win a Normal encounter and check the next opponent starts with restored practice HP. In Hardcore, practice damage should carry forward.
5. Try a character with an unsupported weapon or an empty Combat Style weapon list. Setup must explain the missing loadout and prevent entry.

### Validation

- Character-practice integration tests cover profile isolation, progression values, HP maximum overrides, armour, ownership, zero skills, invalid profiles, unsupported loadouts, two-handed gear, Normal recovery and Hardcore carryover.
- Existing practice UX, unified route/workflow and rules smoke suites pass.
- Browser preview verified loadout selection, the two-handed shield restriction, opponent entry and the imported fighter's displayed battle values using a synthetic test character.
- A signed-in production walkthrough with a real saved account character remains to be checked; account and database writes were not changed.

### Next

Improve situation-specific decisions and teaching throughout the gauntlet, with explanations verified against the uploaded Mythras Core Rulebook. Then tune coherent generated opponents and progression around actual character builds.


---

<!-- merged from CHANGELOG-MAGIC-AUDIT.md, added 2026-11-04 -->
## Magic and organizations audit

- Sorcery now displays the INT limit for memorised spells, the single Concentration limit, and the time needed to swap memorised spells. Source: uploaded Mythras Core Rulebook, p.165.
- The editor prompts for GM review when named spells exceed current INT. Recorded spells may include spells outside the memorised selection, so this is an advisory.

To test, open the Sorcery editor on a character with more named spells than INT. Verify the warning appears and all entries remain accessible.

### Folk Magic cost display

- Play Mode now shows the 1 MP base cost for player-recorded Folk Magic spells. Critical success costs zero and a fumble costs 1d3 MP (uploaded Core p.122).
- To test, record a Folk Magic spell, open Play Mode → Magic, and check the card shows 1 MP base before rolling.

### Cult and brotherhood ranks

- Community & Connections now has an expandable reference for joining, promotion and suggested training discounts (uploaded Core pp.196–199).
- The previous update changed a dormant affiliation editor. The reference is now available through the standard builder.

To test, open Community and expand **Cults and brotherhoods**. Common starts at 0% and Leader reaches 100%, with 25-point steps between ranks.

### Casting progress and cancellation

Active Sorcery, Mysticism and Theism entries now open to show casting progress and a Cancel casting control. Sorcery previously placed its cancellation control inside a closed spell disclosure. Mysticism and Theism had cancellation handlers without matching controls.

Live evidence: a dedicated Quick Character with Invocation and Shaping completed a two-turn Duration-shaped cast. Reload preserved turn 1/2 and 11 MP. The final successful roll spent 2 MP. The fixture remains saved for subsequent tests.

To test, begin a multi-turn cast, reload, then cancel. The casting marker should clear without a roll or MP charge.

### Recover an unconfirmed account save

- A reload can offer the signed-in owner a local draft when its account save was not confirmed. Accept restores the draft; Cancel loads the account copy. The choice protects against silently overwriting changes made on another device.
- Successful account writes acknowledge only the exact matching local snapshot, preserving newer unsynced edits.
- Regression coverage exercises recovery of an in-progress Mysticism cast, declining recovery, and owner isolation. A live immediate-reload retest remains open.

To test, begin a two-turn cast and reload before account sync finishes. Accept recovery and verify preparation remains at turn 1/2. Repeat and decline to open the account copy.


---

<!-- merged from CHANGELOG-COMBAT-AUDIT.md, added 2026-11-04 -->
## Combat audit

- The Play Mode parry calculator accepts a failed or absent parry without weapon sizes. A successful parry still uses both effective sizes.
- The calculator explains when to choose Special Effects and when a defender may parry a miss. Source: uploaded Mythras Core Rulebook, pp.94–95.

To test, select a hit location in Play Mode and open the parry calculator. With 8 attack damage and no sizes, No parry and Failed parry should each show 8 before armour. A successful Large parry against a Huge attack should show 4. The calculator does not apply damage.


---

<!-- merged from CHANGELOG-ADVANCEMENT-HAZARDS-AUDIT.md, added 2026-11-04 -->
## Advancement, hazards and recovery audit

- Play Mode Vitals now links the GM's hazard rulings to the existing damage, Fatigue and recovery controls.
- The reference covers poison and disease resistance, falls, fires, exertion, sleep deprivation and healing. Source: the uploaded Mythras Core Rulebook, pp.74–80, checked against rendered pages.
- The direct HP control now calls out falls as an example of damage that bypasses armour.

To test, open Vitals, expand **Hazards and recovery**, and open a hit location. Check the direct HP tooltip and verify that applying a resolved fall bypasses armour. Use a test character for damage and recovery checks.

### Follow-up

- Vitals now explains breath-holding, Endurance outcomes and blood-loss recovery (uploaded Core p.71).
- Mentor training shows the weekly cash guideline and trainer versus teacher student limits (Core p.73).
- An ageing regression verifies both failed checks, updated skill bases, duplicate prevention, reload and undo (Core pp.70–71).

To test, expand the Vitals hazard reference and the Experience Rolls mentor panel. On a test human aged 54, record a failed physical and mental ageing check, reopen the character and remove the test record.


---

<!-- merged from CHANGELOG-ZERO-SKILL-ROLLS.md, added 2026-11-04 -->
## Skill roll boundary

- Correct a 0% skill so a roll of 01 is an automatic success rather than an invented critical. At 1%, 01 remains a critical.
- Cover this boundary in the opposed-roll calculator, including the shared reduction for skills above 100%.
- Record remaining situational capping, augmentation, retries and contested-roll audit work.

Source: user-uploaded Mythras Core Rulebook, printed pp. 37 and 50–51. The 0% critical range is a mathematical interpretation of the printed rule. All automated Node suites pass; a signed-in live test remains outstanding.


---

<!-- merged from CHANGELOG-WEAPON-MALFUNCTION-AUDIT.md, added 2026-11-04 -->
## Weapon Malfunction audit

- The Special Effect now identifies the conflict between its Core p.100 summary and the standard differential-roll result, and directs the GM to adjudicate it manually.
- Test: find Weapon Malfunction in Special Effects and read its description. The app does not invent an eligibility rule for the ambiguous entry.
- All nine JavaScript suites were run; signed-in live browser testing remains outstanding.


---

<!-- merged from CHANGELOG-UPDATE-30.md, added 2026-11-04 -->
## Update 30 — Record Special Effects from a combat roll

- A won Combat Style roll now opens the Special Effects list in selection mode, showing the number of choices allowed by the opposed result.
- Players can choose and remove effects. Selections appear on the roll result and persist with the character's roll log.
- The selector caps choices at the result's margin, permits repeated stackable effects, excludes defensive-only choices, and blocks clear critical or fumble requirements when the roll does not qualify. Weapon and other situational requirements remain visible for table adjudication.
- Changing the opponent's roll clears choices made against the earlier result. Read-only sheets cannot alter selections.
- The existing reference list remains available when the opponent wins.

Verified locally with `node tests/effect-selection.cjs`, `node tests/combat-turn.cjs`, and `node tests/rules-smoke.cjs`. Signed-in hosted play remains to be checked with an authenticated account.


---

<!-- merged from CHANGELOG-UPDATE-29.md, added 2026-11-04 -->
## Update 29 — GM turn clarity

- The tracker names the active and next combatant, and marks the active card **Acting now**.
- Initiative edits and adding or removing combatants preserve whose turn it is. If the active combatant is removed, the next one takes over.
- Advance turn keeps spent Action Points; New round restores them.

Test: Add three combatants, advance once, change another combatant's initiative, and verify the same person remains active. Remove the active one and check the next combatant. Spend AP, advance, then start a new round to see AP restore.


---

<!-- merged from CHANGELOG-UPDATE-28.md, added 2026-11-04 -->
## Update 28 — Special Effects visibility

- The searchable Special Effects choices now appear first when the tab opens.
- The roll comparison table follows the choices and starts collapsed.
- The optional range explanation remains below the choices.

Test: Open a character in Play Mode, choose **Special Effects**, and confirm names such as **Bleed**, **Disarm Opponent**, and **Trip Opponent** appear immediately. Search for an effect and expand it to read its requirements.


---

<!-- merged from CHANGELOG-UPDATE-27.md, added 2026-11-04 -->
## Update 27 — Combat roll follow-through

Combat roll results link directly to Special Effects and injury controls. Choose a body location to record raw damage; armour subtraction is unchanged.

Test: roll a Combat Style, choose the opponent’s result, open effects, then record injury. New Round alone restores Action Points.


---

<!-- merged from CHANGELOG-UPDATE-26.md, added 2026-11-04 -->
## Update 26 — Password reset recovery

- Register the Supabase auth listener before restoring a session so a reset-link redirect can open the new-password form.
- Keep the account form visible when recovery is detected during startup.
- Refresh the router asset on the live site.

Test: request a new reset email, open its link once, and check that Forge shows **Choose a new password**. Then set a new password and sign in. Previously used reset links cannot be reused.

Verification: the cold-start password-recovery regression and all 11 prior release regressions passed locally. A fresh live email-link walkthrough is still needed.


---

<!-- merged from CHANGELOG-UPDATE-25.md, added 2026-11-04 -->
## Update 25 — Campaign access hardening

### Changed

- Campaign data, characters, profiles, and custom campaign content now require a signed-in account at the database policy level.
- Anonymous callers can no longer invoke campaign-join or DM-only RPCs.
- Campaign membership helpers moved out of the public API schema.
- DM inventory edits and character removal retain their required server-side DM checks, with a hardened function search path.
- Future public database functions receive no automatic execute grant.

### Verified

- All five public data tables have RLS enabled and only authenticated policies.
- The anonymous role has no access to campaign join, DM actions, or private membership helpers.
- The authenticated role retains the minimum required access for campaign joining and policy evaluation.
- 11 application release regressions pass.

### Still to test live

- DM creates a campaign and joins with a second signed-in account.
- Player joins using an invite code, sees the campaign, and cannot edit DM-only content.
- DM can edit a member character's inventory and remove that character from the campaign.

### Follow-up

- Enable Supabase Auth leaked-password protection in the project Auth settings.


---

<!-- merged from CHANGELOG-UPDATE-24.md, added 2026-11-04 -->
## Update 24 — Sign-in and homepage repair

- Removed the top release/save banner entirely.
- Removed added homepage import, guest backup/restore, and wiki links.
- Sign-in entry remains available when the authentication library cannot load; the account page explains the failure.
- Guest access is disabled in the public build, including old stored guest markers. Protected pages require sign-in even when the cloud library fails to load.
- Existing error warnings and unload protection remain active.

Validation: core smoke suite and eight release regression tests passed. Recovery tests now check that retry and export appear on failure and disappear after successful retry.

Still required before production reliability is claimed: real signed-in hosted save/reload, second-browser retrieval, interrupted network recovery, campaign access isolation, and visual browser review. These checks are not covered by the Node tests.

Manual checks: open Sign In from the homepage; verify the banner and extra bottom links are gone; open a protected character URL while signed out and verify the account page appears. Complete signed-in save/reload testing separately.


---

<!-- merged from CHANGELOG-UPDATE-23.md, added 2026-11-04 -->
## Update 23 — Release readiness

Released October 23, 2026.

### What changed

- The current Mythras Forge application is now prepared for the production GitHub Pages release.
- Added a visible release and save-status bar, including a retry control for failed cloud saves.
- Local campaign and homebrew save failures now surface to the player instead of failing silently.
- Cloud character saves are serialized per character. Failed saves stay retryable, and signing out preserves unsaved local work when a final save cannot complete.
- Guest character, campaign, and local autosave data now survive account sign-out.
- The GM tracker now distinguishes turns from rounds: turns advance the active combatant, while **New round** restores Action Points and advances round-based effects. Existing injuries and spent Action Points carry into the tracker.
- Combat effects can use turn or round durations.
- Removed the fixed fictional round display from Play Mode so it does not imply live combat state.
- Updated asset cache versions for the release.

### What to test

1. Create a guest character, spend an Action Point or apply damage, then reload the page.
2. Sign in, make a small character edit, and confirm the save status reaches **Saved**. If a save fails, use **Retry save** and confirm the error clears.
3. In the GM tracker, advance a turn and verify Action Points do not reset; choose **New round** and verify that they do.
4. Add one turn-based and one round-based effect, then advance turns and start a new round to confirm each countdown follows its selected unit.

### Release checks

- Core rules smoke suite: 80 checks passed.
- Update 23 persistence and tracker regression suite: 8 checks passed.
- Desktop browser walkthrough: completed the Quick Character flow through Play Mode and verified the playable character sheet.

### Known release boundary

The configured production authentication and database service still needs a signed-in, live-service walkthrough after deployment; guest play and the local persistence path were verified in this release environment.


---

<!-- merged from CHANGELOG-UNIFIED-SITOTA.md, added 2026-11-04 -->
## Unified New Sit’ota application

### What changed

- `index.html` now hosts the existing Forge runtime. Home, Characters, Campaigns, Create Character, Rules, Explore Sit’ota and Account use the same application and navigation header.
- The New Sit’ota home retains its dark typographic design and Explore button. At the Table exposes the existing character/campaign actions, including create/join campaign and the signed-in autosave continuation.
- The existing world-guide content and search are application views at `#/world/<chapter>`, available without signing in.
- `forge.html` is now a compatibility redirect. Query strings and fragments are copied intact before any app/auth script runs; `replace()` avoids an extra Back-history stop.
- Printable sheets retain their header exception. Public-view styles use their own names and variables to avoid changing builder controls.
- No Supabase schemas, storage keys, character formats, calculations, or gameplay handlers changed.

### Rollback

Baseline: `4783ac6ac01d35c4b856707971767770d50f8865` (current main when work began).
Remote branch: `rollback/pre-unified-sitota-2026-10-27`; a local tag of the same name also exists. The original homepage, Forge host and all application files can be recovered from that reference. Rollback after release should be a reviewed revert PR; do not reset shared history.

### Verification

PASS: `node tests/core-batch-1.cjs`, `node tests/rules-smoke.cjs`, `node tests/combat-turn.cjs`, `node tests/effect-selection.cjs`, `node tests/sitota-homepage.cjs`, `node tests/unified-routes.cjs` (8 route/workflow cases), syntax checks on changed JS, and `git diff --check`.

The unified tests exercise public views without altering open character state, private-route gates, history dispatch, signed-in character loading/editing/saving, campaign loaders, invite resumption, cold password recovery and JSON export/import. Supabase calls are stubbed; these tests do not claim a live cloud round trip.

Desktop browser preview (1348px wide): home and guide appearance; guide search; Back/Forward; Rules; signed-out library/Create Character gating; and old `forge.html?compat=a%20b#/world/places` redirect. An isolated, uncommitted local guest test copy additionally exercised builder input, autosave continuation, library, printable-sheet header hiding, campaign creation/rename and party-board navigation. Production guest entry remains disabled. Browser JSON import was interrupted and is not recorded as passed.

Known pre-existing failure, reproduced before edits: `node tests/release-23.cjs` throws `connection lost` in its first campaign-loading case. Its architecture-dependent script list was updated; the unrelated campaign recovery behavior is outside this PR. `tests/desktop-browser.py` was updated for the unified host and the existing repeatable-XP behavior, but was not run; browser QA used the preview directly.

### Manual testing before approval

Use a preview of this branch with a permitted Supabase redirect URL and a test account. Keep a JSON backup of any real character before editing. Do not merge/deploy until approved.

1. Open the root in a signed-out browser. Check Home, Explore Sit’ota, every guide chapter, search, Rules and Account; use Back/Forward between them. Confirm one header, no Open Forge step, and no horizontal overflow at desktop/laptop widths.
2. Click Characters, Campaigns and Create Character while signed out. Confirm Account is shown and no private character name appears on Home. Home’s create/join campaign actions must still give the existing sign-in guidance.
3. Sign in. Load an existing character from Characters, edit it, save, reopen and reload the page. Check both Play and printable Sheet; the shared navigation returns after leaving the sheet. Confirm other characters and the uploaded portrait are intact.
4. Use Create Character, then return Home and Continue as the autosaved character. Check the existing confirmation when starting another character with work open. Browse the guide and return to the same draft.
5. Open Campaigns and a campaign/party board. Create a test campaign, rename it, return through the list, and verify edits persist. Test joining with a code and a copied invite link in a separate signed-out session, including sign-in/confirmation and automatic invite resumption.
6. Export a character JSON, import it through Characters, and confirm it creates a separate character with preserved fields. Reject malformed JSON without changing existing saves.
7. Test old `/forge.html#/character/<id>`, `/play`, `/sheet`, `/campaign/<id>`, `/board` and `#/join/<code>` bookmarks. Confirm arrival in the root app and normal Back/Forward behavior. Add a harmless query parameter and verify it survives the redirect.
8. Request a password-reset email for the test account. Follow both a current root callback and any existing `forge.html` callback; confirm the new-password screen opens. The account owner should enter/submit the new password. Also test email confirmation. Check the configured root URL is allowed in Supabase; this PR does not change project settings.

### Still unfinished

Live signed-in Supabase save/load, multi-account campaign/invite behavior, email-confirmation and real password-reset links require manual verification. Browser JSON import/export needs completion. Existing campaign-loading failure remains. No production deployment is included.


---

<!-- merged from CHANGELOG-THEISM-EXHORTATION.md, added 2026-11-04 -->
## Miracle exhortation

- Set each miracle's level and the number of instances. The app calculates the full Devotional Pool cost and tracks exhortation turns; Exhort is rolled on the last turn.
- Older miracles retain their recorded cost and require a GM-confirmed level before casting. No saved entries are deleted or converted.
- Test: set a miracle to Acolyte and one instance; the first click records a turn and the second rolls, spending 2 pool points on success. Try multiple instances, insufficient points, cancellation, save/reload, and all roll outcomes.
- Still unfinished: cult access, rank-based pool limits, multiple-cult pools, and interruption are GM-managed. Signed-in persistence remains to be tested.


---

<!-- merged from CHANGELOG-STYLE-SLOT-WARNING.md, added 2026-11-04 -->
## Custom career Combat Style warning

Reducing custom-career Combat Style slots now warns before removing a named or linked style, its composition or allocated points. Cancelling preserves the existing slots and data; unused blank slots can still be removed without a prompt.

All ten Node suites pass, including cancellation and confirmation. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-STARTING-MAGIC.md, added 2026-11-04 -->
## Starting magic guidance

- Show the general Core starting allowance for Animism, Mysticism, Sorcery and Theism, plus the book's starting path, school and cult guidance where applicable.
- Test a new magician at 40% and 41%, add named abilities above the allowance, then reopen an experienced character. Confirm the review message does not remove records or block later-acquired abilities.
- Still unfinished: the creator does not enforce starting prerequisites or distinguish starting abilities from those learned later. Confirm choices with the GM.


---

<!-- merged from CHANGELOG-STANDARD-SKILL-BASES.md, added 2026-11-04 -->
## Standard skill creation bases

Checked all 22 standard-skill base formulas against the uploaded Mythras Core Rulebook, p. 11. Added independent formula and calculated-value checks using the book's worked character example, plus a Combat Style base and cultural language bonus check. All ten Node suites pass. Full creation and signed-in live verification remain incomplete; subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-SPECIALITY-POINTS.md, added 2026-11-04 -->
## Speciality allocation preservation

When changing a professional skill speciality to one that already has points in the same creation phase, preserve both allocations instead of overwriting the destination. Duplicate selections are still flagged for correction; combined points may need reallocation to satisfy the normal per-skill limit.

All ten automated Node suites pass, including a collision regression. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-SPECIALITY-CHOICE.md, added 2026-11-04 -->
## Professional skill choices

- Apply one consistent interpretation to custom and published careers: a broadly offered skill may be chosen for distinct specialities, subject to GM agreement. Each choice uses one of the three selections; identical specialities are rejected.
- Explain the Core Literacy language prerequisite and cap in creation. This is manual guidance; the cap is not yet calculated by the app.
- Keep existing selected skills and points when an option is removed so the player can correct the choice.

Source: user-uploaded Mythras Core Rulebook, pp. 28–29 and 44–48. The repeated-choice rule is an interpretation, not explicit book text. Automated cases pass; live verification remains open.


---

<!-- merged from CHANGELOG-SORCERY-CORE.md, added 2026-11-04 -->
## Sorcery Core corrections

- Replace Intensity Shaping with Combine; limit total points by the caster's Shaping skill.
- Apply one harder Invocation grade per extra combined spell. Preserve legacy values for explicit review and recheck casting in progress.
- Test: at Shaping 47%, allocate five points then six; verify the latter cannot cast. Test one and two Combine points, existing saves with Intensity or combined spells, cancellation and resuming casting, and JSON export/import.
- Still manual: confirm spells are different, share targets, and use the lowest relevant Invocation skill when sources differ. Existing casting trackers without a Shaping snapshot must be cancelled and restarted.


---

<!-- merged from CHANGELOG-SOCIAL-CLASS-ROLL.md, added 2026-11-04 -->
## Social class rolling

- Roll social class using the four culture-specific d100 tables in the uploaded Mythras Core Rulebook, p. 24.
- Show and save the result and apply its class money modifier; retain manual selection for GM-agreed choices.
- Warn before replacing an existing class. Background resources remain a GM decision.
- All 400 culture/roll combinations and save/reopen are checked in automated tests.

All ten Node suites pass. Signed-in live testing remains blocked by the currently signed-out browser session. The local desktop browser test could not launch Chromium in this environment. Subsystem 1 is not finished.


---

<!-- merged from CHANGELOG-SKILLS-TASK-AUDIT.md, added 2026-11-04 -->
## Skills and task resolution audit

Subsystem 2 update. Source: uploaded Mythras Core Rulebook, pp. 37–53 and 65–67.

- Skill Advantages preserve the Automatic grade. Very Easy remains the easiest grade that requires a roll.
- Native Tongue and learned Languages display spoken fluency on the Sheet and in Play Mode. Direct skill rolls are blocked for both.
- All 22 Standard and 36 Professional formulas match the Core summary (p. 53). The optional simplified difficulty and contest modifiers are documented for manual GM use (pp. 38, 51).
- Play Mode's Skills section now includes GM guidance for retries, augmentation, caps, group rolls and task rounds. The guidance is a reference for manual adjudication.
- The Play Mode reference includes a calculator for one capped or augmented roll. It uses the unaugmented skill for critical and fumble thresholds, and rounds the augmentation to the nearest whole percent to reproduce the book’s example.
- Existing automated tests cover d100 outcome boundaries, all 16 differential outcomes and selected opposed and over-100 cases.

### What to test

- In Play Mode, choose Automatic with an applicable skill Advantage and no harder condition. The roll button should report that no roll is needed. Under Standard, the same Advantage should make the roll Easy.
- Expand **GM skill and task rulings** under Skills. Compare its guidance to the Core pages above, including the task-round progress for all four outcomes.
- In **GM skill and task rulings**, augment 38% with 33%. A roll of 4 is Critical, 5–45 succeeds normally, and 46 fails. Capping 48% with 23% produces a 23% target.
- In the contested roll calculator, enter 130% vs. 90% and rolls of 10 and 70. Expect adjusted skills of 100% and 60%, a Critical versus Failure and a two-level differential.

### Skill-specific handling

| Core rules | Forge handling |
| --- | --- |
| Native Tongue and Language, pp. 42, 47 | Display fluency. Use the cap calculator for a verbal check limited by fluency. The GM adjudicates related dialects. |
| Literacy, p. 47 | Linked Literacy is capped by its spoken language. Existing unlinked entries are flagged for manual review. |
| Lockpicking and Mechanisms, pp. 47–48 | Use the contest calculator for Lockpicking opposed by the maker’s Mechanisms. If the maker’s value is unknown, the GM sets the difficulty. |
| Conditional skill outcomes, pp. 38–50 | The generic roller gives a tier. The GM applies situational consequences such as follow-up Influence, Insight or Locale grade shifts. Injury, movement, advancement, combat and magic automation are audited in their respective subsystems. |
| Crafting and extended tasks, pp. 65–67 | Play Mode shows the progress changes for each tier. The GM tracks elapsed rounds, decides deadlines and applies quality and enhancements. |

### Remaining verification

Verify these workflows on the signed-in deployed revision. The completed subsystem count remains 1/8.


---

<!-- merged from CHANGELOG-SKILL-RESELECT.md, added 2026-11-04 -->
## Professional skill re-selection

Reselecting the same professional skill no longer clears its speciality or allocated points. This can occur when a career offers the same skill with different suggested specialities. All ten Node test suites pass, including a save/reopen regression. Signed-in live testing remains open.


---

<!-- merged from CHANGELOG-SITOTA-POLISH.md, added 2026-11-04 -->
## New Sit’ota visual correction

### Changed

- Rebuilt the public homepage and player guide as a typographic, art-free site. Removed generated hero/city images, placeholder character cards, decorative symbols, and the ornamental product styling.
- Replaced placeholder cards with direct routes to the real saved-character library, campaign, creation flow, and rules reference.
- Added a shared New Sit’ota header and dark site frame around Forge routes. Dense Forge content remains on readable paper-toned surfaces; authentication logic and the database schema are unchanged.
- Added an optional player-supplied character portrait on the Concept step. JPEG, PNG, and WebP uploads are resized to at most 512 pixels and saved in the character state; the real character library shows the portrait. Existing characters keep their initials until a player uploads one.
- Kept old hash bookmarks and authentication callbacks forwarding to `forge.html`.

### Test

1. On desktop, inspect the homepage and each world guide chapter, including chapter search.
2. Follow Characters, Campaigns, Create a character, Rules, and Open Forge. Verify the shared navigation and the appropriate sign-in gate.
3. Sign in and check a saved character, campaign, builder, play mode, and sign-out. Verify saves and synchronization.
   Upload and remove a portrait, reopen the character on another device, and test JSON export/import.
4. Open an old root hash bookmark and a fresh password-reset callback to check forwarding.

### Unfinished

- The user may supply original art or a logo for the homepage later. The homepage deliberately does not show fictional character data.
- A signed-in Supabase walkthrough and visual desktop browser review are still needed before this is merged.
- The pre-existing `tests/release-23.cjs` campaign-loading failure remains separate.


---

<!-- merged from CHANGELOG-SITOTA-INTERIOR.md, added 2026-11-04 -->
## New Sit’ota — Unified Interior Visual System

### What changed
- Replaced the decorative filled **Explore Sit’ota** hero button and book icon with a restrained, underlined text link.
- Introduced a single scoped interior stylesheet (`sitota-interior.css`) using the established 16:9 homepage's charcoal, ivory, restrained gold and editorial type.
- Applied the design to the Account, My Characters, Campaign list, Campaign detail, Party Board, Rules Wiki, character builder and public world guide. **Play Mode is excluded entirely.**
- Unified site navigation typography and sizing across interior screens. **The homepage header and castle hero keep their approved appearance.**
- Account and character library use dark, high-contrast panels and controls; the library previews actual saved character portraits in larger rectangular frames.
- Campaign and wiki indexes use restrained dark tiles. Long-form rules chapters, campaign details, and dense gameplay forms retain warm-paper surfaces for reading clarity.
- Character builder gets dark step navigation, paper work area, dark characteristics ledger and a matching dark step footer.
- Play Mode receives **no theme changes**; its existing layout, typography, buttons, colours and combat indicators are unchanged.
- Printable character sheet remains intentionally paper-based and the print stylesheet stays print-friendly.
- Added an explicit active-view marker to the existing site header update hook, scoped CSS, and a regression test.
- Bumped the cached `js/sitota.js` URL from `v=3` to `v=5` to prevent the stale-PC-homepage problem.

### Unchanged
No Mythras rules calculations, Supabase schema, authentication flows, saved character formats, campaign data or routing logic were modified. The original Richard Wright homepage art is not reused elsewhere.

### Developer checks
- PASS: new JavaScript source parses.
- PASS: CSS braces and parentheses balanced.
- PASS: every targeted view has explicit styling; home, Play Mode and printable sheet have scoped exclusions.
- PASS: new script version and stylesheet references present.
- Added `tests/sitota-interior.cjs`. Full Node regression suite and browser login walkthrough **not yet run** in this chat.

### Manual review checklist
1. Desktop homepage must remain the 16:9 version with correctly positioned painting and real characters.
2. Account signed-out, sign-up, login, password-reset, logged-in profile and guest states: check contrast and working controls.
3. Character library: images, names, Play/Edit/Print/Delete actions, import JSON, empty/error/loading states.
4. Campaign list, campaign detail, membership, invites, and Party Board tabs including GM controls and combat trackers.
5. Rules Wiki chapter grid, search results, and article reading.
6. Builder rail, form fields, allocation tables, portrait input, ledger, validation and fixed navigation footer.
7. Confirm Play Mode is visually unchanged: combat buttons, wounds, Magic Points, XP, inventory, status indicators, read-only teammate view.
8. World Guide chapter index/search/readability; screen widths 1440, 1024, 768, 375; keyboard navigation.
9. Print a sheet and check white paper, text contrast, and no dark nav.
10. Signed-in save/reload across devices and legacy links remain correct.

### Release scope
Review-only UI PR. **Do not merge until visually reviewed and functional smoke checks are satisfactory.**

### User-requested release exceptions
- No Play Mode CSS rules are included; shared header/body styling explicitly excludes Play Mode.
- Existing print styles remain untouched.
- Homepage CSS now uses `v=3`, and the renderer uses `v=5`, to invalidate desktop caches.


---

<!-- merged from CHANGELOG-SITOTA-HOMEPAGE.md, added 2026-11-04 -->
## New Sit’ota homepage — review branch

### Changed

- The root page welcomes players to New Sit’ota and opens a public, player-facing world guide.
- The existing Forge application is preserved at `forge.html`, with links from the new homepage to character, campaign, and rules screens.
- Old hash routes and authentication query callbacks forward to the matching Forge route.

### Test before merging

1. Open the new homepage and Explore Sit’ota while signed out.
2. Follow My characters, Our campaign, Rules, and Create a character; confirm normal sign-in and existing saved data.
3. Follow an old `/#/character/<id>` bookmark and a campaign invitation; verify they reach `forge.html` with the same route.
4. Request a fresh password reset and confirm the callback opens the new-password form inside Forge.

### Still unfinished

- The public world guide contains starter material and empty chapters for future player-safe entries.
- The full signed-in browser and authentication callback walkthrough requires a deployed preview or review branch.
- The pre-existing `tests/release-23.cjs` campaign-loading failure remains unresolved.


---

<!-- merged from CHANGELOG-SITOTA-16X9.md, added 2026-11-04 -->
## New Sit’ota — 16:9 homepage redesign (review)

### What changed
- Matched the approved widescreen composition: slim site header, panoramic castle hero, one-row character gallery, and three-column campaign/rules/world navigation.
- Used the original Richard Wright painting provided by the site owner, cropping only the surrounding white bars; stored optimized AVIF and WebP files locally with discreet artist/copyright credit. No generative reconstruction of the painting.
- Retained the real, account-backed character gallery and each character's saved portrait. The illustrative names and character portraits from the reference screenshot are NOT shipped.
- Preserved Create Character, Join/Create Campaign, Rules Wiki, World Guide, Continue Character, account, existing deep links, and the legacy forge.html redirect.
- Scoped new CSS to the homepage; no Supabase schema, game rules, character save, or server changes.

### What to test before merge
1. Desktop approximately 1648×928: compare top-level layout to the approved 16:9 screenshot. Ensure the castle remains visible, hero text is legible, and the portrait strip and tools fit naturally.
2. Signed in: four actual saved-character cards display their image, name, metadata, and open the correct Play view; fewer/more characters and missing portraits display gracefully.
3. Signed out: no fictional sample character data is shown and sign-in is available.
4. Verify Explore Sit’ota, character library, new character, campaigns and join flow, wiki, Account and browser back/forward navigation.
5. On phones/tablets, verify no horizontal overflow and readable hero/buttons.
6. Verify stale forge.html bookmarks and Supabase reset/auth callbacks still function.
7. Run node tests/sitota-homepage.cjs and broader app tests. The full suite has NOT been run in this chat.

### Publication note
This is a review PR, not a live deployment. The repository and GitHub Pages site are public. The user reports permission to use the painting on a personal/private site; confirm authorization extends to publicly accessible hosting before merging.


---

<!-- merged from CHANGELOG-SHARED-SKILL-POINTS.md, added 2026-11-04 -->
## Shared professional skill points

- Removing one duplicate professional skill choice retains its points if another choice still uses the same skill and speciality.
- Changing one duplicate's speciality leaves shared points on the skill still selected; allocate points to the new speciality separately.
- Removing the last choice returns its points to the pool as before.

All ten Node suites pass, including save/reopen and Full, career and Quick creation cases. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-SHARED-COMBAT-STYLE.md, added 2026-11-04 -->
## Shared Combat Style points

Changing one career Combat Style slot no longer clears cultural-style career points while another slot still links to that style. The allocation returns to the pool when its last career link is removed. Reselecting the same source also leaves points intact.

All ten Node suites pass, including a save/reopen regression. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-RULES-BASELINE.md, added 2026-11-04 -->
## Rules baseline

- Reconcile the master checklist with releases through PR #45; mark partial work and outstanding verification clearly.
- Restore a visible retry message when campaigns cannot be loaded, so a connection error is not mistaken for an empty account.
- Update stale homepage and combat-navigation regression expectations to match the current interface.
- Test: sign in, open Campaigns, simulate a failed connection and retry when connectivity returns. Confirm existing campaigns appear. Signed-in production testing remains outstanding.


---

<!-- merged from CHANGELOG-ROLLED-ORDER.md, added 2026-11-04 -->
## Rolled-order characteristics

Added an explicit option to assign human characteristic rolls in the order specified by the uploaded Mythras Core Rulebook, p. 8. The 3d6 and 2d6+6 groups remain separate; the existing highest-first shortcut remains available.

All ten Node suites pass, including assignment and save/reopen. Signed-in live verification remains open. Subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-PROFESSIONAL-SPECIALITIES.md, added 2026-11-04 -->
## Professional skill specialities

Source: user-uploaded Mythras Core Rulebook, pp. 28–29 and 44–48.

- Add required specialities for Literacy, Musicianship, Mysticism and Navigation in character creation and hobby choices.
- When naming a previously unspecialised legacy skill, retain its bonus points if the old instance is no longer shared.
- Document what the book confirms about separate specialities and the remaining uncertainty about choosing one `(any)` offer multiple times.

Automated tests cover prompts and legacy-point migration. Literacy's language requirements and a signed-in live test remain open.


---

<!-- merged from CHANGELOG-PROFESSIONAL-CHOICE-POINTS.md, added 2026-11-04 -->
## Professional skill choice points

Adding another unspecialised professional-skill choice no longer resets points already allocated to the same skill. This protects points while specialities are being entered in Full and Quick creation. All ten Node suites pass; signed-in live verification remains open.


---

<!-- merged from CHANGELOG-PORTRAIT-SAVE.md, added 2026-11-04 -->
## Portrait persistence

Portrait uploads and removals now start saving immediately. Opening a saved character waits for pending cloud saves before reading it back, preventing quick navigation from replacing a new portrait with an older copy.

Test: upload a portrait, immediately return Home, then reopen Edit. Confirm the portrait appears in both places and remains after reloading. Remove it and repeat. Check JSON export includes the portrait.

Automated regression covers upload, pending-save reopen, normalization, Home rendering, and removal with stubbed cloud storage. Real account and iOS photo-picker checks remain manual.


---

<!-- merged from CHANGELOG-PASSION-ADVANCEMENT.md, added 2026-11-04 -->
## Passion advancement

- Spend banked Experience Rolls on recorded Passions using the Core p.72 skill-improvement procedure. Gains persist with the Passion and appear wherever its value is displayed.
- Test: open a character with a Passion, award two rolls, improve the Passion twice, and confirm the second roll uses the updated percentage. Save, reload, and export/reimport the character to check the value persists. Confirm a character with no rolls cannot spend one.
- Record a GM-directed Passion increase or decrease from events in play without spending an Experience Roll (Core p.82). Test a positive and negative adjustment, save and reopen; the other Passions and banked rolls should be unchanged.
- Still manual: the GM determines event-driven adjustments. Automatic fumble tracking and Experience Roll-based reductions are not implemented. Test signed-in save/reload with a real account before relying on this in play.


---

<!-- merged from CHANGELOG-NATURAL-RECOVERY.md, added 2026-11-04 -->
## Natural recovery and fatigue

- Apply one natural healing interval to a wounded location. The next interval reflects the updated severity; Major Wounds require confirmation of successful treatment. A GM-confirmed strenuous-activity reduction can be entered.
- Choose Fatigue guidance for physical exertion, blood loss or asphyxiation. Fatigue remains manually controlled.
- Test a Serious Wound at 0 HP: apply one week, then check that positive HP uses a day for the next interval. Check that a Major Wound cannot heal without treatment confirmation. Save and reopen.
- Still manual: elapsed time, treatment verification, permanent injuries, Pulp/Paragon healing adjustments and whether a fatigue cause has ended. Signed-in production persistence remains untested.


---

<!-- merged from CHANGELOG-MYSTICISM-PREPARATION.md, added 2026-11-04 -->
## Mysticism preparation

- Talent preparation now records one turn per Intensity and rolls on the final turn. The app rechecks existing individual and combined limits before each turn, preserves pending preparation across save/reload, and offers a cancel button.
- Test an Intensity 3 Talent: the first two clicks should not roll or spend points; save and reopen, then make the final click. Try an excessive Intensity, edit a Talent while preparing and cancel. Verify a failed roll does not mark the Talent active.
- Still manual: GM checks Talent category and point cost, interruptions and action points; activation and duration markers are player-controlled. Intensity rounding outside the book's 34% example remains under review. Test with a real signed-in account before relying on persistence.


---

<!-- merged from CHANGELOG-MOVEMENT-ENCUMBRANCE.md, added 2026-11-04 -->
## Movement and encumbrance audit

- Worn armour now reduces running and sprinting speed by its armour penalty, after calculating gait speed. Walking is unaffected (Core p.70).
- Incapacitated or otherwise immobile characters can no longer run or sprint due to an Athletics bonus (Core p.79).
- Twenty zero-ENC items count as one ENC, including quantities across inventory and weapons. The gear screen shows the count (Core p.77).
- Test an unarmoured character's run and sprint, equip armour, and check both decrease by the armour penalty while walking stays unchanged. Set Fatigue to Incapacitated and check running and sprinting are unavailable. Add 19 then 20 named zero-ENC items and check total gear ENC increases by one.
- Mixed fatigue/encumbrance interactions beyond these cases and signed-in persistence remain subject to further verification.


---

<!-- merged from CHANGELOG-MAGIC-ELIGIBILITY.md, added 2026-11-04 -->
## Magic eligibility

- Bound-spirit commands now require a recorded spirit POW within the Binding skill's limit. Existing spirit records are preserved; missing POW prompts review.
- The Theism editor now shows the Core rank and multiple-cult pool limits, with an explicit note that they are not yet enforced.

Test: with Binding 45%, command a bound POW 15 spirit and verify the roll occurs; try POW 16 and a missing POW and verify neither rolls nor spends Magic Points. Reopen an older spirit record and confirm its information remains. Review Theism's pool guidance against the character's cult rank.

Still unfinished: Theism rank-based and multiple-cult pool enforcement, starting access for other traditions, Mysticism preparation, and real-account browser testing.


---

<!-- merged from CHANGELOG-LITERACY-MODE-SWITCH.md, added 2026-11-04 -->
## Literacy links when switching creation modes

Switching between Full and Quick creation now clears links for reset Literacy or Language skills, while retaining valid links for learned skills that remain on the character. This prevents a newly selected skill from inheriting an unrelated old link. The underlying Literacy and spoken-language rule is in the user-uploaded Mythras Core Rulebook, p. 47.

Automated regression and all ten Node suites pass. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-LITERACY-LANGUAGE.md, added 2026-11-04 -->
## Literacy and language

- Link a Literacy skill to its associated Native Tongue or acquired Language in character creation.
- Apply the spoken skill as a cap to the effective Literacy percentage, while preserving stored points. If the spoken skill improves, the effective Literacy value can rise up to its stored value.
- Prevent experience or training improvements from increasing linked Literacy beyond the current spoken-language limit; do not spend an Experience Roll when already at the limit.
- Keep existing unlinked characters unchanged and show a warning that the cap is not automatic until the player chooses the correct language. If a linked language is removed, the warning returns.

Source: uploaded Mythras Core Rulebook, printed p. 47. Factotum was identified as a useful workflow reference; its generator describes itself as using Mythras Imperative, so this change follows Core. All automated Node suites pass. Live verification and the GM's choice of the correct language remain necessary.


---

<!-- merged from CHANGELOG-INDIVIDUAL-ARMOUR.md, added 2026-11-04 -->
## Independent armour locations

- Choose armour independently for both arms and both legs, with shortcuts to set matching limbs. Location damage, character sheets, costs, ENC and Initiative use the selected side.
- Existing shared limb armour is carried over to both sides without removing the original fields.
- Test an older character with arm armour, save and reopen, then remove armour from only one arm. Apply the same damage to each and check the AP and HP changes; export and reimport the character.
- Real-account cloud migration and live persistence still require testing. Parry reductions remain a manual input before armour.


---

<!-- merged from CHANGELOG-IMPORT-MAGIC.md, added 2026-11-04 -->
## Character import and Core magic

- Import a character backup directly into My Characters as a new independent copy, preserving the open character and showing errors on failure.
- Replace the unsupported starting Folk Magic dice allowance with Core's skill-based guidance and allow GM-approved names to be recorded when the catalogue is empty.
- Correct Mysticism's individual Intensity at 34% to 2. The draft rounds other fractions up as a tentative interpretation; the GM should confirm boundaries. Specialist Folk Magic rounding and starting allowances remain GM-managed.

Test: sign in, import a backup from Account, verify it appears in My Characters, reopen it and reload; check portrait and that the original remains separate. Try invalid JSON and a failed network save. For a Folk Magic character verify default starting guidance and add a name; for Mysticism 34% verify maximum Intensity 2. Cloud behavior is stubbed in automated tests; real account and browser testing remain outstanding. Mysticism preparation and activation prerequisites are not addressed here.


---

<!-- merged from CHANGELOG-HOME-CHARACTERS.md, added 2026-11-04 -->
## Homepage character cards

Restores a Your Characters section between the welcome and At the Table sections, with up to four recently saved characters, View All, and a Create a New Character card. Cards open the existing Play view and show saved culture/career details and player-uploaded portraits; characters without portraits use initials. Signed-out visitors see a sign-in prompt. Removes Create Character from the shared top navigation; the creation card and existing page action retain the normal draft confirmation.

No generated art, sample characters, rules, save formats, or database changes.

### Manual testing

1. Signed out: open Home. Check the sign-in prompt and create card; neither reveals saved character information. Confirm the top navigation has no Create Character item.
2. Sign in and return Home. Confirm up to four of your most recently saved characters appear, with their uploaded portraits or initials. Open a card, edit/save, then return Home and confirm the updated name/portrait appears. View All should open the complete library.
3. Create a New Character should use the usual draft confirmation. Confirm creation is still available in At the Table.
4. Check an empty account, failed character loading (Retry), and signing out/switching accounts. No previous account's cards should be displayed.
5. Check desktop and narrow layout, keyboard focus, guide navigation, browser history, and the existing character library.

Live account testing remains manual. Changes are prepared for review before merge/deployment.

### Verification

- Homepage checks and all ten unified route/workflow cases pass, including portrait filtering, four-character ordering, escaped names, and an account-switch race. Supabase calls are stubbed in automated tests.
- Browser preview checked signed-out gating, local empty state, a newly saved local character appearing on Home, and the create card opening the existing builder. No production character data was modified.
- JavaScript syntax and whitespace checks pass.


---

<!-- merged from CHANGELOG-EXPERIENCE-ACCESS.md, added 2026-11-04 -->
## Experience access fix

- View-only sheets now reject changes to experience flags and the free fumble improvement.
- Owners can still apply an earned fumble improvement as before.
- Test: open a shared sheet in view-only mode and confirm experience controls cannot change it. On an editable sheet, flag a fumbled skill and apply its free improvement.
- Automated coverage checks that view-only calls leave the experience state unchanged. Signed-in sharing and persistence still need a live test.


---

<!-- merged from CHANGELOG-EQUIPMENT-ECONOMY-AUDIT.md, added 2026-11-04 -->
## Equipment and Economy audit

Source: uploaded Mythras Core Rulebook, pp. 23–24, 34, 54, 58, 62–67 and 77.

- Starting funds preserve fractional silver when applying the culture and social class multipliers.
- Background wealth adjustments are tracked separately from purchases. Older saves with a negative spending balance from an applied wealth event retain the same credit after migration.
- All eight armour construction tiers were checked for AP, per-location price, worn ENC and initiative penalty. Forge follows the per-location initiative formula where the printed Mail suit ENC disagrees with the seven individual pieces.
- Social class roll ranges and money multipliers were checked against the four Core tables. Class-based possessions and other resources are adjudicated by the GM.

- Compared all 64 personal weapon and shield entries with the Core tables. Corrected the thrown dagger to zero ENC and the Atlatl range bonus notation.
- GM-approved armour material overrides apply by location to worn ENC and initiative. Armour Points and base prices still come from the construction.

### What to test

- A Civilised Outcast with a 4d6 sum of 5 starts with 93.75 sp of purchasing value.
- Opening an older save with a net background wealth credit retains its purchasing power and clears the invalid negative spending entry.
- Full Plated Mail costs 9,800 sp, contributes 21 worn ENC, and applies a 9-point initiative penalty.

The initial equipment release passed signed-in checks for weapon values, fractional funds and worn armour.

The follow-up adds a collapsible reference on **Money & Gear** for all six siege weapons, all eight vehicles, ammunition bundles and manufacture or repair. Siege gear and cargo stay out of personal ENC. The GM tracks their use, task progress, quality and upkeep. Open the panel and check that a Ballista lists 5 Combat Rounds and a crew of 2–4, and that the freight wagon lists 10 occupants and 200 cargo ENC.

Follow-up live verification and broader inventory and encumbrance cases remain open.

#### Inventory and encumbrance follow-up

- Money & Gear and Play Mode can exclude worn everyday clothing from ENC without losing its purchase price or packed ENC. Spare clothing and carried armour use their full ENC.
- Verified the 20-item zero-ENC grouping across inventory and weapons, and the exact STR ×2, ×3 and ×4 boundaries.
- Core p.77 non-human scaling and optional item-count encumbrance are GM procedures. Preset weapon and armour ENC uses the book’s human-scale values.

To test, add a coat with 1 ENC and a cost of 4 sp, then toggle worn clothing. The gear load drops by 1 and the cost stays 4 sp. Check the panel in Money & Gear and confirm Play Mode shows the same load.

#### Ordinary gear catalogue

- Money & Gear has 64 fixed-price Core tools from pp.60–61. Selecting a tool adds an editable inventory row with ENC and price. Copper prices convert at 10 cp per sp (Core p.54).
- Lockboxes, material variants and other variable purchases use manual inventory or spending entries. Accommodation, food, clothing and livestock remain GM-priced using the Core tables.
- Test adding three bundles of nails or tacks. They total 0.60 sp. Add 10 m of hemp rope and confirm the ledger shows 10.60 sp and the rope contributes 2 ENC.


---

<!-- merged from CHANGELOG-DIFFICULTY-GRADES.md, added 2026-11-04 -->
## Difficulty grades

- Apply the hardest of task difficulty, encumbrance and fatigue, interpreting Burdened as Hard and Overloaded as Formidable for STR/DEX skills (Core pp.38, 77, 79).
- Test: a Hard Athletics roll while Burdened remains Hard; Overloaded makes it Formidable. A non-STR/DEX skill is unaffected by encumbrance. Wearied fatigue applies Formidable.
- This interpretation reconciles Core's hardest-grade rule with its relative encumbrance wording; the book does not provide this exact worked example. Signed-in browser testing remains outstanding.


---

<!-- merged from CHANGELOG-DIFFERENTIAL-TABLE.md, added 2026-11-04 -->
## Differential roll audit

Compared the 16 outcomes in the differential-roll table with the user-uploaded Mythras Core Rulebook, printed p. 51. Added an independent regression case for every outcome through the contested-roll calculator. All match the book; no behavior change was needed. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-DICE-ASSIGNMENT.md, added 2026-11-04 -->
## Characteristic roll assignment

Reject reused or invalid dice-pool indices in the assignment handler, preserving existing values when a selection is rejected. This complements the existing dropdown restriction and supports the separate dice groups in the uploaded Mythras Core Rulebook, p. 8.

All ten automated Node suites pass. Imported legacy states and signed-in live workflows require further review; subsystem 1 remains in progress.


---

<!-- merged from CHANGELOG-DEVOTIONAL-POOL.md, added 2026-11-04 -->
## Devotional Pool rank checks

- Confirm the rank associated with the tracked Devotional Pool. For a whole-number rank limit, the builder prevents increasing above that limit. An existing oversized pool is preserved and flagged for review before casting.
- Test POW 12 / Initiate: a new pool of 3 is accepted, 4 is rejected. Open an older pool above 3 and confirm its value is retained and flagged; correct it and save/reopen. Test an unconfirmed rank and a fractional result with your GM.
- Still unfinished: separate multiple-cult pools, combined pool totals, fractional rounding, and signed-in production verification.


---

<!-- merged from CHANGELOG-CUSTOM-CAREER.md, added 2026-11-04 -->
## Custom career setup

- Preserve allocations for still-offered skills when editing an existing custom career.
- Keep the custom-career editor open after entering a name and add an explicit continue action.
- Enforce the Core limit of seven standard skills including Combat Styles, while retaining existing selections for correction.
- Explain GM agreement and the current limitation that the builder does not save a separate list of up to seven professional skill options.
- Add regression coverage for the limit, editing and saved over-limit state. Live verification remains outstanding.

Source: user-uploaded Mythras Core Rulebook, printed p. 33. See `docs/core-career-cases.md` for scope and remaining gaps.


---

<!-- merged from CHANGELOG-CUSTOM-CAREER-RESELECT.md, added 2026-11-04 -->
## Custom career re-selection

Clicking Custom Career while already editing it no longer resets professional choices, combat style details or allocated career points. All ten Node test suites pass, including a save/reopen regression. Signed-in live testing remains open.


---

<!-- merged from CHANGELOG-CULTURE-CHANGE-WARNING.md, added 2026-11-04 -->
## Culture change warning

Changing cultures now asks before resetting player-selected cultural skills or modified cultural allocations, and explains that bonus points on removed professional skills may return to the pool. Untouched automatic starting allocations do not trigger the warning. Cancelling preserves the existing choices and points.

All ten automated Node suites pass. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CULTURE-CASES.md, added 2026-11-04 -->
## Culture skill audit

- Compared all four Core culture skill offers and standard-skill choice sets against the uploaded Core Rulebook, pp. 13–16; added checks for the listed offers.
- Invalid, repeated or unexpected cultural standard-skill choices in inconsistent saved data now block completion with a message. Existing data is retained for correction.
- All nine local JavaScript suites pass. Test on the live site after deployment: make each culture's allowed selections, change a selection after allocating points, and reopen a saved character. Confirm the optional Sit'ota Combat Style allocation still behaves as expected.


---

<!-- merged from CHANGELOG-CULTURE-CAREER-MATRIX.md, added 2026-11-04 -->
## Culture and career combinations

Added an automated integration check across all 96 combinations of the four Core cultures and 24 published careers. Each combination retains its eligible standard skills and the expected number of career Combat Style slots. This complements source-based list checks; it does not verify every allocation, speciality or live workflow.

All ten Node suites pass. Subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-CULTURAL-STYLE-WARNING.md, added 2026-11-04 -->
## Cultural Combat Style warning

Turning off a cultural Combat Style now warns before returning its allocated points to their pools and unlinking career styles. Cancelling preserves the style, links and allocations. Untouched blank styles can still be turned off without a prompt.

All ten Node suites pass, including cancellation and confirmation. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CULTURAL-PASSIONS.md, added 2026-11-04 -->
## Cultural Passion suggestions

Correct suggested cultural Loyalty target types: Loyalty to a chief uses the person formula, while Loyalty to a town uses the place formula. Players still choose appropriate target types for the broad Love and Hate suggestions.

Source: user-uploaded Mythras Core Rulebook pp. 14–16 and 23. All ten Node suites pass. The signed-in social-class test also passed one Civilised roll (90 → Gentry ×3 → 3,600 sp) and save/reopen on the deployed revision. This is not a complete character-creation verification; subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-CREATION-COMPLETION.md, added 2026-11-04 -->
## Character creation consolidation

- Final review distinguishes corrections, recorded GM overrides and manual details; the Finish action rechecks earlier edits. Full/Quick switches cannot transfer a reset skill-step override to another step.
- Core Background Events are explicitly optional; skipping retains notes and results. Official event summaries now reach the sheet and Markdown export.
- Saved dice assignments must match their pools; fractional manual values remain visible for correction.
- Repeated career subjects display together, with distinct specialities still chosen individually.
- Legacy unknown culture/career names remain recoverable without deleting their points on load.
- Corrected source notes for human measurements, Combat Style bases and fixed AP.
- Added 1,440 complete allocation/save-round-trip cases, all16 cultural travel choices, all216 ordinary 3d6 combinations and all24 career speciality/style contexts.

Testing: run all twelve `tests/*.cjs` suites. Live tests: fresh rolled creation; four cultures; custom offers/styles; Literacy cap; optional event skip and sheet output; correction/GM review; save and reload. See `docs/character-creation-completion.md` for exact evidence and boundaries. Final deployed checks passed on November3,2026; subsystem count is1/8 for Core human creation and background. See the final deployed verification record for limits.


---

<!-- merged from CHANGELOG-CREATION-COMMUNITY.md, added 2026-11-04 -->
## Character creation: community and Passions

- Check all Passion starting formulas against the uploaded Core p. 23 table. Person-based Passions now stay unresolved when required subject characteristics are missing, rather than displaying a fabricated score.
- Check the four starting-money multipliers and all social-class money modifiers against Core pp. 21 and 24.
- Explain optional Group Luck and its manual tracking on the community page; correct the family-table page reference.
- Document unimplemented social-class and family rolls, shared Group Luck tracking and remaining live checks.

All ten Node suites pass. Subsystem progress remains 0/8; character creation is in progress. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CREATION-BATCH.md, added 2026-11-04 -->
## Character creation audit batch

- Established a stable eight-subsystem verification plan; none are yet complete.
- Checked every printed human hit-location table band and one extension against the uploaded Mythras Core Rulebook, p. 10, and added automated boundary cases.
- Reject fractional characteristic values during validation while preserving existing saved values for correction (Core p. 8).
- Documented remaining character-creation and live verification gaps.

All ten Node suites pass. Signed-in live testing remains open.


---

<!-- merged from CHANGELOG-CORE-RULE-SCOPE.md, added 2026-11-04 -->
## Core rules scope

- Added a working Core audit register, grouped by character creation, skills, equipment, game systems, combat, magic, organisations, creatures and GM procedures.
- Separated intended automation, GM-assisted decisions, reference material and unresolved scope decisions from the actual verification status.
- Recorded the first signed-in character and campaign checks and the campaign reload issue without counting them as book-wide verification.
- No website behavior changed. Review `docs/core-rule-scope.md`; subsequent audits should split its groups into individually testable cases and add evidence as work is completed.


---

<!-- merged from CHANGELOG-CORE-HEIGHT-WEIGHT.md, added 2026-11-04 -->
## Core height and weight

- Human height and weight defaults now use the Core p. 9 table, with the midpoint offered as a starting value and the actual ranges shown in the character builder. Lithe, Medium, and Heavy frames use the correct weight columns.
- Manually entered measurements remain unchanged. Nonhuman figures remain labelled estimates pending a species-specific review.
- Added boundary checks for height and weight, and additional Core attribute and skill-roll boundary checks.
- To test: create a human with SIZ 13, change frames, and enter custom measurements. Save and reopen the character; confirm the chosen values persist. Live signed-in persistence still requires testing.


---

<!-- merged from CHANGELOG-CORE-BATCH-1.md, added 2026-11-04 -->
## Core Batch 1 — awaiting review

### Changed
- MCR-05: CHA Experience Modifier is off by default and applied only when selected for a GM-approved positive award. Existing banked rolls are preserved.
- MCR-06: repeated improvement of a skill can spend additional banked rolls, each against its updated percentage. Legacy usedThisRun data is retained but ignored.
- MCR-09: Serious Wound interruption now says 1d3 turns; Major Wound treatment deadlines are unchanged.
- MCR-10 (minimum): the rest estimate is labelled physical exertion only; blood loss and asphyxiation exceptions are shown. Recovery remains manual.
- MCR-17 (minimum): damage input explicitly requires damage after parry and other reductions, before armour. AP is still subtracted automatically.
- MCR-27/28: removed incorrect Combat Style base warning and corrected the Background Events source comment.
- Skill changes return unavailable allocations to their original pools. Legacy hidden allocations have a visible Return points to pool control. No save-load cleanup silently deletes allocations.
- Updated the homepage regression to accept the existing CSS cache version.

### Sources checked
Uploaded `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`, printed pp.12,18,71,72,79,110. Parsed text was searched first, then rendered pages were checked because the text encoding was garbled. The reports are the development handoff, not rules authority.

### Automated verification
PASS: core-batch-1.cjs, rules-smoke.cjs, combat-turn.cjs, effect-selection.cjs, sitota-homepage.cjs; JavaScript syntax and git diff --check.
FAIL: existing release-23.cjs campaign-loading test throws connection lost. This predates the batch; cloud/auth code is unchanged.

### What to test
1. Award 3 rolls with CHA 13 or 6: checkbox off gives 3, on gives 4 or 2. Reopening the modal leaves it off.
2. Spend two rolls on the same skill and verify the second target includes the first gain. Export/import and reopen the character.
3. Allocate points to a Professional Skill, change it, then redistribute the freed points. Repeat for a speciality, hobby, Quick Skills, and custom career choices. Confirm skills still known through another source retain their bonus points.
4. Open an older save with hidden allocations and use Return points to pool without reselecting its old skill.
5. Check wound wording, Fatigue guidance, damage labels, and the STR+DEX Combat Style percentage.

### Unfinished
Signed-in browser, cloud roundtrip and desktop walkthrough remain to be checked. No database/auth changes. Sorcery and later checklist batches remain pending. No merge or deployment authorized by this changelog.


---

<!-- merged from CHANGELOG-COMBAT-AUDIT-FIXES.md, added 2026-11-04 -->
## Combat audit fixes

- Wound damage, direct HP entry, and quick damage preserve negative HP below the Major Wound threshold (Mythras Core p.110).
- Pin Down can be stacked and Entangle cannot, following the Special Effects Summary (Core p.100).
- Test a 5-HP location with 20 damage after armour: it should show −15. Save and reopen, then check recovery starts at −15. In Special Effects, check that Pin Down can be selected twice when two effects are won and Entangle cannot.
- Signed-in browser persistence remains unverified. Earlier damage already lost to the old cap cannot be reconstructed automatically.


---

<!-- merged from CHANGELOG-COLD-LINKS.md, added 2026-11-04 -->
## Campaign and character links

- Keep the requested page when the app restores a signed-in session, instead of allowing an early menu render to replace the link.
- Check: sign in, open a campaign or saved character, and refresh. The same page should reopen. Also check a signed-out private link and a campaign invitation.
- Automated route tests simulate the authentication race; production browser confirmation remains necessary.


---

<!-- merged from CHANGELOG-CHARACTERISTIC-CASES.md, added 2026-11-04 -->
## Characteristic verification cases

- Checked the human characteristic generation and attribute sections against Core pp. 8–10 and recorded individual cases with their limits.
- Corrected dice and points-build guidance that previously presented a paraphrase as a quotation. Character generation behavior is unchanged.
- Added table boundary checks for damage modifiers and all human height/weight rows and frames. Existing custom measurement overrides remain supported.
- Test: open Characteristics in the builder, check the dice and 80-point guidance, then create a human and verify the Height & Weight card. Live save/reopen of manual measurements remains to be verified.


---

<!-- merged from CHANGELOG-CHARACTERISTIC-ADVANCEMENT.md, added 2026-11-04 -->
## Characteristic advancement

- Improve a characteristic through ongoing training or the GM-approved optional permanent rule (Mythras Core, pp. 72–73). Mundane SIZ increases are excluded.
- Training uses a banked Experience Roll to start each step, then reduces each future award by one roll per maintained step. Stopped steps atrophy on later awards. The current score cannot exceed the species maximum.
- Permanent improvement uses the optional one-time price. Creation scores remain separate; skills and derived values use the current score, including on the party board. Existing character files do not acquire bonuses on load.
- Test in Play Mode → Improve Skills: award rolls, open Improve characteristics, confirm GM approval, train STR and check the skill and derived changes. Award rolls once and check maintenance; stop training, award again and check atrophy. Save/reopen and check the same values. Try the permanent option with enough rolls and check that creation scores and point-build totals remain unchanged.
- Rounding of the training step follows the examples on Core p. 72. Award each allotment once: each positive award triggers maintenance and atrophy. Live signed-in saves and sharing remain to be checked.


---

<!-- merged from CHANGELOG-CHARACTER-BACKUPS.md, added 2026-11-04 -->
## Character backups

Character import is now in a collapsed Advanced / Backup section of My Characters. Each saved character has a collapsed Backup control for downloading a portable copy. Guest library backup controls are available in guest mode.

Test: sign in, open My Characters, expand Advanced / Backup and import a character; confirm it creates a separate copy. Expand Backup on a character card, download its backup, then reimport it and check the character and portrait. Confirm guest library backup controls only appear in guest mode.

Cloud and browser saves still use the existing formats. Test with a real account and browser before release.


---

<!-- merged from CHANGELOG-CAREER-SUBSYSTEM.md, added 2026-11-04 -->
## Career subsystem audit

Source: user-uploaded Mythras Core Rulebook, printed pp. 28–34, checked using rendered pages.

- Record up to seven professional skill options for custom careers; select up to three of those for the character afterwards.
- Support up to seven custom-career Combat Style slots within the seven-standard-skill limit.
- Preserve legacy custom-career choices and allocations; when an older career is edited, seed its option list from the professional skills already selected.
- Make the bonus hobby skill optional, as described on Core p. 34.
- Record remaining speciality, exact-age/category, entry-by-entry and live-verification gaps in `docs/core-career-cases.md`.

All automated Node suites pass; these changes still require a deployed signed-in test.


---

<!-- merged from CHANGELOG-CAREER-ENTRY-CHECKS.md, added 2026-11-04 -->
## Career entry checks

Compared the 24 careers in `js/data.js` with the rendered pages of the user-uploaded Mythras Core Rulebook, printed pp. 29–33. Added independently transcribed regression cases for each career's standard skill names, professional skill names including repetitions, and Combat Style count. One source spelling, “Navigate”, is normalized to Navigation.

All 24 entry checks pass. This is not a complete speciality, style-label, character-creation or live-site verification. The open interpretation of repeated specialised offers and the inconsistent current handling for published and custom careers are recorded in `docs/core-career-cases.md`.


---

<!-- merged from CHANGELOG-CAREER-CHANGE-WARNING.md, added 2026-11-04 -->
## Career change warning

Changing careers now asks before resetting existing career skill choices, named Combat Styles or allocated career points. Cancelling retains them; confirming performs the existing reset. All ten automated Node suites pass. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CAMPAIGN-RULES.md, added 2026-11-04 -->
## Campaign setup and rules

- Create Campaign opens a setup page for a name, characteristic-improvement method, and optional book selections. Permanent improvement is preselected and the GM can change it.
- Campaign GMs can edit the rules and books afterward from Campaign rules & books. Linked characters use the GM's improvement setting. Existing campaigns without settings retain both existing choices until their GM configures them; standalone characters keep both choices.
- Book selections are recorded only. They do not yet implement or enable supplement mechanics. Existing ongoing training and saved character values are preserved when a campaign changes methods.
- Test: create a campaign, choose permanent improvement and a book, save, reopen the campaign and check its settings. Link a test character, open Play Mode → Improve Skills, and verify only permanent improvement can be added. Change the GM setting to training, reopen the character's improvement panel and verify training is offered instead. Check an existing campaign still opens and can be configured.
- The campaign settings column is separate from the combat tracker and is protected by the existing GM-only campaign update policy. Automated tests cover local saves, permissions guards, stale settings and failures. Signed-in GM/player browser verification remains outstanding.


---

<!-- merged from CHANGELOG-BUILDER-BUTTONS.md, added 2026-11-04 -->
## New Sit’ota — Character Builder Button Refinement

### Changes
- Removed the heavy, gold-filled fantasy-CTA treatment from Character Creation controls.
- Creation method and archetype switches now use neutral paper tones, slim dividers and a subtle bottom rule for the selected option.
- Species, culture and career choice cards have thin borders, quieter serif titles, and a slender selected-state accent rather than a bronze halo.
- Smaller dice, allocation, magic, equipment and other option buttons use understated outlines; selections remain visibly marked.
- Builder's fixed Back/Next controls are restrained, with Next emphasized using light-gold type and a fine underline rather than a filled button.
- Changed the active step number from a filled bronze disc to a quiet outline.
- Added visible keyboard focus and disabled states.
- Bumped `sitota-interior.css` from v1 to v2 so existing desktop browsers load the update.

### Unchanged
- **Play Mode** remains exactly as before: no Play Mode selectors, JavaScript, or styling altered.
- The homepage's simplified Explore Sit’ota text link remains unchanged.
- The character creation workflow, skill calculations, save format, cloud auth and printable sheet are unchanged.

### Verification
- Scoped CSS source checks for builder-specific control states and Play Mode exclusion.
- Existing `tests/sitota-interior.cjs` updated.
- Full Node regression suite and authenticated live browser walkthrough were not run from this chat.

### Manual checks
1. New Character: Full/Quick, tier, species, culture and career selection shows a clearly visible active state.
2. Roll/points/manual characteristic options, skill adjustments, money, magic and equipment buttons remain usable.
3. Back/Next actions still enable/disable correctly and are visible over the dark footer.
4. Keyboard Tab focus, disabled controls, 1440px desktop, and narrow screen behavior.
5. Play Mode, World Guide and the homepage should be visually unchanged.


---

<!-- merged from CHANGELOG-AGEING-REVIEW.md, added 2026-11-04 -->
## Ageing review

- Correct the creator's misleading description of ageing as optional. For humans age 40 or older, show the applicable current ageing band and test grade; flag Senior and Old characters for review.
- Record a GM review or override with notes. The record is tied to the chosen age, category and species, so changing them prompts a new review. Existing characteristics and saves are not changed.
- Test a human age 44 and then age 50; the displayed grade should change from Easy to Standard, and a previously recorded review should need updating. Save/reopen and confirm the review is preserved.
- Still unfinished: ageing rolls, characteristic reductions and their effects on derived values are not automated. Handle them with the GM; signed-in persistence requires testing.


---

<!-- merged from CHANGELOG-AGEING-OUTCOMES.md, added 2026-11-04 -->
## Ageing outcomes

- Record the two check outcomes and dice results for eligible human ageing bands, with GM confirmation. Failed checks reduce the appropriate characteristic according to Mythras Core pp.70–71; a zero characteristic is flagged for terminal frailty.
- Current values and related skills and attributes recalculate while creation scores remain unchanged. Previous reviews and old saves do not gain automatic losses. A duplicate band is rejected, and the last recorded band can be removed after confirmation.
- Test: on a test character aged at least 40, open the ageing review on the Concept step. Record an Endurance failure with table roll 1 and loss 2; record a Willpower success. Check that current STR and STR-based skills drop by 2, save/reopen, then remove the last record. Confirm that an already-recorded band cannot be recorded again.
- Checks and dice rolls are still made at the table; non-human ageing is GM-managed. Live signed-in persistence and browser validation remain outstanding.


---

<!-- merged from CHANGELOG-AGE-CATEGORY-VALIDATION.md, added 2026-11-04 -->
## Age category validation

Source: user-uploaded Mythras Core Rulebook, printed pp. 33–34.

- Check entered human ages against the selected category's Core dice range and explain mismatches before proceeding.
- Permit a GM to record an exception for the specific age, category and species; changes require a new exception.
- Keep the entered age and skill allocations when changing categories rather than clearing the age.
- Leave non-human age ranges to the GM, as different lifespans need different year ranges.

Automated tests cover category boundaries, exception persistence and invalidation, age changes, allocations and non-human characters. Live verification remains open.


---

<!-- merged from CHANGELOG-ACCOUNT-BACKUPS.md, added 2026-11-04 -->
## Account backups and Sorcery guidance

Character backup import and download controls now live in Account under Advanced / Backup. Load saved characters there before downloading an individual backup. The Characters page no longer displays backup controls.

Sorcery now labels its round-up calculation as requiring GM confirmation beyond the printed 47% example. The roadmap records PR #34 as merged while retaining the rounding and production-test follow-up.

Test: sign in, open Account, expand Advanced / Backup, load characters, download one, then import it as a new copy and check its portrait. Confirm Characters has no backup controls, and a signed-out user cannot see another account's list. Open a Sorcery entry and check the rounding note. Real-account and browser checks are still required.

