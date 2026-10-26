# Update 24 — Sign-in and homepage repair

- Removed the top release/save banner entirely.
- Removed added homepage import, guest backup/restore, and wiki links.
- Sign-in entry remains available when the authentication library cannot load; the account page explains the failure.
- Guest access is disabled in the public build, including old stored guest markers. Protected pages require sign-in even when the cloud library fails to load.
- Existing error warnings and unload protection remain active.

Validation: core smoke suite and eight release regression tests passed. Recovery tests now check that retry and export appear on failure and disappear after successful retry.

Still required before production reliability is claimed: real signed-in hosted save/reload, second-browser retrieval, interrupted network recovery, campaign access isolation, and visual browser review. These checks are not covered by the Node tests.

Manual checks: open Sign In from the homepage; verify the banner and extra bottom links are gone; open a protected character URL while signed out and verify the account page appears. Complete signed-in save/reload testing separately.
