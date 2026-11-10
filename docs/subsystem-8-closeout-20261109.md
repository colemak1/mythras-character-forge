# Subsystem 8 — closeout evidence gate (2026-11-09)

**Status: OPEN; progress 5/8.** This is an inventory-to-evidence reconciliation, modelled on Combat's closeout gate, not a declaration of completion. Source: `docs/campaign-cases-batch-1.md`, `docs/subsystem-plan.md`, `docs/live-batch-pr212-20261108.md`, `docs/live-batch-20261109.md`, `HANDOFF.md`. Campaign permissions are an application/security contract, not a Core combat rule.

| Area | Required evidence | Current evidence / disposition |
|---|---|---|
| Creation, join, invites | Automated permission tests; GM and player live join/reload; old code rejected after rotation | Join sampled live; **New code blocked** by absent production RPCs pending migration install and retry |
| Roles and continuity | GM Remove / Make GM, character retained on removal, new GM Tools, old GM becomes player, Delete confirmations | **Blocked** in production pending continuity RPC migration and signed-in retest |
| Character ownership and RLS | Direct A/B/C/D account matrix; outsider denied private data; GM scoped inventory only | Database permission tests in CI. **D-S5 accepted (owner, 2026-11-10):** those tests are the evidence for the direct-access steps; the app-level outsider and A/B/C/D checks remain for Work |
| Conflicting saves | Two sessions editing same character; stale save warns/reloads without overwriting | Implemented in code; two-account live conflict **unaccepted** |
| GM gifts and inventory | Gift arrives, persists after reload, no unrelated edit permission | Earlier scoped item/reload acceptance; fresh two-account gifts and new-item pop-up **unaccepted** |
| Display names (D-S3) | Signed-in outsider sees display name only; no email, membership, private fields | Migration/grants reported verified; full outsider privacy test **unaccepted** |
| Party Board, notes, backup | GM/player visibility; notes Saved; download and restore validation | Notes Saved/player view sampled; complete role/backup workflow **unaccepted** |
| Navigation and session | Header every route/phone, sign-in/out, campaign manager roles | Some header and sign-out samples pass; full route matrix **unaccepted** |

## Closeout procedure

1. Verify the production migration pre-check/install/post-check from `docs/server-install-20261109.md`, with no credentials in logs. Re-run New code, Remove and Make GM as GM and confirm each outcome.
2. Execute the signed-in A/B/C/D matrix in `docs/campaign-cases-batch-1.md` against the deployed revision. Include conflict warning, gifts, pop-up, outsider read denials and backup.
3. Reconcile each applicable case ID to **pass / explicitly GM-assisted / blocked / fail / excluded** and link the specific automated test and dated live evidence. A UI observation alone cannot certify RLS.
4. Confirm no P0/P1 failures or undocumented exclusions, then update `docs/subsystem-plan.md` to 6/8 only after the gate is satisfied. Never close on implementation claims alone.

**No closeout awarded in this document.**