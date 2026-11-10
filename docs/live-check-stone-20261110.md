# Live check: Stone reskin (PR #253), 2026-11-10

Checked by Claude on the deployed site (https://colemak1.github.io/mythras-character-forge/) after "pages build and deployment" succeeded. Signed out; Claude can't sign in.

## Passed

- The live page loads `sitota-theme.css`. The title is "Sit’ota", and no page text says "New Sit’ota".
- Only Fraunces and Public Sans load.
- Contrast audit, Light and Dark: Home, Characters, Campaign, Rules, World Guide, Account and The Pits lobby. No text is below 3:1 against its background.
- Light/Dark choice: set Light, reload, and it stays Light (`data-mode` and the saved choice both "light"). The Pits page, a separate HTML page, picks up the same choice.
- Phone width (375px), The Pits: no sideways scroll, and the phone tab bar shows.

## Found and fixed

- The Pits header still showed "SIT’OTA / THE PITS" and "THE PITS" in wide-tracked capitals. Fixed in the follow-up PR: sentence case, normal tracking.

## Still open: ChatGPT (Work), signed in

- As GM: in the campaign manager, open Home page, set a quote, who said it and the next session, and Save. Home shows them, for the GM and for a player in that campaign.
- "Rules & books" still saves, and still applies to a linked character.
- Character cards show race and no combat-style or AP chips.
- Play Mode → Settings shows Appearance and the Stone colour scheme.
