# Organisations live recheck — 2026-11-11

Pages [42995176575](https://github.com/colemak1/mythras-character-forge/actions/runs/42995176575) completed/success for #285 merge `0a52b37` before testing. Signed in as Test Account B; disposable **Organisations recheck 20261111**.

| Check | Result | Evidence / severity |
|---|---|---|
| Entry point (#284 Severity 1) | PASS | Full creation lists Community → Cult → Passions. In quick creation, Community → Next opens Cult & Community and its archetypes. The missing-route failure is resolved. |
| Same-day correction | FAIL — Severity 2, display/acceptance mismatch | Sea / Storm → Craft / Smith caused no prompt and retained no Sea / Storm or Former record. However, contrary to HANDOFF’s “no Membership history appears,” the Membership history heading and Log (1) remain, containing only “Joined Craft / Smith Guild at Associate.” Workable; no data loss or false departure. Claude/owner should confirm whether this current join log is intended. |
| Starting rank | PASS | Guild titles used: Associate/Common, Journeyman/Proven (equivalent tiers to Lay Member/Acolyte). Cancel kept Associate; OK set Journeyman with “GM-approved veteran starting rank.” Reset to Associate. |
| Promotion and training | PASS | Promote refused at 0 of 5 cult skills at 50%. Raised and marked Athletics, Boating, Brawn, Dance and Endurance at 51%; rank stayed Associate and Promote without GM tick refused. With tick: Apprentice/Dedicated, years 0, locked rank picker. Promotion log survived reload. Mentor panel showed 25% off training price only; five skills stayed 51%, guild Devotion stayed 36%. |
| Leaving | PASS | Years set to 1; Leave asked for confirmation. After approval and reload: Former Craft / Smith Guild, Apprentice, dated 2026-11-11. Devotion (Craft / Smith Guild) remained 36%; mentor discount line disappeared. |
| Optional retained fixtures | NOT RUN | B had zero characters before creation, so no Magic Audit or pre-fix mid-creation save available. Existing known limits preserved; kept fixtures untouched. |
| Cleanup | PASS | Deleted disposable fixture after Undo window; reload confirmed zero saved characters on B. |

**No remaining Severity 1 observed; one Severity 2 wording/display discrepancy above.** No new sourcebook ruling. Subsystem 6 remains open pending Claude’s disposition/close; Work does not change close status.

Session readiness **13/14**; feature completeness **8/8 built**, **7 closed**, per current `docs/session-zero.md` / HANDOFF. Change: restored route and main membership workflows passed live; literal correction-history expectation did not.

Validation: all `tests/*.cjs` completed with no failures.
