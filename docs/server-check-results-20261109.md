# Production campaign diagnostics — 2026-11-09

Read AGENTS.md and HANDOFF.md first. Ran both read-only SELECTs from `docs/server-check-20261109.md` separately in the **Mythras Forge production SQL editor**, after secure sign-in and an owner-authorized CAPTCHA. No migrations or policy/schema changes were made.

## Query 1: required public functions

**Success. No rows returned (0 rows).** None of `public.rotate_campaign_invite`, `public.dm_remove_member`, or `public.dm_transfer_campaign` was present in the queried catalog. There were therefore no function privilege rows to evaluate. This is a database catalog result, not merely a stale API-cache inference.

## Query 2: triggers

| Table | Trigger | Function | Settings |
|---|---|---|---|
| campaigns | campaigns_block_session_state | private.campaigns_block_session_state | `["search_path=\"\""]` |
| characters | characters_before_update | public.characters_before_update | `["search_path=\"\""]` |
| characters | characters_check_campaign_assignment | private.characters_check_campaign_assignment | `["search_path=\"\""]` |

No campaign_members trigger row was returned. All three returned functions explicitly set an empty search path; none had null/blank settings. Function bodies were not inspected, so this does not prove every internal reference is qualified.

## New code on a disposable campaign

Test Account B created Disposable diagnostics 20261109. New code first expanded a confirmation explaining old-code invalidation and offering Replace code / Keep it. After Replace code, the exact status was:

> Could not change the invite code: This needs the November 2026 campaign update on the server. Ask the site owner to run it.

The displayed code did not change. No raw SQL/PostgREST error code was shown in this observed missing-function case. Do not describe this as a trigger/search-path error: **the required public functions are absent**, which directly explains unavailable New code / Remove / Make GM operations. The historical claim that the continuity migration ran is not sufficient evidence of its current production installation.

## Follow-up and cleanup

Claude should review these results and hand Work the confirmed current continuity migration to install, as specified in the diagnostic plan. Work should then verify that Query 1 returns all three functions with authenticated execution, and repeat the live actions. No new migration is proposed here, and this diagnostic session did not re-run the continuity migration.

Cleanup: C deleted the saved scroll-test character through its own library. After the owner supplied other test accounts instead of the campaign-owning B session, Work removed the **one exact disposable campaign** in the authenticated SQL editor using both its known UUID and exact name as predicates. RETURNING reported one row, Disposable diagnostics 20261109. This fixture cleanup was a data mutation, separate from the two read-only diagnostics; no real campaign was targeted. No account was deleted. See `live-batch-20261109.md` for UI results and limits. Progress stays 5/8.
