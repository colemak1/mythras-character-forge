# Update 23 — Release readiness

Released October 23, 2026.

## What changed

- The current Mythras Forge application is now prepared for the production GitHub Pages release.
- Added a visible release and save-status bar, including a retry control for failed cloud saves.
- Local campaign and homebrew save failures now surface to the player instead of failing silently.
- Cloud character saves are serialized per character. Failed saves stay retryable, and signing out preserves unsaved local work when a final save cannot complete.
- Guest character, campaign, and local autosave data now survive account sign-out.
- The GM tracker now distinguishes turns from rounds: turns advance the active combatant, while **New round** restores Action Points and advances round-based effects. Existing injuries and spent Action Points carry into the tracker.
- Combat effects can use turn or round durations.
- Removed the fixed fictional round display from Play Mode so it does not imply live combat state.
- Updated asset cache versions for the release.

## What to test

1. Create a guest character, spend an Action Point or apply damage, then reload the page.
2. Sign in, make a small character edit, and confirm the save status reaches **Saved**. If a save fails, use **Retry save** and confirm the error clears.
3. In the GM tracker, advance a turn and verify Action Points do not reset; choose **New round** and verify that they do.
4. Add one turn-based and one round-based effect, then advance turns and start a new round to confirm each countdown follows its selected unit.

## Release checks

- Core rules smoke suite: 80 checks passed.
- Update 23 persistence and tracker regression suite: 8 checks passed.
- Desktop browser walkthrough: completed the Quick Character flow through Play Mode and verified the playable character sheet.

## Known release boundary

The configured production authentication and database service still needs a signed-in, live-service walkthrough after deployment; guest play and the local persistence path were verified in this release environment.
