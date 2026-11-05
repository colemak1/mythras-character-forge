# Magic and organizations audit

- Sorcery now displays the INT limit for memorised spells, the single Concentration limit, and the time needed to swap memorised spells. Source: uploaded Mythras Core Rulebook, p.165.
- The editor prompts for GM review when named spells exceed current INT. Recorded spells may include spells outside the memorised selection, so this is an advisory.

To test, open the Sorcery editor on a character with more named spells than INT. Verify the warning appears and all entries remain accessible.

## Folk Magic cost display

- Play Mode now shows the 1 MP base cost for player-recorded Folk Magic spells. Critical success costs zero and a fumble costs 1d3 MP (uploaded Core p.122).
- To test, record a Folk Magic spell, open Play Mode → Magic, and check the card shows 1 MP base before rolling.

## Cult and brotherhood ranks

- Community & Connections now has an expandable reference for joining, promotion and suggested training discounts (uploaded Core pp.196–199).
- The previous update changed a dormant affiliation editor. The reference is now available through the standard builder.

To test, open Community and expand **Cults and brotherhoods**. Common starts at 0% and Leader reaches 100%, with 25-point steps between ranks.

## Casting progress and cancellation

Active Sorcery, Mysticism and Theism entries now open to show casting progress and a Cancel casting control. Sorcery previously placed its cancellation control inside a closed spell disclosure. Mysticism and Theism had cancellation handlers without matching controls.

Live evidence: a dedicated Quick Character with Invocation and Shaping completed a two-turn Duration-shaped cast. Reload preserved turn 1/2 and 11 MP. The final successful roll spent 2 MP. The fixture remains saved for subsequent tests.

To test, begin a multi-turn cast, reload, then cancel. The casting marker should clear without a roll or MP charge.

## Recover an unconfirmed account save

- A reload can offer the signed-in owner a local draft when its account save was not confirmed. Accept restores the draft; Cancel loads the account copy. The choice protects against silently overwriting changes made on another device.
- Successful account writes acknowledge only the exact matching local snapshot, preserving newer unsynced edits.
- Regression coverage exercises recovery of an in-progress Mysticism cast, declining recovery, and owner isolation. A live immediate-reload retest remains open.

To test, begin a two-turn cast and reload before account sync finishes. Accept recovery and verify preparation remains at turn 1/2. Repeat and decline to open the account copy.
