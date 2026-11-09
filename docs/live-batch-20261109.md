# Live acceptance — 2026-11-09

**Partial batch, not Subsystem 8 acceptance. Progress remains 5/8; Main Play Mode Combat stays CLOSED.** Read AGENTS.md and HANDOFF.md. Source/test checkout `7fcc066` (#236), which includes the requested #231–#234 changes; live asset hashes were not independently matched. Chrome cloud desktop, 936px viewport height. No real phone, resize control or audio observation supplied. No rules adjudication or production-code edits.

## Production blocker

See `server-check-results-20261109.md` for the SQL results and exact New code status. All three required public campaign functions are absent. No continuity migration was installed during this batch. New code confirmation works, execution fails. Removal/transfer execution remains unaccepted until production is updated.

## UI checks

| Requested area | Result | Evidence / limit |
|---|---|---|
| Shared desktop header | **PASS sampled routes** | Home, Characters, Campaign, The Pits route, Rules, World Guide and Account displayed the shared brand, six navigation links and current account. Also present on the campaign manager, Party Board, Builder and Sheet. Does not establish every deep route or the standalone Pits document/embedded fight header. |
| Phone tab bar, More sheet, Escape | **BLOCKED** | No real phone or supported viewport-resize control. Desktop coverage is not phone acceptance. |
| Character Sheet scroll | **PASS** | C fixture View / Print Sheet: document height 1811px, viewport 936px; keyboard scroll moved window.scrollY 0→875. Settled screenshot showed bottom weapon sections, Print sheet and Rules notes beneath sticky header. Print button top was 782.7px in viewport. |
| Play Mode scrolling | **NOT RUN** | This batch exercised Sheet scrolling, not a separate Play Mode scroll walkthrough. |
| Campaign manager, GM | **PARTIAL PASS** | B-created campaign displayed rules, Party, Table notes, Invite, Members and GM tools. New code expanded Replace code / Keep it before execution. Delete expanded a named-campaign text confirmation; Delete forever stayed disabled while blank. Remove/Make GM confirmation prompts not reached as GM after C joined (correct B return session was unavailable; subsequent supplied accounts were D and A). |
| Notes Saved and persistence | **PASS** | Keyboard-entered Disposable briefing 20261109 showed Saved. C's joined player view subsequently displayed the exact briefing as read-only text. |
| Campaign manager, player | **PASS UI restrictions** | C joined via code, saw Player view, notes, B GM/C Player names and invite-copy controls; no Rules & books, New code, Remove, Make GM or Delete controls. This is not proof of backend authorization. |
| Error cleared on account switch | **PASS** | B triggered New code error; after sign-out and secure C sign-in, C's empty campaign list and joined manager contained no B error. |
| Deleting active character → sign out | **PASS sampled sequence** | C built and saved Disposable Scroll C 20261109, opened Sheet, deleted the active fixture via library More actions → Delete, navigated Account and signed out immediately. Signed-out Home appeared without save-failure warning or reload. |
| Outsider campaign route | **PASS UI only** | D and A, each outside this campaign, opened its actual route and got Campaign not found, with no campaign details/members. No raw API permission pass inferred. |

The character was deliberately a minimal Quick Character with normal rolled characteristics and an explicit GM override of incomplete Quick Skills, solely for UI testing. No real character or the retained Creation Audit/Magic Audit fixtures was edited.

## Creature tracker

**PARTIAL anatomy UI; remaining actions BLOCKED by form refresh.** B → Party Board → GM Tools → Add a creature from its stat block. Winged Biped selection generated nine location rows spanning d20 1–20, including wings, with `0/?` placeholders. Validation correctly requested location HP and missing identifying/characteristic data.

The tracker re-render repeatedly collapsed the open creature disclosure between actions. Subsequent stat-block entry was interrupted/lost; a normal keyboard-input attempt also hit a browser action deadline while the form changed. Stopped retrying. No completed creature was added, no Chaos Feature rolled, and sapient-PC permission / Points Build was not observed. These are **BLOCKED**, not source-verified or live passes. Investigate preserving the open disclosure and unsaved creature form during board refresh. Some failures involved automation timing; no unsupported claim that the parser itself rejected a valid static block.

## Multi-account plan and D-S3

Roles this batch: **B=GM**, **C=player**, **D/A=outsiders**. Secure forms only; no credentials/tokens in docs. C join and member-name display passed at UI level. These results do not replace the requested direct permission matrix:

| Journey | Status / remaining evidence |
|---|---|
| 1–5: GM state reads, legacy session_state, assignment, inventory/unassign RPCs, arbitrary writes/deletes | **BLOCKED direct requests** — supported browser interface has no authenticated REST/RPC client; no JWTs extracted or raw API calls made. |
| 6: outsider campaign/members/characters | Route denial observed as D/A; **direct endpoint matrix BLOCKED**. |
| 7: GM notes/tracker persistence/live updates | **NOT RUN to completion this batch**; only shared campaign Table notes persistence established here. Earlier GM-note evidence is in the 2026-11-08 report. |
| 8: code rotation | Confirmation passed; execution **FAIL**, required public RPC absent. Old/new-code journeys and player RPC denial remain blocked. |
| 9: two-tab HP conflict / gifts / GM inventory deletion | Same-owner two-tab HP case **NOT RUN**. Simultaneous independent GM/player gift, pop-up and deletion/conflict checks **BLOCKED** by shared browser identity; no independent account profiles supported. |
| 10: backup/removal/transfer | **NOT RUN** backup contents and GM member prompts; production removal/transfer functions absent. Preservation and transferred GM privileges remain unaccepted. |
| D-S3 | C member UI showed only names/roles; outsider global profile response **BLOCKED**, no supported profile-query UI/client. Earlier migration/grant verification is not a fresh outsider-response pass. |
| New-item pop-up | **BLOCKED**, no concurrent independent player/GM session. |

Other carried-over item-search/26-trait/Undo/Pits bout checks were not repeated here. See 2026-11-08 evidence and its explicitly open items; no extra passes are added.

## Cleanup and next action

C's sole saved fixture was deleted through the library and sign-out succeeded. The disposable campaign was removed in Supabase by exact UUID **and** name; one returned row confirmed the target. Its notes, membership and partial tracker setup were test-only. No test account deleted; no real fixtures edited. No complete creature was added.

Claude: review absent public functions and provide the confirmed continuity migration to Work; investigate tracker form reset. Then repeat the failed actions and remaining account checks. Full phone and direct endpoint coverage needs a suitable environment. No subsystem closure.

## Validation

All **46** repository tests/*.cjs scripts completed without FAIL lines or AssertionErrors. No production code, migrations or CHANGELOG.md changed. Only this dated report, the dated diagnostic result and Work's own HANDOFF line are proposed. Automated tests do not establish the blocked live permissions.
