# Update 25 — Campaign access hardening

## Changed

- Campaign data, characters, profiles, and custom campaign content now require a signed-in account at the database policy level.
- Anonymous callers can no longer invoke campaign-join or DM-only RPCs.
- Campaign membership helpers moved out of the public API schema.
- DM inventory edits and character removal retain their required server-side DM checks, with a hardened function search path.
- Future public database functions receive no automatic execute grant.

## Verified

- All five public data tables have RLS enabled and only authenticated policies.
- The anonymous role has no access to campaign join, DM actions, or private membership helpers.
- The authenticated role retains the minimum required access for campaign joining and policy evaluation.
- 11 application release regressions pass.

## Still to test live

- DM creates a campaign and joins with a second signed-in account.
- Player joins using an invite code, sees the campaign, and cannot edit DM-only content.
- DM can edit a member character's inventory and remove that character from the campaign.

## Follow-up

- Enable Supabase Auth leaked-password protection in the project Auth settings.
