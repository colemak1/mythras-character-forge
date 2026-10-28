# New Sit’ota — 16:9 homepage redesign (review)

## What changed
- Matched the approved widescreen composition: slim site header, panoramic castle hero, one-row character gallery, and three-column campaign/rules/world navigation.
- Used the original Richard Wright painting provided by the site owner, cropping only the surrounding white bars; stored optimized AVIF and WebP files locally with discreet artist/copyright credit. No generative reconstruction of the painting.
- Retained the real, account-backed character gallery and each character's saved portrait. The illustrative names and character portraits from the reference screenshot are NOT shipped.
- Preserved Create Character, Join/Create Campaign, Rules Wiki, World Guide, Continue Character, account, existing deep links, and the legacy forge.html redirect.
- Scoped new CSS to the homepage; no Supabase schema, game rules, character save, or server changes.

## What to test before merge
1. Desktop approximately 1648×928: compare top-level layout to the approved 16:9 screenshot. Ensure the castle remains visible, hero text is legible, and the portrait strip and tools fit naturally.
2. Signed in: four actual saved-character cards display their image, name, metadata, and open the correct Play view; fewer/more characters and missing portraits display gracefully.
3. Signed out: no fictional sample character data is shown and sign-in is available.
4. Verify Explore Sit’ota, character library, new character, campaigns and join flow, wiki, Account and browser back/forward navigation.
5. On phones/tablets, verify no horizontal overflow and readable hero/buttons.
6. Verify stale forge.html bookmarks and Supabase reset/auth callbacks still function.
7. Run node tests/sitota-homepage.cjs and broader app tests. The full suite has NOT been run in this chat.

## Publication note
This is a review PR, not a live deployment. The repository and GitHub Pages site are public. The user reports permission to use the painting on a personal/private site; confirm authorization extends to publicly accessible hosting before merging.
