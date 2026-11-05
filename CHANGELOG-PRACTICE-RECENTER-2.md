# Practice Combat — Recenter update 2

Combat choices now explain the current situation during the gauntlet, with optional guidance and readable descriptions on the choices themselves.

## Changed

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

## What to test

1. Enter Normal Gauntlet. Look for both Attack and Delay, with short explanations. Switch Guidance off and on; the fight and Action Points must not change.
2. When an opponent misses, inspect the explanation for choosing a parry anyway.
3. Compare weapon and shield parries against a larger weapon, including their current roll targets and protection.
4. Set a shield ward, then actively parry with that shield. Its passive ward must clear. A weapon parry must leave the separate shield ward intact.
5. Earn Special Effects and check the purpose groups. All legal options should remain selectable.
6. Check a last-AP decision, a reach disadvantage and a prone recovery decision. Guidance should describe that situation rather than repeat a generic tutorial line.

## Source verification

Used the uploaded **pdfcoffee.com_mythras-2e-2-pdf-free.pdf** (Mythras Core, 2e). Searched its parsed text first. Because the text encoding is garbled, rendered page images were then checked directly. Printed pages 91-95 cover actions, Delay, standing, wards, missed-attack parries, damage reduction and Special Effects; p.100 supplies the effect summary table; pp.101 and 103 cover prone fighting and Evade; pp.106-107 cover optional weapon reach. PDF page numbers are one higher than the printed page labels.

The in-app text uses concise teaching summaries and the book's action names. Source page references are available in each expanded Why explanation. Arena-specific limitations are identified as such. This is a focused decision/teaching update, not a declaration that the entire combat engine has been re-audited.

## Validation

- Tactical-guidance integration checks verify displayed targets, disabled reactions, retained legal effects, AP-safe preference changes, source-verified shield ward transitions, last-AP decisions and relevant reach choices.
- Existing practice UX/pacing, character handoff, rules smoke and unified workflow checks passed.
- Browser preview checked ordinary choices, a missed attack, weapon/shield Size comparisons, an active parry from a shield ward, Special Effect grouping, a reach disadvantage and the Guidance Off view.

## Next

Tune generated opponents into coherent tactical challenges and make the gauntlet's increasing difficulty clearer while testing several actual character builds.
