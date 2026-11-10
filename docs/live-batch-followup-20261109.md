# Live batch follow-up — 2026-11-09

Progress remains **5/8**. Main Play Mode Combat stays CLOSED. Partial acceptance only; blocked checks are not passes.

## Scope and environment

Read AGENTS.md and HANDOFF.md first, then docs/server-install-20261109.md and docs/live-batch-20261109.md. This file records this follow-up without changing the earlier evidence. Chrome extension browser, initially signed out; no available signed-in GM/player session or supplied credentials. No credentials, tokens, invite codes or private account identifiers recorded. No production code edits.

PR #243 is merged (merge commit 30a887217b4ff7a745096f2889539deae6d09cc1). Main advanced to #245 during this batch; checkout 730ac61218fc10a65a06e7689fbec246a2d929b9. The loaded main page's combat-rules.js stamp ae609fd04d and play.js stamp 3313d6c8df match that checkout. This is a post-#243 smoke check, not an isolated comparison of #243 against its parent. No live rulebook adjudication was performed.

## 1. Production campaign migration

Production project: Mythras Forge. Read-only schema inspection: RLS enabled on all listed public tables.

| Step | Result | Evidence |
|---|---|---|
| Pre-check | PASS | campaign_members_pkey is PRIMARY KEY (campaign_id, user_id). |
| Install whole confirmed migration | **blocked** | Supabase apply_migration returned: "This confirmation expired after 2 minutes. Call `apply_migration` again to get a new confirmation." No successful installation attributed to this session. No alternate SQL write used to bypass the confirmation. |
| Current RPC verification | PASS | rotate_campaign_invite(p_campaign uuid), dm_remove_member(p_campaign uuid, p_user uuid), dm_transfer_campaign(p_campaign uuid, p_user uuid) all exist. Each has authenticated_can_run=true and anon_can_run=false. |
| Revision column | PASS | Separate read-only query returned characters.revision. |
| Revision trigger | PASS | Query returned characters_bump_revision on public.characters. |
| New code as GM, old invite rejected | **blocked** | Browser signed out; no GM session. |
| Remove as GM; character retained/unassigned | **blocked** | Browser signed out; no GM/player session. |
| Make GM; new GM tools and old GM player view | **blocked** | Browser signed out; no GM/player session. |

The functions and revision column were already visible in the pre-install schema/advisor observations. Therefore the old absent-function diagnosis is stale for the current database; the current state meets the requested presence/grant/trigger checks. This does not establish who installed it, complete definition parity, API cache visibility, or successful live execution.

Pre-change advisors: health empty; security reported seven authenticated SECURITY DEFINER endpoints (including the three continuity RPCs and inventory/join RPCs) and disabled leaked-password protection. The confirmed SQL explicitly checks auth.uid() and GM ownership, fixes search_path, and revokes anonymous/PUBLIC access; the advisor is not proof that those endpoints allow unauthorized actions. Performance reported five unindexed foreign keys and three groups of multiple permissive SELECT policies. No advisor remediation or unrelated settings changed. Logs inspected as counts by source only, without exporting event content.

Advisor references: [function execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).

## 2. Remaining live-batch checks

| Journey | Result / limit |
|---|---|
| Creature tracker: body-plan HP, add creature, hit location, damage after armour, traits and Chaos Feature | **blocked** — signed-out browser; fixed form persistence not reaccepted. |
| GM-approved sapient stat block, seven characteristic dice and Move; copy with permission | **blocked** — no GM session. |
| Player Concept import, approval, Points Build pool, culture/career, save/reload species/ranges/anatomy | **blocked** — no player session. |
| INT 7 / INS refusal; GM-resolved Ability/Poison/Magic/Weapon effect lines | **blocked** — tracker/builder path unavailable without sign-in. |
| Campaign manager as GM: New code/Remove/Make GM/Delete confirmations, notes Saved | **blocked** — no GM session; earlier report's scoped passes are unchanged. |
| Campaign manager as player: restrictions and read-only notes | **blocked** — no player session; earlier evidence not relabelled as a new pass. |
| Character sheet, Builder, Play Mode and campaign/Party Board deep-route headers | **blocked** — authenticated routes unavailable. |
| Play Mode page scrolling | **blocked** — no saved-character session. |
| Full every-route header acceptance | **blocked** — public routes sampled below; authenticated route families and every Rules chapter were not covered. |

### Public header and phone-width checks

At 1280×900, shared brand/header and six desktop navigation links were present on Characters, Campaign, The Pits lobby, Rules index, World Guide welcome and Account; Home was observed at the original desktop size. The standalone Pits page retained the desktop header through all three fights. Character/Campaign routes showed their sign-in gates.

At 390×844, shared brand/account header and bottom navigation were present on Home, Characters gate, Campaign gate, Pits lobby, Rules index, Rules Combat chapter, World Guide welcome and Account. All six World Guide destinations were traversed at this width: welcome, places, cultures, faith, history, names; each retained the header.

**PASS:** More opens with Rules/World Guide/Account links; Escape removes the More dialog.

**FAIL:** selecting Rules from More navigates to #/wiki but leaves the More dialog open over it. A separate settled observation still counted one More dialog. After Escape, opening More and selecting World Guide reproduced it at #/world/welcome. Expected: dismiss after choosing a destination. This is an observed live issue, not proven introduced by #243.

A final attempt to inspect standalone Pits at phone width timed out (MCP request timed out); **blocked**. Temporary viewport had been reset before that attempt; final viewport state after the timed-out operation was not observed. These are desktop responsive checks, not real-phone or audio acceptance.

## 3. Post-#243 combat smoke checks

Three separate Normal Gauntlet runs reached Victory, each against a generated Border Deserter. Every player dice roll was initiated through the visible roll control. Show results was used to advance presentation; normal opponent automation was retained. No dice/state injection.

| Bout | Equipment | Observed journey | Terminal result |
|---|---|---|---|
| 1 | Broadsword + Heater | Initiative; failed and successful shield parries; attack; named hit-location and damage rolls; Impale damage A/B choice, lodged weapon, keep hold and withdrawal; Compel Surrender | Victory, round 2 cycle 2, concession, streak 1. |
| 2 | Shortspear, no shield | Long reach; opponent closing; Intercept; cramped attacks; weapon parry disabled inside reach; critical attack earning two effects; Maximise Damage + Impale; damage choice, lodged weapon, withdrawal, Endurance; Compel Surrender | Victory, round 2 cycle 3, concession, streak 1. |
| 3 | Whip, no shield | Initiative, attacks and opponent Evade; named hit location/damage; range closed; critical attack earning two effects; Entangle selected, then Maximise Damage; serious left-arm wound; Compel Surrender | Victory, round 2 cycle 1, concession, streak 1. |

Entangle selection and the subsequent wound were observed; a complete break-free/opposed Trip cycle was not independently checked. All three result dialogs identified concession rather than inventing a finishing wound. View battlefield and Finish Run returned the first two runs to the lobby; the third also reached Finish Run and the public Home page. Only browser-local Guest gauntlet records were created; no cloud fixtures or real characters were edited.

**Additional observations for Claude:**

1. Starting the shortspear bout after finishing the shield run retained Last roll from the previous fight: Border Deserter Resist surrender 26 against 51% — Success. It remained visible during the new bout's range-change/first-action views. Expected: reset last-roll display between separate runs. Not proven introduced by #243.
2. Impale damage-choice and keep-hold/leave-in panels show generic Attack/Delay advice instead of guidance for the active decision. In the cramped shortspear case, they instead show range-opening/cramped-attack advice. The actual Impale controls worked; the explanation is mismatched.
3. A serious-wound Endurance outcome in the shortspear bout coexisted with the previous "Border Deserter misses" Last exchange headline. This may be a stale exchange-summary issue; reproduce before classifying it as a new regression.

No definitive rules regression isolated from #243. Three completed bouts are a smoke pass, not proof that all pre-refactor behaviour is identical. Current golden tests provide separate automated evidence.

| Remaining combat request | Status |
|---|---|
| Fourth bout from a saved character | **blocked** — signed out. |
| Play Mode attack, parry, damage and a Special Effect | **blocked** — signed out. |
| #245 additions in the latest handoff (65% Hard, firearm eligibility, creature locations, Hurt while casting) | **blocked** for live acceptance — no saved-character session; not silently included in this smoke pass. |

Victory evidence: [whip bout screenshot](live-batch-followup-20261109-victory.png).

## 4. Two-account checks

| Check | Result |
|---|---|
| Save-conflict warning after competing saves | **blocked** — no authenticated character session; not simulated through admin SQL. |
| GM gift and recipient inventory persistence | **blocked** — no GM/player sessions. |
| New-item pop-up while player is active | **blocked** — no concurrent independent GM/player sessions. |

No test accounts, credentials, passwords or sessions were created, reset, read from storage or printed. No live UI/backend permissions pass inferred from administrator access.

## Validation and handoff

All **50** tests/*.cjs scripts passed (zero nonzero exit codes) in the LF checkout after the documentation edits. This is local automated evidence, not a live permission pass. The separate database suite was not rerun: no migration source file changed. No migration file, production code, tests or CHANGELOG changed.

Next Claude: reproduce/fix the mobile More dismissal and Pits display issues in one code batch, then review this docs-only PR. Next signed-in Work batch: retry all three campaign actions and finish the explicitly blocked creature, saved-character, Play Mode and two-account checks. Do not reinstall solely because of the stale absent-function report; current schema/grants/trigger verification is above. No subsystem closure.

