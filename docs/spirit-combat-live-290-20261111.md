# Spirit Combat and invoking guard — live check, 2026-11-11

**PASS — no failures or severity findings in the requested batch.** Tested the deployed site signed in as Test Account B, after #290's Pages run 43066306979 completed successfully at merge `401cf3ad8cb308035133ebcf3633603e273011fd`. Tests run 43066308385 also passed. Acceptance criteria: HANDOFF Next item 2; this is live acceptance, not a fresh rulebook audit.

One disposable Human, **Spirit Guard Audit 290**: Binding 60%, Willpower 51%, Invocation 51%, Shaping 49%, 11 MP; Audit Ward with Duration 1 (2 turns, 2 MP). A second castable spell was added for the other-spell check.

| Check | Result | Severity |
|---|---|---|
| AN-F06: Begin versus Shade, Spectral Combat 50%, MP 6; your attack versus GM d100 95 | PASS. Binding roll 54 succeeded; 1d6 rolled 5, Shade 6→1 MP. All locations retained full HP. | None |
| AN-F07: effects belong to the winning side and situation | PASS. Mortal offensive choices were Compel Bargain, Drive Off, Psychic Stun, Restrain, Spirit Lance, Suppress Ability. A defensive critical offered its different set, including Obscure and Turn Back. Spirit offensive success offered Compel Bargain, Psychic Stun, Spirit Lance; Possess was absent without permission. No physical effects appeared. Psychic Stun and Obscure selections were logged for GM handling. | None |
| Incoming attacks with GM d100 10 | PASS. Parried attacks caused no drain; roll 75 failed against Shade's success, and 1d6 rolled 6, reducing your MP 11→5. HP remained Head 5/5, Chest 7/7, Abdomen 6/6, arms 4/4, legs 5/5. | None |
| Zero MP and GM outcome | PASS. Your later success drained Shade to 0; helpless state replaced attack controls. Record without the GM tick did not resolve it. Selecting Driven off and ticking GM decided recorded the outcome; helpless state and decision survived reload from the account copy after saving. End Spirit Combat cleared the encounter. | None |
| SO-C02: invoking restrictions | PASS. At turn 1/2, Perception, Unarmed Attack, and casting the other spell were refused with the Core p.119 message. The pending spell and MP were unchanged. | None |
| Evade, final Grade and reload | PASS. Evade rolled (66, failure) and exposed GM: final roll. Selected 1 Grade harder; reload retained the selection and turn 1/2. Completing Audit Ward rolled Invocation (Hard) 34% from 51%, roll 08, success; MP 11→9 exactly once. | None |
| Cancel and charges | PASS. Started Audit Ward again, checked other-spell refusal, then cancelled. MP stayed 9/11; reload retained 9/11 and no pending cast. | None |

An immediate reload before an autosave completed produced the existing unconfirmed-local-draft warning. The persistence checks above used the account copy after saving; no data-loss finding is inferred from discarding an explicitly unconfirmed draft.

**Cleanup:** deleted the disposable character, allowed the Undo period to finish, then reloaded: Test Account B showed **0 saved characters**. Creation Audit and Magic Audit were untouched. No campaigns were created.

**Status unchanged:** session readiness **13/14**; feature completeness **8/8 built, 8 closed**. Next: Claude merges this docs-only report once Tests passes and moves AN-F06/F07 and SO-C02 out of Known limits. Owner's two-device check remains.
