# Character Creator Completeness & Cap Audit (July 2026)

Full pass over `js/{data,engine,app,render,play,cloud}.js` against `docs/mythras-rules-reference.md` and core Mythras rules. Two parts: (1) what's missing for the builder to be a complete, rules-accurate Mythras character creator end to end, and (2) every hardcoded cap/limit/validation gate, checked for accuracy.

## Part 1 — Missing / Incomplete Functionality

### Already self-admitted by the app (`play.js` `rulesNotes()`)
1. **Age bands / background events** — not modelled. Age is free text with zero mechanical effect. Core rules tie age to characteristic modifiers and background event rolls (Character Creation Workbook).
2. **Magic spell lists** — not modelled. Skill %s exist for Binding/Devotion/Exhort/Folk Magic/Invocation/Meditation/Mysticism/Shaping/Trance, but there are no actual Folk Magic spells, Theism miracles, Sorcery spell list/shaping/manipulation rules, Animism spirits, or Mysticism Talents. A magic-using character ends chargen with a percentage and no way to spend it.

### Found in this pass, not previously flagged
3. **Cult & Community is fully built but disabled.** `stepCult()`, `CULT_ARCHETYPES`, `pickCult`/`cultField`/`leaveCult` all exist and work, but `currentSteps()`/`stepFns()` in `engine.js` don't include the step — a deliberate, commented, temporary removal ("user's own call, to revisit later"). Worth a reminder since it's easy to forget code this complete is switched off.
4. **Height & Weight (core p.9)** — mentioned as a text reminder in `stepConcept()`, never computed or rolled.
5. **Non-human species creation** — no path exists. Movement is hardcoded to 6m "default for humans"; no characteristic-range or trait adjustments for non-human templates.
6. **Encumbrance penalties are cosmetic only.** `render.js`'s `encStatus()` correctly computes Burdened (>STR×2) and Overloaded (>STR×3) and displays the right warning text (Grade penalties, Movement penalty, no sprinting), but `engine.js`'s `gradeForEntry()`/`gradedPct()` never reads encumbrance state. The STR/DEX Grade penalty is shown, never applied to an actual roll.
7. **Fatigue track is label-only.** `FATIGUE_LEVELS` renders a picker with no auto-applied mechanical effect; explicitly left to GM adjudication in a code comment. Reasonable as a design choice, but worth confirming that's intentional rather than an oversight.

None of these are small — #2 (magic) and #6 (encumbrance-to-grade wiring) are the two most likely to actually distort play, since a caster ends with an unusable percentage and an overloaded character's combat rolls silently don't get harder despite the UI saying they will.

## Part 2 — Cap / Restriction Audit

### Correct and rules-accurate
- Culture allocation: 100 pts exact, 5–15 per skill. Matches book.
- Career allocation: 100 pts exact, 0–15 per skill. Matches book.
- Bonus Skills: pool = 150 + tier's `bonusExtra` (Pulp +50, Paragon +100), per-skill cap = tier's `bonusCap` (Ordinary 15, Pulp 20, Paragon 40), plus the +1 hobby skill. Matches Companion pp.54-55.
- Quick Character (Workbook alt.): 100 pts flat, 5–15 per skill, invested skills only. Matches Workbook.
- Advantage selection (Pulp 2 / Paragon 3, no stacking of the same Advantage): matches Companion text.
- `ARCHETYPES` numeric table (`pbPoints`/`mainRolls`/`sizintRolls`/`advantages`/`bonusExtra`/`bonusCap` for Ordinary/Pulp/Paragon) — checked against the in-file quoted Companion text (pp.54-55); values are internally consistent with the quotes.
- Combat Style weapon/trait attachment is deliberately uncapped (any number of weapons, any number of traits) — this is a correct non-cap, not a gap; nothing in the book limits a style to N weapons.
- Play Mode clamps (current HP/AP/Luck/Magic points against computed max, XP pool floor at 0) are all bounded to values engine.js computes, not arbitrary numbers.
- Fumble threshold logic (`skill>100 ? roll===100 : roll>=99`) is correct per the >100% rules already covered in the separate rules-question answer.

### Gaps — rules-mandated caps the app doesn't enforce
1. **Characteristic bounds only validate in Points-Build mode.** `validate()`'s "Characteristics" step gates the 3–18 (8–18 for INT/SIZ) range check entirely inside `if(S.charMode==="pb")`. Roll mode and Manual mode only check that all seven characteristics have been assigned some value — a manually-entered STR of 21 or a "rolled" value hand-typed to 99 currently passes validation. This is the most concrete actual bug in the set: the bounds check exists in the code, it's just unreachable outside one of three entry modes.
2. **No total starting-skill ceiling is missing** — checked against the rules reference; Mythras doesn't impose one beyond the per-pool caps already enforced, so nothing to add here.

### Existing caps that look arbitrary rather than rules-derived
3. **Manual characteristic entry: `max="21"` HTML attribute** (`render.js`, the manual-entry `<input type="number">`). 21 isn't a rules number — the accompanying text even says "Human range is normally 3–18" as an unenforced suggestion. Combined with finding #1 above, Manual mode currently allows anything from 1–21 with no gate at 18. Recommend either wiring the same 3–18/8–18 check into Manual/Roll mode validation, or if the app intends to deliberately allow super-human values in Manual mode (for NPCs/monsters), that should be a stated design choice rather than a silent gap.

## Bottom line

The point-buy/allocation math (Culture/Career/Bonus/Quick, Pulp/Paragon tiers, Advantages) is solid and well-cited throughout. The real gaps cluster in two places: things the app admits it doesn't do yet (magic content, age/background events, Cult toggled off), and one real validation hole (characteristic bounds unenforced outside Points-Build mode) plus its companion arbitrary cap (manual entry's max=21). Encumbrance-to-Grade wiring is the one place where the UI actively claims a mechanical effect that doesn't happen.
