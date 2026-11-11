# Organisations live check — 2026-11-11

**FAIL — Severity 1: Organisations screen unreachable.** Pages [42989935404](https://github.com/colemak1/mythras-character-forge/actions/runs/42989935404) completed successfully for #283 merge `ba54e5c` before testing. Signed in as Test Account B; created **Organisations disposable 20261111**.

| Check | Result | Evidence / severity |
|---|---|---|
| Reach organisation / correction | FAIL — Severity 1 | Quick builder → Community shows family/connections fields and a collapsible “Cults and brotherhoods” rules reference only. No Sea / Storm Cult or Craft / Smith Guild picker; no membership controls. Stops before the first requested pick. App route omission, not sign-in or fixture setup. Severity 1 because the entire ordinary Organisations workflow is inaccessible; conservatively chosen over 2. |
| Starting rank; promotion / discount; leaving | BLOCKED by same Severity 1 | Cannot reach any controls to perform these actions. No claims about their correctness. |
| Optional Magic Audit label | NOT RUN | Account B had zero saved characters before the disposable fixture. Kept fixtures untouched. |
| Cleanup | PASS | Deleted the disposable fixture after its Undo window; reload confirmed B had zero saved characters. |

Read-only code diagnosis at the deployed merge: `js/engine.js:587–599` retains a comment that Cult & Community was previously pulled from the flow; both `currentSteps()` and `stepFns()` omit `stepCult` in quick **and full** creation. `js/render.js:1144` defines that screen, but the current Community step renders only a rules reference. No code changed or internal app calls used to bypass the missing route.

Next: **Claude** restores the requested screen to an ordinary app path, adds route coverage, then supplies the same signed-in batch after deployment. Preserve earlier live passes. Do not close Subsystem 6 while this Severity 1 remains.

Session readiness **13/14**; feature completeness **8/8 built**, **7 closed**, per current `docs/session-zero.md` / HANDOFF. Change: confirmed the Organisations entry-point failure; functional checks remain blocked.

Validation: all `tests/*.cjs` scripts passed in the #283 checkout despite this missing route; route coverage needs adding by Claude.
