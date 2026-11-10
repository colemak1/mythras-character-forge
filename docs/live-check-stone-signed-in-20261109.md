# Stone signed-in live check — 2026-11-09

Requested scope: deployed Stone reskin #253 and The Pits header fix #254. Date uses the owner's local time (America/Los_Angeles); the existing Claude check is dated 2026-11-10.

Read `AGENTS.md`, `HANDOFF.md`, and `docs/live-check-stone-20261110.md` first. Independent Work check through the connected Chrome browser on the deployed site.

## Observed

The existing Account tab initially contained the previous design. An intentional reload displayed the current Sit’ota header and Settings → Appearance with Light, Dark, and Match device (Match device selected). The account remained signed out: Email/Password and Sign in were visible. This confirms only the signed-out Account UI, not authenticated functionality or preference persistence.

## Results

| Requested check | Result | Evidence / blocker |
| --- | --- | --- |
| GM campaign manager: Home panel; save quote, attribution, session title/date/time/place; display on GM Home | blocked | Connected browser was signed out; no authenticated test-account session available. No campaign data changed. |
| Same quote/session on campaign player's Home | blocked | No authenticated player session available. |
| Rules & books saves and applies to linked character without GM-review error | blocked | Requires authenticated campaign and linked character. |
| Home and Characters cards: race first; no style/AP chips | blocked | No authenticated character cards available. |
| Play Mode Settings: Appearance and Stone scheme; switching and reload persistence | blocked | No authenticated Play Mode available. Signed-out Account exposed the three Appearance choices only. |
| Every route at desktop and 390px, Light and Dark | blocked | After Account reload, attempted desktop viewport setup and Light selection. Browser returned “Detached while handling command” on Light click, before navigation or screenshots. No route/theme matrix completed. Per owner/repo instruction, did not retry or change browser surface. |

No independently established unreadable or broken product UI in this pass. The connection failure is a test blocker, not evidence of a site defect. Claude's signed-out results remain separate evidence; they are not reclassified as signed-in passes.

## Cleanup and validation

- Created no campaigns or characters; none required deletion.
- Did not submit credentials, campaign forms, character forms, or rule changes.
- A viewport reset attempt could not run because its binding was unavailable after detachment; no viewport override is claimed to have been restored.
- No secrets, account identifiers, invite codes, or private campaign data recorded.
- Documentation only; no production files or CHANGELOG.md changed. Runtime tests not run (no local checkout; no code changed).
- Progress remains **5/8**; Main Play Mode Combat stays CLOSED.

## Next

Claude: review/merge this documentation-only PR. No product fix is established. Signed-in checks and the full route/appearance matrix remain unaccepted and need a working authenticated browser in a later live batch.
