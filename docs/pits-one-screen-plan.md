# The Pits: one-screen battle and prototype-quality animation

Owner brief, 2026-11-11: the Pits should match the owner's prototype (`the-pits-mythras`, one HTML file; ask the owner for the zip, it is not committed) in layout and animation, changing only the rulings and the theme. It should play like a video game: everything on one screen, no page scroll.

## What was wrong

1. **Layout.** The prototype is an app shell: `height:100dvh; overflow:hidden`, two grid rows (stage `1fr`, command deck fixed). Production was a normal scrolling page: a stage whose height came from `calc(100dvh - …)` arithmetic, then the deck, then the chronicle, the Special Effects catalogue and the rules notes stacked underneath. At 1280×720 the page was 1063px tall, and the action list (7 buttons with 3-line help text) was cut off.
2. **Animation.** The prototype's game loop awaits its own animations: the attacker winds up and *stays* wound up through the defender's choice and the dice, then releases into strike, contact and recoil as one motion. Production resolves the rules first, then replays the chronicle one entry at a time (`playBeat` in `practice-combat.html`, cues from `pitsStageCue` in `pits-stage.js`). Between entries nothing was animating, so each figure drifted back to idle: the windup collapsed before the dice were rolled and the strike started from a standing pose. Each beat also waits a fixed 0.7 to 1.8 s (`PSTAGE_HOLD`) and re-renders the whole deck.

## Done in this batch (foundation)

- **Shell** (`pits-arena.css`, last section, desktop ≥901px): `body.pa-on` is a two-row grid, 100dvh, no page scroll. Stage flexes; deck is `--pa-deck`. Chronicle moved into the deck's third column (`pitsArenaDeckHtml`); exchange breakdown sits under the prompt; actions are a compact two-column grid (full help in the `title`). Rules notes and the Special Effects catalogue open in a window (`pitsArenaRules`). A Full screen button is in the bar.
- **Held exchange poses** (`pits-stage.js`: `exPose`, `psReleaseExchange`, `psSettle(keepExchange)`): windup and guard are held until the blow resolves, including while a person chooses a reaction or rolls.
- All unit tests, `tests/visual/pits-layout.cjs` (6) and `pits-scenarios.cjs` (18) pass. Page height equals window height at 1280×720 and 1440×900.

## Left to do (smaller model can finish; no rules changes needed)

Work in `experiments/pits-arena.css`, `pits-arena.js`, `pits-stage.js`, `pits-stage.css`. Check each item at 1280×720, 1440×900 and 390×844, light and dark, with a headless browser; rerun both visual scripts.

**Layout**
1. Add a check to `tests/visual/pits-layout.cjs`: in battle at 1280×720, 1366×768 and 1440×900, `document.documentElement.scrollHeight === innerHeight`, every `.act` is inside the viewport, and all reaction choices are visible without scrolling the prompt.
2. Short windows (height under ~700px): the fighter plates (about 330px) crowd the stage. Shrink `.body-svg` and plate padding with a `max-height` media query so the figures are never covered.
3. Chronicle panel header: put the title and the "View full history" button on one row; in the deck always show the full list (it scrolls), so drop the toggle there.
4. Exchange breakdown: when the prompt is tall (three defence choices) the breakdown gets no room. Either cap the prompt at about 60% of the column or show the breakdown as a tab beside the chronicle.
5. Phone (≤900px) still scrolls, as the prototype does. Decide with the owner whether phones get their own one-screen layout (stage on top, one deck panel at a time with tabs). Do not guess; ask.
6. Dice tray overlaps the fighters' heads at 720px height. Prototype behaviour is the same, but check the tray never hides the contact point at the moment of impact (move it up or shrink it when the window is short).

**Animation**
7. Timing: compare against the prototype's sequence (windup 220 ms, strike 120 ms ease-out with trail, hit 100+170 ms, recover 240 to 260 ms). Lower `PSTAGE_HOLD` so a beat lasts only as long as its animation plus a short read (attack/parry/evade about 350 ms now that the pose is held; hit about 1100 ms). The dice tray is the reading pause, not the hold.
8. Fewer stops: the "Continue" checkpoint between automatic actions (`captureActionBoundary`) breaks the flow. Keep it only when Guidance is on; otherwise auto-advance after about 500 ms.
9. Do not re-render the stage HUD when nothing in it changed: `pitsArenaHud` rewrites plates, strip and tray on every beat, which restarts CSS animations (chip pop, tray pulse). Compare the new HTML string with the previous one per element and skip identical writes.
10. Prototype touches still missing: coloured glow on each fighter (`filter:drop-shadow`), step-in animation with dust when range changes (`step1`/`step2` poses plus slide), the stage `shake` on every solid hit, ghost trail on evade. Check each exists in `pits-stage.js` and fires; add what is missing using the Stone tokens (no hex colours).
11. Longer term, if the result still feels like a slideshow: drive one exchange from one timeline (attack → reaction → contact → consequence) built from the structured facts in `entry.meta.px`, instead of one cue per chronicle entry parsed by regex in `pitsStageCue`. This is a bigger change; do items 7 to 10 first and ask the owner to judge.

**Theme.** The Codex · Stone look stays (owner: only rulings and theme differ from the prototype). The prototype is dark; the Pits follows the saved Light/Dark mode.
