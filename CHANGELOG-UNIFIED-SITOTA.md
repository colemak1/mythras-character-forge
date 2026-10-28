# Unified New Sit’ota application

## What changed

- `index.html` now hosts the existing Forge runtime. Home, Characters, Campaigns, Create Character, Rules, Explore Sit’ota and Account use the same application and navigation header.
- The New Sit’ota home retains its dark typographic design and Explore button. At the Table exposes the existing character/campaign actions, including create/join campaign and the signed-in autosave continuation.
- The existing world-guide content and search are application views at `#/world/<chapter>`, available without signing in.
- `forge.html` is now a compatibility redirect. Query strings and fragments are copied intact before any app/auth script runs; `replace()` avoids an extra Back-history stop.
- Printable sheets retain their header exception. Public-view styles use their own names and variables to avoid changing builder controls.
- No Supabase schemas, storage keys, character formats, calculations, or gameplay handlers changed.

## Rollback

Baseline: `4783ac6ac01d35c4b856707971767770d50f8865` (current main when work began).
Remote branch: `rollback/pre-unified-sitota-2026-10-27`; a local tag of the same name also exists. The original homepage, Forge host and all application files can be recovered from that reference. Rollback after release should be a reviewed revert PR; do not reset shared history.

## Verification

PASS: `node tests/core-batch-1.cjs`, `node tests/rules-smoke.cjs`, `node tests/combat-turn.cjs`, `node tests/effect-selection.cjs`, `node tests/sitota-homepage.cjs`, `node tests/unified-routes.cjs` (8 route/workflow cases), syntax checks on changed JS, and `git diff --check`.

The unified tests exercise public views without altering open character state, private-route gates, history dispatch, signed-in character loading/editing/saving, campaign loaders, invite resumption, cold password recovery and JSON export/import. Supabase calls are stubbed; these tests do not claim a live cloud round trip.

Desktop browser preview (1348px wide): home and guide appearance; guide search; Back/Forward; Rules; signed-out library/Create Character gating; and old `forge.html?compat=a%20b#/world/places` redirect. An isolated, uncommitted local guest test copy additionally exercised builder input, autosave continuation, library, printable-sheet header hiding, campaign creation/rename and party-board navigation. Production guest entry remains disabled. Browser JSON import was interrupted and is not recorded as passed.

Known pre-existing failure, reproduced before edits: `node tests/release-23.cjs` throws `connection lost` in its first campaign-loading case. Its architecture-dependent script list was updated; the unrelated campaign recovery behavior is outside this PR. `tests/desktop-browser.py` was updated for the unified host and the existing repeatable-XP behavior, but was not run; browser QA used the preview directly.

## Manual testing before approval

Use a preview of this branch with a permitted Supabase redirect URL and a test account. Keep a JSON backup of any real character before editing. Do not merge/deploy until approved.

1. Open the root in a signed-out browser. Check Home, Explore Sit’ota, every guide chapter, search, Rules and Account; use Back/Forward between them. Confirm one header, no Open Forge step, and no horizontal overflow at desktop/laptop widths.
2. Click Characters, Campaigns and Create Character while signed out. Confirm Account is shown and no private character name appears on Home. Home’s create/join campaign actions must still give the existing sign-in guidance.
3. Sign in. Load an existing character from Characters, edit it, save, reopen and reload the page. Check both Play and printable Sheet; the shared navigation returns after leaving the sheet. Confirm other characters and the uploaded portrait are intact.
4. Use Create Character, then return Home and Continue as the autosaved character. Check the existing confirmation when starting another character with work open. Browse the guide and return to the same draft.
5. Open Campaigns and a campaign/party board. Create a test campaign, rename it, return through the list, and verify edits persist. Test joining with a code and a copied invite link in a separate signed-out session, including sign-in/confirmation and automatic invite resumption.
6. Export a character JSON, import it through Characters, and confirm it creates a separate character with preserved fields. Reject malformed JSON without changing existing saves.
7. Test old `/forge.html#/character/<id>`, `/play`, `/sheet`, `/campaign/<id>`, `/board` and `#/join/<code>` bookmarks. Confirm arrival in the root app and normal Back/Forward behavior. Add a harmless query parameter and verify it survives the redirect.
8. Request a password-reset email for the test account. Follow both a current root callback and any existing `forge.html` callback; confirm the new-password screen opens. The account owner should enter/submit the new password. Also test email confirmation. Check the configured root URL is allowed in Supabase; this PR does not change project settings.

## Still unfinished

Live signed-in Supabase save/load, multi-account campaign/invite behavior, email-confirmation and real password-reset links require manual verification. Browser JSON import/export needs completion. Existing campaign-loading failure remains. No production deployment is included.
