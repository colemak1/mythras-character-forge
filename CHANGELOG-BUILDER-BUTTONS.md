# New Sit’ota — Character Builder Button Refinement

## Changes
- Removed the heavy, gold-filled fantasy-CTA treatment from Character Creation controls.
- Creation method and archetype switches now use neutral paper tones, slim dividers and a subtle bottom rule for the selected option.
- Species, culture and career choice cards have thin borders, quieter serif titles, and a slender selected-state accent rather than a bronze halo.
- Smaller dice, allocation, magic, equipment and other option buttons use understated outlines; selections remain visibly marked.
- Builder's fixed Back/Next controls are restrained, with Next emphasized using light-gold type and a fine underline rather than a filled button.
- Changed the active step number from a filled bronze disc to a quiet outline.
- Added visible keyboard focus and disabled states.
- Bumped `sitota-interior.css` from v1 to v2 so existing desktop browsers load the update.

## Unchanged
- **Play Mode** remains exactly as before: no Play Mode selectors, JavaScript, or styling altered.
- The homepage's simplified Explore Sit’ota text link remains unchanged.
- The character creation workflow, skill calculations, save format, cloud auth and printable sheet are unchanged.

## Verification
- Scoped CSS source checks for builder-specific control states and Play Mode exclusion.
- Existing `tests/sitota-interior.cjs` updated.
- Full Node regression suite and authenticated live browser walkthrough were not run from this chat.

## Manual checks
1. New Character: Full/Quick, tier, species, culture and career selection shows a clearly visible active state.
2. Roll/points/manual characteristic options, skill adjustments, money, magic and equipment buttons remain usable.
3. Back/Next actions still enable/disable correctly and are visible over the dark footer.
4. Keyboard Tab focus, disabled controls, 1440px desktop, and narrow screen behavior.
5. Play Mode, World Guide and the homepage should be visually unchanged.
