# The Pits: bottom-third layouts (owner request, 2026-11-11)

Five designs for the area under the arena, from the owner's mockups (`the-pits-bottom-layouts.zip`, not committed). Built as options so they can be tried in play. The owner removes the switcher once one is chosen.

**Choosing:** the **Bottom** list in the top bar, or `?bottom=A` to `E` (`current` for the old layout). The choice is saved in `localStorage` (`sitota-pits-bottom-layout`). Phones (<=900px) always use the current layout.

**Code:** `experiments/pits-bottom.js` (markup, selection, keys, history window), `experiments/pits-bottom.css` (Stone tokens only), small hooks in `pits-arena.js` (`pitsArenaDeckHtml`, the bar, `paFocus`). Tests: `tests/visual/pits-bottom.cjs`.

| | Layout | Selects first? | History button |
|---|---|---|---|
| A | Command bar: status row, one row of action cards, last exchange as one line | no | yes |
| B | Duel table: card grid (Attack double width), last exchange as a roll face-off with the real roll bands | no | no |
| C | Ground dock: icon dock under the fighters, each fighter's last roll in the corner on their side, hover for help | no | yes |
| D | Step flow: Action, Target, Resolve strip with a "Last" line | yes | no |
| E | Odds first: action list, odds panel, last exchange timeline | yes | yes |

**Shared:** one primary area (the actions, or the engine's own prompt when a decision is waiting: reactions, rolls, effects, resolving, bout over) and one result area (the last exchange). The chronicle panel is not in any of them. Action order follows the mockups (Attack, Shield Strike, Brace, Dither, Delay, Change Range, Regain Footing, others, Concede last); number keys follow it.

**Decisions (not rules):**
- D's target step cannot be a hit-location picker: attackers do not choose a location before rolling here (location choice is a Special Effect, drawn in the existing window). D shows the opponent's real body map, HP, armour, weapon and Evade instead.
- E's third meter is the foe's Parry target, not the mockup's "chance it lands", because a combined chance would be invented maths.
- "View full history" opens the existing chronicle list in a window.

**Known limits:** phone not designed (falls back); the toast for Pit Marks overlays the bottom for a few seconds, as before.
