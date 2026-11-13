# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-13 by Claude (Pits trial: round reset, prone stays down)_

## Where things stand

- **Session readiness 13 of 14. Feature completeness 8 of 8 built, 8 closed.** Only item 11 (owner's two-device check) is left for Session Zero. Chat accepted the Subsystem 6 and 8 closes (#289). **Spirit Combat (AN-F06–F07) and SO-C02** built and passed live 2026-11-11 (`spirit-combat-live-290-20261111.md`); no longer Known limits. Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

00000000000000000. **Claude, done 2026-11-13 (owner's idea):** round reset in the trial (both back to their places and into guard at each new round); prone fighters stay down until they regain footing. **Owner:** watch a few rounds and say whether the reset looks right. Open: the live trial has movement faults the studies don't (see "Round reset, and fighters on the ground").

0000000000000000. **Claude, done 2026-11-13 (owner's notes on the trial):** evade drawn as a dodge to the ground, not a fall; the trial keeps the flow (no walk back after a lull; range changes still walk). Owner decided: natural over technically accurate on range. **Owner:** try an evade on `experiments/practice-combat.html?stage=spring`.

00000000000000. **Next, Claude:** (1) the shield strike's own-head and elbow faults, which fail the shield sample in `tests/pits-writer.cjs` (the only failing test; recorded under "Own blade across own head"); (2) the trial's findings 2 and 3 (write a blow during the dice roll, drop old frames), and the range marker and drift (finding 1); then the remaining families. **Owner's rule (2026-11-12):** nothing goes live until it is all done; branch `claude/go-wf0bsg` (pushed, no PR).

0000000000000c. **Claude, in progress 2026-11-13:** Work's own-head finding (PR #323, merged into the branch). Studies fixed; the full sweep still has 550 of 4,032 fights with a fault, mostly the shield strike. Details: `docs/pits-animation-direction.md`, "Own blade across own head". Owner chose the live trial first (2026-11-13); done, see the Next items above.

0000000000000b. **ChatGPT (Work), checked 2026-11-13:** prototype results in `docs/pits-studies-work-20261113.md`: readable dagger/late defences/shields/shove; Severity 2 own-blade/head overlaps, Severity 3 capture/endpoint limits. Not full visual acceptance and nothing deployed. **Next: Claude** — address the overlap and preserve the reported limits.

0000000000000a. **Claude, done 2026-11-13 (owner's request):** a failed parry still looks tried: the defender goes for the parry, late and short, and the blow lands. `docs/pits-animation-direction.md`, "A failed parry still looks tried".

0000000000000. **Claude, done 2026-11-12 (shields, step 3):** shield sizes, shield parry and ward on the shield's face, shield strike; study `pits-fight-study.html?seq=shields`; the sweep covers shields. **Owner (optional):** watch it on the branch and say whether the shield blocks and the shove look right. Details: `docs/pits-animation-direction.md`, "Shields".

000000000000. **Claude, done 2026-11-12 (weapon profiles and the thrust family, step 3):** weapon lengths and families in the writer; thrust lands, falls short, deflected; collapse after any lethal blow; the two open faults fixed. Sweep: 1,008 fights (dagger, shortsword, rapier, broadsword, longsword, falchion against each other) all within the movement rules. **Owner (optional):** watch `experiments/pits-fight-study.html?seq=thrust` (on the branch, not deployed) and say whether the dagger looks right. Details: `docs/pits-animation-direction.md`, "Weapon families".

00000000000. **Claude, done 2026-11-12 (exchange writer, step 1):** `experiments/pits-writer.js` turns engine-shaped records into the spring movement from wherever both fighters stand (measure and stance handled). The fight study is now the writer fed eight fixture records (`experiments/pits-fixtures.js`) and passes all 19 checks unchanged. New phrase "cut lands" for hits from an ordinary exchange. `tests/pits-writer.cjs`: roles swapped, another order, all 84 single exchanges. Details and weak points: `docs/pits-animation-direction.md`, "Exchange writer". **Owner:** nothing to watch; the fight study looks the same (one decision boundary is 80 ms later).

0000000000. **Claude, done 2026-11-12 (fight study, heavier and faster):** the owner liked the flow. Now 1.5 times faster, with longer hit-stops, bigger impact jolts, screen shake and heavier flashes (`docs/pits-animation-direction.md`, "Crunch and pace"). **Owner:** watch `experiments/pits-fight-study.html`, set the **Pace** slider where it feels right and tell Claude the number shown, and say whether the parries feel heavy and the hits brutal enough. If yes, Claude starts the live integration (sword cut, parry and miss from the engine's resolved results), keeping the no-gap rule and this crunch.

000000000. **Claude, done 2026-11-12 (fight study, one continuous movement):** no gap between actions; the next beat starts as the last parry, miss or wound resolves; only the optional decision holds stop. About 8.5 s. Details: `docs/pits-animation-direction.md`, "One continuous movement". **Owner:** watch `experiments/pits-fight-study.html` with the decision box unticked and say whether it now flows like a replay should; if yes, Claude starts the live integration (sword cut, parry and miss from the engine's resolved results), with the same no-gap rule for replays.

00000000. **Claude, done 2026-11-12 (fight study, smoother and never still):** after the owner's review. Eased keys, a live drift so nobody is ever still, smoother steps, about 12.3 s; jerk numbers in `docs/pits-animation-direction.md`. **Owner:** watch `experiments/pits-fight-study.html` again and say whether it is smooth enough to start the live integration.

0000000. **Claude, done 2026-11-12 (ten-beat fight study):** `experiments/pits-fight-study.html`, broadsword against broadsword, scripted fixtures, about 15 s. It plays straight through, with an optional hold at each decision. Smears and impact flashes are a layer that can be switched off. Details and weak points: `docs/pits-animation-direction.md`, "Ten-beat fight study". **Owner:** watch it at normal speed, then at half speed for any transition that looks wrong, and say whether it reads as one connected fight that ends because of the final wound. **Then Claude:** the first integration into the live Pits (sword cut, parry and miss from the engine's resolved results), keeping the pose stage for comparison until you approve.

000000. **Claude, done 2026-11-12 (exchange study, second pass):** the owner's four points: sword recovery path, the sword arm caught, held and released, steps that carry weight, the wounded end stance (`docs/pits-animation-direction.md`, "Second pass (owner's review"). **Owner:** watch `experiments/pits-exchange-study.html` at normal and half speed. If it holds up, say so and Claude starts porting the spring layer into the live Pits, one phrase at a time (the ordinary sword cut and parry first).

00000. **Claude, done 2026-11-12 (owner's animation reference pack):** a separate prototype, `experiments/pits-exchange-study.html`: one cut, parry, counter, wound and recovery, driven by springs between a few key poses (after Rosen's GDC 2014 slides; the recording was not watched), with impulses for impacts and exact contact constraints. Normal and half speed, frame step, decision hold toggle, overlays. GSAP, Mixamo and Spine not used (reasons in `docs/pits-animation-direction.md`, "Spring exchange study"). The live Pits is unchanged. **Owner:** watch it at normal and half speed and say whether it looks more natural than `pits-choreography.html?seq=sword`. If yes, Claude ports the spring layer into the live phrases, one phrase at a time; if not, name the moment that looks wrong.

0000. **Claude, done 2026-11-12 (second pass):** the sword exchange after the owner's second review: cuts shaped by their target from the preparation (high, body, legs), one continuous drive instead of three phases, defenders that go to a guard (a hit beats it; a parry is set early and binds the blade). Details and what is still weak: `docs/pits-animation-direction.md`, "Second pass"; contact sheet `docs/pits-visual-checks/sword-exchange-review.png`. **Owner:** watch `experiments/pits-choreography.html?seq=sword` at normal speed and say whether this is the standard to copy, or which moment still looks wrong; then Claude takes the same care over the next phrase you name (thrust, shield, trip...).

000. **Claude, done 2026-11-12:** the movement study is wired into the live Pits stage (`experiments/pits-stage.js` draws from `PitsMotion.LIVE` in `experiments/pits-motion.js`; one stage clock; phrases chosen from the engine's record; range changes are steps). Tests: `tests/pits-live.cjs` (CI) and `tests/visual/pits-motion-live.cjs`; all 18 `pits-scenarios.cjs` pass on the new stage. Stand-ins (other weapons borrow sword or dagger, shields, trip, disarm, stand up, yield, reactions written for the chest) are listed in `docs/pits-animation-direction.md`. The old poses stay behind `?stage=poses` for comparison. **Owner:** play a few bouts (and a replay) at normal speed and say whether it is convincing at the table, or which moment looks wrong; then Claude deletes the pose stage. **Then Claude:** phrases for the stand-ins, in the order the owner names (still no new weapons first). **Work (optional, one batch):** a signed-in bout on the deployed site with a shield and a spear, reporting anything that looks broken (Severity per `AGENTS.md`).

00. **Claude, done 2026-11-12:** ARM-01 to ARM-06 (weapon and shield arms, Core p.110) built and tested in `tests/pits-arm.cjs`; ARM-05 is not applicable (the Pits is melee only); ARM-06 is an app policy recorded in `docs/decisions.md` for the owner to confirm. Left for Work: live-check an arm Serious Wound (drop, Pick Up then Ready with the other hand, shield arm) and the free Switch Weapon Hand. Known limits: passive shield coverage of a disabled shield arm is GM-handled (ARM-04); no setup toggle for handedness on Forge characters beyond the checkbox.

0d. **Claude, done 2026-11-12:** the continuous-animation brief (exchange hold, decisions pause the scene, no idle resets, Press Advantage, specific finishing consequences). Details, confirmed bugs and limits: `docs/pits-animation-batch-20261112.md`; acceptance in `tests/visual/pits-flow.cjs`. **Owner:** watch a fight and a replay and say which beats still feel off. **Work (optional):** a live check of a finishing blow that waits on an Endurance roll, and a natural Press Advantage.

0c. **Claude, done 2026-11-12:** animation pass: hit-stop, push-in, damage-scaled recoil, evade/miss follow-through, trip/disarm impact, and a replay paced by cue completion (`pitsStageCueDone`, `pitsStageReplayable`). Owner liked the parry; asked for everything to match. Next, if it still feels flat: the replay director from the discussion (one authored timeline per exchange) and real art direction. Owner: please say which beats still feel off.

0b. **Claude, done 2026-11-12:** Pits end-of-fight batch. **Replay fight** (whole fight, uninterrupted; tape recorded in `playCaptured`, played by `startFightReplay`), **Show result** to reopen the Victory/Defeat window, range meter named by weapon length, Glory/Momentum/Pit Marks/recap and win-streak lines removed (Sound and hit shake kept; the Gauntlet leaderboard is untouched). Tests: `tests/visual/pits-replay.cjs`. Known limit: the log keeps only the last 110 entries, so a very long fight's chronicle list can lag during a replay (the stage and plates are right).

0a. **Owner:** try the five bottom layouts in the Pits (top bar, **Bottom** list; or `?bottom=A` to `E`) and tell Claude which to keep. Claude then deletes the other four and the switcher. See `docs/pits-bottom-layouts.md`.

0. **Claude, done 2026-11-11:** the Pits visual review batch (`docs/pits-visual-review-20261111.md`, VIS-01 to VIS-08) and `docs/pits-one-screen-plan.md` items 1 to 10 (one-screen layout checks, short windows, chronicle header, prompt cap, shorter beat timing, no Continue stop with Guidance off, HUD patching, glow and step-in). Item 5 (phone) skipped by the owner: phones are not a priority and the Pits may leave mobile. Item 11 (one timeline per exchange) waits for the owner to judge the feel. Scripts `tests/visual/pits-scenarios.cjs` and `pits-layout.cjs` (run locally with Playwright).

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work), after 0a is merged:** live-check the redesigned Pits fight on the deployed site: full-screen layout, a full bout, and the paths listed under Known limits in `docs/pits-visual-checks.md` (Impale withdrawal, Entangle, Trip then stand, Disarm recovery, Defeat, phone).
3. **ChatGPT (Chat), done 2026-11-11:** Core Serious Wound weapon-arm ruling in `docs/pits-serious-weapon-arm-cases-20261111.md` (docs-only PR #301). **Next: Claude** — implement/test only missing ARM-01–ARM-06 cases; ARM-06 is a forum-informed app policy (free hand transfer), not explicit Core RAW.
4. **Claude, after 0a:** only what the owner's two-device check turns up.

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
