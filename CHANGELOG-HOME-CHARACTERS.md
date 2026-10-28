# Homepage character cards

Restores a Your Characters section between the welcome and At the Table sections, with up to four recently saved characters, View All, and a Create a New Character card. Cards open the existing Play view and show saved culture/career details and player-uploaded portraits; characters without portraits use initials. Signed-out visitors see a sign-in prompt. Removes Create Character from the shared top navigation; the creation card and existing page action retain the normal draft confirmation.

No generated art, sample characters, rules, save formats, or database changes.

## Manual testing

1. Signed out: open Home. Check the sign-in prompt and create card; neither reveals saved character information. Confirm the top navigation has no Create Character item.
2. Sign in and return Home. Confirm up to four of your most recently saved characters appear, with their uploaded portraits or initials. Open a card, edit/save, then return Home and confirm the updated name/portrait appears. View All should open the complete library.
3. Create a New Character should use the usual draft confirmation. Confirm creation is still available in At the Table.
4. Check an empty account, failed character loading (Retry), and signing out/switching accounts. No previous account's cards should be displayed.
5. Check desktop and narrow layout, keyboard focus, guide navigation, browser history, and the existing character library.

Live account testing remains manual. Changes are prepared for review before merge/deployment.

## Verification

- Homepage checks and all ten unified route/workflow cases pass, including portrait filtering, four-character ordering, escaped names, and an account-switch race. Supabase calls are stubbed in automated tests.
- Browser preview checked signed-out gating, local empty state, a newly saved local character appearing on Home, and the create card opening the existing builder. No production character data was modified.
- JavaScript syntax and whitespace checks pass.
