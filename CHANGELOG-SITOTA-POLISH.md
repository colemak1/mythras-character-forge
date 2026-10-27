# New Sit’ota visual correction

## Changed

- Rebuilt the public homepage and player guide as a typographic, art-free site. Removed generated hero/city images, placeholder character cards, decorative symbols, and the ornamental product styling.
- Replaced placeholder cards with direct routes to the real saved-character library, campaign, creation flow, and rules reference.
- Added a shared New Sit’ota header and dark site frame around Forge routes. Dense Forge content remains on readable paper-toned surfaces; authentication logic and the database schema are unchanged.
- Added an optional player-supplied character portrait on the Concept step. JPEG, PNG, and WebP uploads are resized to at most 512 pixels and saved in the character state; the real character library shows the portrait. Existing characters keep their initials until a player uploads one.
- Kept old hash bookmarks and authentication callbacks forwarding to `forge.html`.

## Test

1. On desktop, inspect the homepage and each world guide chapter, including chapter search.
2. Follow Characters, Campaigns, Create a character, Rules, and Open Forge. Verify the shared navigation and the appropriate sign-in gate.
3. Sign in and check a saved character, campaign, builder, play mode, and sign-out. Verify saves and synchronization.
   Upload and remove a portrait, reopen the character on another device, and test JSON export/import.
4. Open an old root hash bookmark and a fresh password-reset callback to check forwarding.

## Unfinished

- The user may supply original art or a logo for the homepage later. The homepage deliberately does not show fictional character data.
- A signed-in Supabase walkthrough and visual desktop browser review are still needed before this is merged.
- The pre-existing `tests/release-23.cjs` campaign-loading failure remains separate.
