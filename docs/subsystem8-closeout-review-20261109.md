# Subsystem 8 — review of PR #265 (2026-11-09)

**Disposition: scoped evidence accepted; closeout gate NOT satisfied. Progress remains 5/8.**

Reviewed [PR #265](https://github.com/colemak1/mythras-character-forge/pull/265) at `c5a733c49d5cf88533278caa713ba66ea110e6ac`, [app results](subsystem8-app-results-20261109.md), [closeout gate](subsystem-8-closeout-20261109.md), [campaign inventory](campaign-cases-batch-1.md), D-S1–D-S5 in [decisions](decisions.md), and [subsystem plan](subsystem-plan.md). This is a documentary review, not a new browser test or independent reproduction. The original results and checkpoint remain intact; the results supersede the earlier authentication blockers only for the scenarios actually completed.

## Gate reconciliation

| Gate area | Accepted evidence from #265 | Remaining limitation / disposition |
|---|---|---|
| Creation, join, invites | INV16 / D-S1: confirmed rotation, reload, explicit old-link rejection, new-link player join; player has no rotation control. | Earlier missing-RPC blocker is cleared for these observed operations. This does not certify every creation/invite case. Manual old-code submission lacked durable feedback; retain as an observation. |
| Roles and continuity | LIFE11: removal confirmation, lost campaign access, retained editable unassigned character. LIFE08: confirmed transfer, role persistence, new GM Tools, old GM player view. Campaign deletion confirmation and character survival also observed during cleanup. | These replace the gate's earlier migration/retry blocker for the tested paths. Transfer of populated private notes and in-flight removal/deletion races were not demonstrated. |
| Ownership and RLS | D-S5 accepts CI permission tests for direct-access steps. GM read-only combat controls and recipient ownership were sampled through the app. | No new live API/RLS certification and no claim that sequential role switching covers the full A/B/C/D app matrix. |
| Conflicting saves | SAVE09: same-owner two-tab stale save rejected, latest value retained, Reload latest works. | E2E10 is only partially covered: this was character state, not all campaign races. Concurrent different-account gift merge and GM inventory-deletion versus player-save conflict remain **BLOCKED** by the shared authentication session. |
| Gifts and inventory | Arrival on a later recipient load, ownership/editability and reload persistence; Reveal-enabled pop-up, dismissal and no repeat on reload. | Gift while the recipient stays open and saves is **BLOCKED**. Non-Reveal arrival variant remains **unaccepted**. Do not promote this to full S4/BRD06 acceptance. |
| Display names and outsider privacy | Known campaign route denied before joining; member rows showed display names without emails; non-admin panel absence sampled. | Outsider profile/display-name, character and Party Board route reconciliation remains **unaccepted**. Member-row observations do not establish the global outsider D-S3 workflow. |
| Party Board, notes and backup | LIFE13 / D-S4: actual downloaded, parseable JSON, fixture campaign/member/character counts and expected top-level keys. Earlier sampled notes/player evidence is retained by the gate. | Export had null GM state and no custom content. Populated GM notes/tracker/homebrew export and recovery/restore validation remain **unaccepted**; keys alone prove no round trip. GM Tools access alone proves no notes persistence or privacy. |
| Navigation and session | Sequential fresh sign-ins, role reloads and final sign-out support the reported scenarios. | Full route/phone/header/session matrix remains **unaccepted**; no expansion from these samples. |

**Separate regression: #259 PASS for the requested quote/attribution draft retention after Use the default painting, Save and full reload.** Original text was restored and public Home checked after sign-out. Picture-credit retention was not exercised. This regression pass does not close a campaign gate area.

## Automated and deployment evidence

- [Tests run 42767036317](https://github.com/colemak1/mythras-character-forge/actions/runs/42767036317) succeeded at the reviewed head; both Run tests and Database permission tests steps succeeded. Relevant files are `tests/campaign-continuity.cjs` and `tests/db/permissions.cjs` (D-S3 profiles, GM-only notes, ownership/RPC denials, revisions, rotation, removal and transfer). D-S5 remains the accepted direct-access evidence; no new token/API probes are needed for those steps.
- The database suite uses `tests/db/base-schema.sql` as a production-schema stand-in. Its accepted scope remains unchanged; CI success is not proof of a particular deployed schema or frontend commit.
- The report explicitly could not independently establish the deployed commit. Repository preparation HEAD is not a deployed-version identifier. Keep the browser observations as scoped evidence; attach a verified deployed revision to the final acceptance reconciliation before closeout.
- Case labels need care: the original C8-SAVE19 row concerns assignment during autosave, while the later S4 summary and app report also use SAVE19 for GM inventory races. Both remain unaccepted where not exercised; the same-owner SAVE09 pass resolves neither. D-S3 supersedes the inventory's older same-campaign-only wording; global signed-in display names are intentional, with private fields still protected.

Validation of this docs-only addition: the required `tests/*.cjs` loop completed locally with no FAIL/error matches; whitespace check passed with CRLF recognized for the existing handoff. No production files, original result rows, progress count or CHANGELOG changed.

## Remaining closeout work

1. With independent authenticated GM/player sessions, exercise open-sheet gift merge and GM inventory deletion versus a stale player save. Preserve the existing browser blocker until those sessions are available.
2. Complete the outstanding app-level outsider routes, non-Reveal arrival, populated backup/recovery and GM notes/tracker persistence/visibility checks. If restore is unsupported, record its disposition explicitly rather than inferring a pass or exclusion from download success.
3. Reconcile every applicable case to a disposition and specific automated/live evidence, including earlier evidence, full navigation/session scope and a verified deployed revision. No undocumented exclusion or unresolved P0/P1 issue may be waived by these samples.

No confirmed application failure is established by the completed scenarios. The delayed first transfer attempt and old-code feedback remain observations, not invented permission failures. No blocker, unaccepted area or deployment limitation is converted into a pass. No closeout or progress change is awarded.

**Next: ChatGPT (Work)** for remaining live-only scenarios when independent account sessions are available; Claude handles any demonstrated implementation defect. Claude may merge this docs-only PR after its latest Tests check passes.


---

## Follow-up review: remaining live evidence (2026-11-09)

Reviewed [remaining live results](subsystem8-remaining-live-20261109.md) on PR #265 against the gate and the scoped review above. **Documentary acceptance only**, not a new browser run, database/RLS probe, or a new round of automated tests. The earlier pass rows and #259 admin regression remain accepted within their original scope; the remaining-live report neither repeats nor expands them.

| Gate area | Newly accepted *app-level* evidence | Limit retained |
|---|---|---|
| Deployed frontend | The follow-up reports successful Pages deployment 7674253474 at `0f83da745f026089406ec8106986a859414edf8b` and matching live asset stamps for cloud/router/play/app. | Resolves the **previous unidentified deployed frontend** for the follow-up observations. A successful deployment and matching stamps do not verify production database schema or retroactively prove the build used for every earlier observation. |
| Outsider access | An outsider received unavailable/redirect behavior on a known, populated Party Board, character editor and Play route; no contents exposed in those UI tests (app portions of C8-BRD03 and C8-AUTH11). | Not a direct-access/RLS certification. Global outsider display-name/profile workflow remains **UNACCEPTED**. D-S3 permits display names globally to authenticated accounts, not private profile fields. |
| Private Board and transfer | Authorized player saw the shared party without GM notes/tracker controls; private note and NPC HP/Initiative persisted across GM reload; after transfer old GM lost private tools and fresh new GM saw private note, tracker and homebrew. Public briefing was confirmed Saved and later visible to the player. | Scoped role, persistence and visibility passes, not every Board, lifecycle, account-switch or concurrent-write case; no proof of server denial from hidden controls alone. |
| Gift notification | Non-Reveal gift showed ordinary NEW ITEM/OK, dismissed once, stayed in inventory across reload. This supplements the previous Reveal-enabled arrival-on-load pass. | Both are **arrival-on-load** evidence. Independent live GM/player open-sheet gift merge and GM inventory deletion versus stale player save remain **BLOCKED** by the shared browser auth session. C8-SAVE19 originally describes assignment during autosave; it too remains unaccepted where not exercised. |
| Backup and recovery | Downloaded campaign backup now had two characters, two members, one custom-content entry, populated private GM note/tracker, custom armour and public briefing. These replace the earlier empty-state/shape-only export limitation for the tested export. | **Campaign restore/recovery UNACCEPTED** under C8-LIFE13. No restore control or campaign round trip was demonstrated. The character-import feature is not a campaign-restore path. Neither a restore PASS nor an exclusion is justified; Claude/owner must document the promised recovery contract or implement and test a suitable restore workflow. |

**Still open for closeout:** (1) independent differently authenticated GM/player inventory races; (2) campaign restore/recovery contract and validation; (3) global profile/display-name workflow, full route/phone/header/session checks, and other outstanding assignment/save/campaign races; (4) one-to-one reconciliation of every applicable inventory case with dated live/CI evidence and documented GM-assisted/excluded dispositions. D-S5 CI permission tests remain the accepted direct-access evidence; do not re-label UI samples as RLS tests. No confirmed application failure is demonstrated by the completed follow-up checks, but a missing recovery workflow must not be silently treated as working or waived.

**Conclusion:** additional scoped PASS evidence accepted; historic blockers narrowed only where re-tested, with the explicit concurrent-session blocker and recovery gap preserved. Subsystem 8 remains **OPEN**, progress **5/8**. Claude may merge PR #265 only after the latest required Tests check passes; this review does not merge it.
