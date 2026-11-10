# Session Zero live batch — 2026-11-10

Scope: HANDOFF Next 3 from PR #271 (`ab3cb62`), used as instructed while that PR was still open. Deployed site, secure sign-in verified as Test Account B; B acted as GM of a new disposable campaign. Synthetic stat block, not a sourcebook rules audit.

| Check | Result | Evidence / limit |
|---|---|---|
| Item 9: add NPC and creatures; location and armour | PASS | NPC card drew. How many 3 created three creature cards. d20 9 identified Abdomen, armour 2; rolled damage 3 became 1 after armour. |
| Item 10: Rabble | PASS | All three set to Rabble, HP 5. One 1-point injury produced fled and “1 down — the rest flee.” |
| Item 10: Underlings | PASS | Four added and set to Underling. First withdrew after two 1-point injuries. Hurting a second displayed “2 down — the rest withdraw”; its second injury also changed its own status to withdrawing. |
| Tracker: shared Intimidate Critical | PASS | Critical for Test Hero on one creature appeared as “ignores it” on another of the same group. |
| Item 2: GM approval and player-facing import | PASS, scoped | GM permitted a sapient creature and copied its block. Concept import accepted it with approval. Same B account used both interfaces; no independent player/GM account claim. |
| Item 2: INT 7 | PASS | Modified entry refused with the INT 8 minimum message. |
| Item 2: Points Build and reload | PASS, scoped | Pool 74 fully allocated: STR/CON/SIZ/DEX 10, INT 11, POW 12, CHA 11. Creature species, dice/ranges (INT 8–18), Move 6 and seven entry hit-location rows remained after reload of the saved draft. |
| Item 2: full culture/career build | BLOCKED — Severity 3 | Stopped at **step 4, Culture → Allocate 100 cultural points**, after selecting Civilised and Commerce/Courtesy/Streetwise, before entering Career. Browser-filled boxes displayed 10 each, but the total stayed 50/100 and Next stayed disabled; the typed name also failed to persist. **Classification: browser/setup-limited, root cause unresolved** between browser input delivery and app event handling. Sign-in and fixture worked; controls were present, so no missing-control finding or confirmed app bug. Claude should fix it if reproduced as an app bug; no completed culture/career build claimed. |
| Item 14: retained restored copy, missing HP 0 / 0 | BLOCKED — Severity 3 | **Cause: fixture deleted in the earlier cleanup**, not a restore failure or sign-in failure. PR #270 records deletion of all four disposable campaigns and zero campaigns/characters for both B and C; this batch independently saw B’s empty campaign list. The older HANDOFF instruction to use a retained copy was stale. The fixture had previously existed under C as GM, but was subsequently deleted; switching accounts would not recover it. No replacement round trip attempted and no prior pass revoked. |

No confirmed Severity 1 or 2 failures. Creature-entry preview initially stayed disabled until the independent NPC add refreshed the tracker; input-commit limitation is included in the single Severity 3 entry above, not a separate bug claim.

Cleanup: this batch's campaign and sole creature draft deleted; campaign list empty afterwards; signed out. Creation Audit and Magic Audit untouched.

**Count sources:** “9/14 ready; 7/8 built” comes from `docs/session-zero.md`, Progress, on PR #271’s `claude/session-zero-workflow` branch (`ab3cb62`), not from the official subsystem close count. `docs/subsystem-plan.md` on main still records **5/8 closed**; this report does not advance it. New evidence: tracker items 9/10 passed; item 2 partial live pass; item 14 not exercised in this batch. **Next: ChatGPT (Chat)** does the Subsystem 7 closeout; Claude fixes any blocker established to be an app bug. No repeated Work batch for these blocked checks.
