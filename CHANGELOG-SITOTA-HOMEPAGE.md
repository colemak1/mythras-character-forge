# New Sit’ota homepage — review branch

## Changed

- The root page welcomes players to New Sit’ota and opens a public, player-facing world guide.
- The existing Forge application is preserved at `forge.html`, with links from the new homepage to character, campaign, and rules screens.
- Old hash routes and authentication query callbacks forward to the matching Forge route.

## Test before merging

1. Open the new homepage and Explore Sit’ota while signed out.
2. Follow My characters, Our campaign, Rules, and Create a character; confirm normal sign-in and existing saved data.
3. Follow an old `/#/character/<id>` bookmark and a campaign invitation; verify they reach `forge.html` with the same route.
4. Request a fresh password reset and confirm the callback opens the new-password form inside Forge.

## Still unfinished

- The public world guide contains starter material and empty chapters for future player-safe entries.
- The full signed-in browser and authentication callback walkthrough requires a deployed preview or review branch.
- The pre-existing `tests/release-23.cjs` campaign-loading failure remains unresolved.
