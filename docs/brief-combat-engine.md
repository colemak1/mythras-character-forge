# Brief: one shared combat rules engine

**Done 2026-11-09** (all four steps; see `CHANGELOG.md` and `HANDOFF.md`). Differences found: `docs/decisions.md`, D-CE1 to D-CE5. Kept for reference.

For a single strong-model Claude session (owner, 2026-11-09). Read `AGENTS.md` and `HANDOFF.md` first; their rules apply (branch, every test before pushing, asset stamps, CHANGELOG, PR, auto-merge). **Behaviour must not change.** This is a refactor, not a rules batch.

## Why

The Pits' melee rules live in the inline `<script>` of `experiments/practice-combat.html` (lines ~359–3137, about 200 functions). Rules are mixed with presentation: global fight state `S`, presentation state `V`, the pending-roll prompt `R`, and dice handed out through callbacks (`requestDice` / `requestSkill`: a player answers a prompt, the AI resolves at once). Ten lines are over 1,000 characters (CSS lines 13–16, `SHAPES` 669, `newEnemy` 1547, `render` 1673, `setupHtml` 1675, `actionHtml` ~2052, the `handleClick` switch ~3075), so every read is expensive.

Play Mode has its own copies of the same rules:

| Rule | The Pits | Site (`js/`) |
|---|---|---|
| Parry reduction (Core pp.94–95; blocked half rounds up) | `parryAbsorption` | `parryDamage` (`play.js`) |
| Damage Modifier | `damageModifierFor` | `dmCalc` (`engine.js`) |
| Action Points / Initiative / location HP | `actionPointsFor`, `initiativeBonusFor`, `hitPointsFor` | `apCalc`, `initBonus`, `hpLocs` |
| Hit locations | `HIT_LOCS` (+ d20 use) | `HIT_D20`, `PLAY_HP_LOCS` |
| Special Effects | `availableEffects` / `applyEffect` | `SPECIAL_EFFECTS` table (`play.js`) |

Every new rule has had to be fitted into the big file by hand, and the human-only location list blocks nonhuman anatomy (creature characters, CRTR-B18, currently refused by The Pits).

## Goal

A new **`js/combat-rules.js`**: pure functions with no DOM, no `S`/`V`/`R`, no `Math.random`. Loaded by `index.html` and by `practice-combat.html` (before its inline script), and used by both.

- **Inputs in, outcome out.** Fighters, weapons, armour and the location table are arguments. Results are plain objects (e.g. `{blocked, remaining}`, `{location, damage, wound}`), not log lines or HTML.
- **Dice are injected.** A resolver takes rolled values or a `roll(sides)` function, so the existing prompt flow, the AI and tests can all drive it. Keep the prompt/callback flow in the page; only the rule decisions move.
- **The hit-location table is data** (`[{lo,hi,name}]`), defaulting to the human table. Don't build creature support; just make it possible.
- **One copy of each rule.** Where a Pits helper and a site helper agree, both call the module. Where they differ, **stop and list the difference** in the PR and `HANDOFF.md`; don't pick one silently. Check rulings in `docs/the-pits-combat-procedure-review.md` and `docs/decisions.md`.

## Order (commit after each step, tests green each time)

1. **Golden bouts first.** Add `tests/pits-golden.cjs`: run three or four complete bouts with `Math.random` replaced by a seeded generator (and answer prompts from it), covering parry by smaller weapon, Impale, Entangle + Trip, Knockback, shield Bash, a Serious Wound and concurrent tied Initiative. Record the full `S.logs` and final HP as fixtures. These must stay byte-identical through the refactor.
2. **Small pure helpers** (characteristic-derived values, parry reduction, damage modifier, hit-location lookup) into `js/combat-rules.js`; replace both copies.
3. **Resolution** (attack vs defence outcome, damage after parry and armour, wound level, Special Effect eligibility and the effect rules themselves) into the module, driven by injected dice. The page keeps prompting, narration and rendering.
4. **Split the long lines** in `practice-combat.html` to normal lengths (formatting only). Leave the CSS lines last; they're lowest value.

If credits run low, stop at the end of a step: merge what's done, and write what's left in `HANDOFF.md`.

## Constraints

- **Tests:** about 140 tests in `tests/practice-*.cjs`, `tests/the-pits.cjs`, `tests/pits-*.cjs`, `tests/combat-*.cjs` and `tests/play-combat-flow.cjs` load the inline script into a `vm` by regex and call its globals (`startRun`, `S`, `R`, `ensureEffectState`, `HIT_LOCS`, …). Keep those global names working (thin wrappers are fine). A test's **loading harness** may change (e.g. also load `js/combat-rules.js`); its **assertions may not** be weakened, removed or rewritten to fit (AGENTS.md rule 2).
- **Out of scope:** the rendering layer, any visual change, new rules, ranged/Lance/Garrotte, the Pits game layer (`pits-game.js`, presentation only), Play Mode's 7 HP boxes.
- **Saved data unchanged:** no change to character or campaign saves.
- **Windows checkout:** files are CRLF here, but asset stamps hash the committed LF bytes. Stamp with an LF-normalising script and run the full suite in an LF clone (`git clone --config core.autocrlf=false …`). Node and `gh` are installed; Python isn't. See `HANDOFF.md`.

## Done when

- `js/combat-rules.js` exists with its own unit tests (`tests/combat-rules.cjs`), one per exported rule, with Core page references.
- The Pits and Play Mode each use it for every rule in the table above; no duplicate left (or each remaining difference listed for ChatGPT).
- Golden bouts identical; all test files pass in an LF clone; no line in `practice-combat.html`'s script over ~200 characters.
- CHANGELOG entry, `HANDOFF.md` updated, one PR merged.
- Next step named in `HANDOFF.md`: ChatGPT (Work) plays a few bouts on the live site to confirm nothing changed.

## Kickoff line for the owner

> Read AGENTS.md, HANDOFF.md and docs/brief-combat-engine.md, then do that brief. Create a new branch from main.
