# The Pits: one-screen battle and prototype-quality animation

Owner brief, 2026-11-11: the Pits should match the owner's prototype (`the-pits-mythras`, one HTML file; ask the owner for the zip, it is not committed) in layout and animation, changing only the rulings and the theme. It should play like a video game: everything on one screen, no page scroll.

## What was wrong

1. **Layout.** The prototype is an app shell: `height:100dvh; overflow:hidden`, two grid rows (stage `1fr`, command deck fixed). Production was a normal scrolling page: a stage whose height came from `calc(100dvh - …)` arithmetic, then the deck, then the chronicle, the Special Effects catalogue and the rules notes stacked underneath. At 1280×720 the page was 1063px tall, and the action list (7 buttons with 3-line help text) was cut off.
2. **Animation.** The prototype's game loop awaits its own animations: the attacker winds up and *stays* wound up through the defender's choice and the dice, then releases into strike, contact and recoil as one motion. Production resolves the rules first, then replays the chronicle one entry at a time (`playBeat` in `practice-combat.html`, cues from `pitsStageCue` in `pits-stage.js`). Between entries nothing was animating, so each figure drifted back to idle: the windup collapsed before the dice were rolled and the strike started from a standing pose. Each beat also waits a fixed 0.7 to 1.8 s (`PSTAGE_HOLD`) and re-renders the whole deck.

## Done in this batch (foundation)

- **Shell** (`pits-arena.css`, last section, desktop ≥901px): `body.pa-on` is a two-row grid, 100dvh, no page scroll. Stage flexes; deck is `--pa-deck`. Chronicle moved into the deck's third column (`pitsArenaDeckHtml`); exchange breakdown sits under the prompt; actions are a compact two-column grid (full help in the `title`). Rules notes and the Special Effects catalogue open in a window (`pitsArenaRules`). A Full screen button is in the bar.
- **Held exchange poses** (`pits-stage.js`: `exPose`, `psReleaseExchange`, `psSettle(keepExchange)`): windup and guard are held until the blow resolves, including while a person chooses a reaction or rolls.
- All unit tests, `tests/visual/pits-layout.cjs` (6) and `pits-scenarios.cjs` (18) pass. Page height equals window height at 1280×720 and 1440×900.

## Done in the second batch (2026-11-11)

Checked at 1280×720, 1366×768 and 1440×900 (light and dark) with a headless browser; `tests/visual/pits-layout.cjs` and `pits-scenarios.cjs` rerun. Phone checks skipped on purpose (see item 5).

1. **Done.** `pits-layout.cjs` now checks no page scroll, every `.act` inside the viewport, the action list unscrolled, and all reaction choices visible with the prompt unscrolled (1280×720, 1366×768, 1440×900).
2. **Done.** `@media (min-width:901px) and (max-height:780px)` and `(max-height:660px)` shrink plates, body diagrams and tray. Test at 1280×640, 1280×720, 1366×768: no plate or tray over a head; plates leave the floor visible.
3. **Done.** `combatHistory({deck:true})`: no toggle in the deck, one header row (title and entry count), the list scrolls.
4. **Done.** Prompt capped at 68% of the column; three defences in a row, help clamped to two lines (full text in the `title`); breakdown keeps at least 56px.
5. **Skipped by the owner.** Phone layout is not a priority and the Pits may be removed from mobile. The ≤900px layout is unchanged.
6. **Done.** Compact tray in short windows; the same test checks the tray before and after the roll.
7. **Done.** `PSTAGE_HOLD` now replaces the fixed 900 ms floor: attack/parry 350, evade 650, hit 1100, deflect 1100, others 500 to 1000, end 1800.
8. **Done.** `pausePresentation` auto-continues after 500 ms unless Guidance is on.
9. **Done.** `paPatch` in `pits-arena.js` replaces only the HUD children whose markup changed; the bar is written only when its markup changes.
10. **Done.** Already present: dust (trip, evade, stand-up), shake (hit, parry, trip, disarm), evade ghost, weapon trail. Added: a glow per fighter (`drop-shadow` in each fighter's ink, no hex), step poses `step1`/`step2` and dust when the range changes.
11. **Not started.** One timeline per exchange. The owner should judge items 7 to 10 first.

**Theme.** The Codex · Stone look stays (owner: only rulings and theme differ from the prototype). The prototype is dark; the Pits follows the saved Light/Dark mode.
