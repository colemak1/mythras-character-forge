# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-12 by Claude (Pits: the ordinary sword exchange polished)_

## Where things stand

- **Session readiness 13 of 14. Feature completeness 8 of 8 built, 8 closed.** Only item 11 (owner's two-device check) is left for Session Zero. Chat accepted the Subsystem 6 and 8 closes (#289). **Spirit Combat (AN-F06–F07) and SO-C02** built and passed live 2026-11-11 (`spirit-combat-live-290-20261111.md`); no longer Known limits. Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

0000. **Claude, done 2026-11-12:** the ordinary sword exchange polished after the owner's review (close-measure cut, a miss that clears, a parry that intercepts, local hit reactions, a finishing blow straight to the floor). What changed and what is left: `docs/pits-animation-direction.md`, "The ordinary sword exchange"; contact sheet `docs/pits-visual-checks/sword-exchange-review.png`. **Owner:** watch it on `experiments/pits-choreography.html?seq=sword` (no setup: play, pause, step, quarter speed) at normal speed and say whether this is the standard to copy; then Claude takes the same care over the next phrase you name (thrust, shield, trip...).

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
