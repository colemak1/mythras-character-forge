# Sorcery / Theism learning live check — 2026-11-11

Pages deployment [42973332884](https://github.com/colemak1/mythras-character-forge/actions/runs/42973332884) completed successfully for #281 merge `b79ee44` before testing. Test Account B, disposable **Learning disposable 20261110**: Invocation 51%, Shaping 48%, Devotion (Sun) 30%, Exhort 38%, Sun Initiate pool 3. Learning began with 6 banked Experience Rolls.

| Check | Result | Evidence / severity |
|---|---|---|
| Reference-only spell | PASS | Wrack displayed REFERENCE ONLY; cast refused and asked for learning first. |
| Learn spell | PASS | No source refused; source without GM tick refused. With source “Sun school grimoire” and GM tick: 5 rolls charged, 6→1. Learned date/source and Experience Roll history survived reload. Cast then succeeded: Invocation 45 vs 51%, 1 MP spent (15→14). |
| Starting miracles | PASS | Two Initiate miracles set to Starting without prompts. Third prompted; Cancel left acquisition unchosen on returning to Magic. OK kept it; “GM approved” persisted after reload. A fourth, Acolyte-level miracle was refused at Initiate and stayed unchosen. Test names were placeholders, not a sourcebook catalogue. |
| Old-character compatibility | BLOCKED | **Severity 3, setup/access**: Magic Audit was absent on B (zero characters before fixture creation). Recovery sign-in briefly opened A; automatic approval review rejected inspecting its private character list because it was the wrong account for this test. No audit character was opened, changed or cast. Owner can verify the legacy label on the account retaining Magic Audit. |
| Cleanup | PASS | Disposable fixture deleted after the Undo window; reload confirmed B had zero saved characters. Creation Audit and Magic Audit untouched. |

**No confirmed app failures.** The report preserves the legacy compatibility limit; it does not claim that check passed. Scope: requested spell learning and starting-miracle workflows only; no independent rulebook audit.

Session readiness **13/14**; feature completeness **7/8 built**, 7 closed (current `docs/session-zero.md` / HANDOFF). Change: new learning and allowance workflows passed live. Next: Claude continues Organisations and records the Severity 3 legacy limit.

Validation: every `tests/*.cjs` script passed in the #281 checkout; no production code changed.
