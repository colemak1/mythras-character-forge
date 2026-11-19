# Subsystem 8 / site-admin live acceptance — 2026-11-09

**Deployed target:** https://colemak1.github.io/mythras-character-forge/  
**Source:** `AGENTS.md`, `HANDOFF.md`, `docs/subsystem-8-closeout-20261109.md`; owner D-S5 acceptance in current handoff.  
**Method:** connected-browser tab inspection only. No authenticated click/typing actions available in this Chat session. No secrets, email addresses, or access tokens recorded.

## Browser state

- Connected browser lists a `Sit’ota` tab at `index.html#/`.
- Read-only tab context displays **Sign in**, sign-in gate for characters, and no authenticated identity. No GM/player/admin authenticated interactions could be executed.
- The available browser interface here permits listing and reading existing tabs, **not** clicking, typing, switching sessions, downloading, or saving. **Blocker is browser interaction capability plus signed-out state**, not an observed failure in Forge.
- No disposable campaigns/characters were created or modified; no sign-in or admin quote action taken.

## D-S5 and app-only evidence matrix

**D-S5 owner decision:** direct-access/RLS evidence is provided by CI database permission tests. Do not duplicate those direct-access probes in live acceptance. This report does not independently rerun CI. The remaining matrix is strictly app UI and must use separate signed-in GM/player/outsider sessions.

| Check | Status | Evidence still required |
|---|---|---|
| New invite code | **BLOCKED** | GM rotates code; previous code/link refused, new code joins correctly after reload |
| Remove member | **BLOCKED** | GM confirms removal; removed member no longer participates; their character remains theirs and unassigned |
| Make GM | **BLOCKED** | GM transfers role; new GM sees GM Tools, old GM becomes a player; roles persist after reload |
| Save-conflict warning | **BLOCKED** | Player/GM or two client sessions overlap edits; stale save warns and does not overwrite; reload works |
| GM gifts/inventory | **BLOCKED** | GM adds gift; player retains ownership; item appears and persists after reload |
| New-item pop-up | **BLOCKED** | Recipient receives arrival notification once, handles it, and it does not endlessly replay after reload |
| Outsider privacy / D-S3 | **BLOCKED** | Distinct signed-in nonmember sees allowed display name only, not membership, character, email or private profile data; direct-access is covered by CI, not manually probed here |
| Campaign backup download | **BLOCKED** | GM downloads backup through UI; downloaded file has expected campaign content, no unrelated/private outsider data; keep contents private |
| Site admin #259 default painting | **BLOCKED** | Signed-in site admin types quote (and attribution/credit if applicable), selects **Use the default painting**, verifies unsaved text stays, then Saves; saved text survives reload and is visible where intended |

**Result:** 0 new live passes, 0 newly observed failures, **9 blocked checks**. An absence of execution is not a regression result.

## Closeout consequence and next execution

- Existing schema and three continuity RPCs were reported present/verified in `HANDOFF.md` and `docs/live-batch-followup-20261109.md`; **do not reinstall** merely due to these blocked UI steps.
- Resume this full app-level matrix in **ChatGPT Work** with interactive cloud browser and two authenticated disposable accounts (plus site admin for #259). Do not conflate CI permission coverage with UI behavior. Report individual results and any reproduction steps in a new dated docs note; remove disposable fixtures afterwards.
- **Subsystem 8 remains OPEN; project remains 5/8.** No closeout or direct-access failures claimed. No deployment, code changes or `CHANGELOG.md` edits.
