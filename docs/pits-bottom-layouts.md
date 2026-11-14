# The Pits: the bottom deck

**Chosen 2026-11-14:** layout E ("Odds first"), reworked to help new players keep up (a tester: "so much just happened and I don't know what's going on"). A to D and the switcher are deleted. Phones (<=900px) and `?bottom=current` keep the older deck.

**Code:** `experiments/pits-bottom.js` and `experiments/pits-bottom.css` (Stone tokens only); hooks in `pits-arena.js` (`pitsArenaDeckHtml`, `paModalHtml` returns nothing on desktop, `paFocus`). Tests: `tests/pits-bottom.cjs` (CI), `tests/visual/pits-bottom.cjs` (local, Playwright).

| Column | Shows |
|---|---|
| Left: your moves | Actions for your turn, and defences for when you are attacked (or the three answers to a range change). The one that matters now is open; the other is a one-line reminder. |
| Middle: what's happening | Headline (who is doing what), exchange tracker (Action, Defence, Effects, Location, Damage), the exchange told line by line, then the decision: Confirm, Special Effect chips, the Choose Location body map, or the engine's own prompt (rolls, resist choices, recap). |
| Right: details | Whatever is pointed at or focused, else the selection, else "how an exchange works". History button in its header. |

**Odds (presentation only).** Every figure is counted over the 100 faces with the engine's `rollSkill` and `CombatRules.opposedWins` / `effectsWonBy`, using `effectiveSkill` for penalties. Nothing is estimated:
- an action with a roll: chance of each grade;
- a defence: chance to stop the blow, and how many Special Effects each side earns against the attack roll already made;
- a resisted Special Effect (Trip, Disarm, Blind, Compel, Stun, Bleed): chance it works against the roll that earned it, with the split; Trip by each resisting skill; Stun and Bleed only if the blow wounds; Force Failure shows 100%.
- An attack's chance to land is not combined with the foe's defence, because their choice of defence is unknown.

**Known limits:** the opponent's defence choice is not predicted; a long Special Effect card can scroll at 720px tall; phone not designed (falls back).

**Next (owner, 2026-11-14):** tempo, then the rules accuracy pass.
