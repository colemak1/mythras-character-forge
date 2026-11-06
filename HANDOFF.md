# Handoff

Read this at the start of every session and update it before ending one. Keep it short: replace finished items instead of appending history (history goes in `CHANGELOG.md`).

_Last updated by ChatGPT (Chat) — Subsystem 8 documentation handoff_

## Priorities

The owner has now directed work to **Subsystem 8: Campaign and live integration**, after Combat and Advancement mapping (PRs #121–127). This takes precedence over additional mapping work while the campaign safety audit is reviewed.

The owner deprioritized Magic on 2026-11-06: player-facing work comes first. Magic still gets done, later.

1. **Subsystem 8 — Campaign and live integration:** **183 app-contract acceptance cases** in `docs/campaign-cases-batch-1.md` (docs-only PR in review). First map/verify P0 **RLS and RPC deny cases, account isolation, ownership/association writes, save/reload durability, and GM access**; then Party Board, invites, imports and session-night integration. **OPEN.**
2. **Subsystem 4 — Advancement, hazards and recovery:** 216 source-verified cases, Core pp.68–85, in `docs/advancement-cases-batch-1.md`. Claude maps them and fixes player-facing gaps (Experience Rolls, skill improvement, training, ageing, Fatigue, healing). Hazards stay GM-assisted where sensible. **Open.**
3. **Subsystem 5 — Combat:** mapped (PR #121) and extended (PR #122). PR #121 live checks passed (PR #123). The six requested #121/#122 follow-up checks passed in the signed-in batch recorded below; broader closeout gaps remain. **Open.**
4. **Subsystem 6 — Magic (paused):** Folk catalogue accepted live after PR #118. Other items are deferred.

Practice Combat features remain paused. Progress **3/8**.

## In progress

| Task | Owner | Branch / PR | State |
|---|---|---|---|
| Campaign/live integration inventory (Subsystem 8) | ChatGPT (Chat) → Claude | `docs/subsystem-8-campaign-integration-cases-batch1` (docs-only PR) | **183 acceptance cases** across 10 sections filed; source is app code and current decisions. Claude to map statuses and check **server-side RLS/RPC policies** plus signed-in multi-account paths; no code edited by ChatGPT. |
| Advancement mapping / rulings | Claude / owner | Latest main | 216 cases mapped; owner rulings below remain. Preserve the latest Advancement priority and status table. |
| #121/#122 follow-up live evidence | Claude | Review this docs-only PR | All six requested checks passed on c32b05d: surprise/reset, groups, Club filtering, familiarity penalty/floor, Unarmed tools and armour deduction. |

## Waiting on someone

- **Claude:** review Subsystem 8 docs-only PR and map **all 183** cases. Start with P0 direct API/RLS tests for outsider reads, character owner writes, GM inventory-only/unassign RPCs and secret GM notes; validate save races and account-scoped recovery. Use separate production-code PRs for any fixes. Do not count source inventory as a pass.
- **ChatGPT (Work):** when implementation and server policies are ready, use disposable GM + 2 members + outsider accounts to test direct links, permissions, Party Board sync, invitations, assignments and immediate reload. Do not use real character data for destructive tests.
- Advancement rulings decided 2026-11-06 (trainer at exactly 20 uses 1d2; maiming HP lost rounds up) and implemented. Optional extras still open: 1d6+1 improvement option, Passion shift helper.
- **Owner:** confirm D-4 (round up specialist starting spells) and D-5 (casting interruptions left to the GM). Low priority while Magic is paused.
- **Claude:** review/merge this docs-only combat acceptance report after Tests passes; then continue the Advancement priority. No requested combat check remains blocked.

## Notes

- Subsystem 8 inventory is **application behavior**, not a rulebook chapter: only Core pp.72–73 are cited for campaign-characteristic improvement choices. Security expectations are not inferred from Mythras. App code review included `js/cloud.js`, `js/app.js`, `js/router.js`, `js/play.js` and `js/render.js`. Backend SQL/RLS was **not directly verified**. **No claims of live or CI success**. Open decisions: invite-code visibility/rotation, removing members/GM transfer, multi-tab conflict policy and campaign disaster-recovery exports. Documentation only; progress stays **3/8**.
- Latest signed-in batch: **Creation Audit — Human** (`71640fe7-6a99-4cbf-b0e4-a5045b70aab9`), Test Player. Initiative **2+9=11**; Surprised **8+(-1)=7**, bonus 10 lower, Attack disabled at 2/2 AP; New Round cleared surprise. Different d10 rolls mean the two totals need not differ by 10.
- Club **25 vs 35%** Success + Attack/No parry earned 1 SE: Bleed unchoosable, **Stun Location** selectable and recorded. Dagger Broadly similar: Audit Hunter **35→Hard 23%**; Warden Spear **20→20%**, preserving STR 12+DEX 8 floor. Unarmed **77 vs 20%** exposed Attack/Defence and opponent tools.
- Chest armour **AP 1** reduced **4 damage to 3 HP** (7→4/7). Restored full HP, no armour/weapons, **90 sp**, AP **2/2**, surprise false and initiative not rolled. Roll evidence retained. Details in `combat-cases-batch-1.md`; no new Serious/Major wound branch.
- All **19** local test files passed on tested reference **c32b05d**; whitespace check passed. Engine/play/app stamps **9288e5165c / 036cfa654b / 9b096d3ef1** matched that reference. Later main **fb3c2ef** fixes cosmetic unarmed formatting; that cosmetic fix was not retested live. No production code changed in this docs report.
- PR #121 live evidence (Creation Audit — Human, `71640fe7-…`): initiative 8+9=17, manual 6+9=15 kept by New Round; Brace and Parry 1 AP each; Audit Hunter 21 vs 35% + No parry → 1 Special Effect (Press Advantage); chest armour 2 turned 5 damage into 3. Fixture restored afterwards. Details in `combat-cases-batch-1.md`.
- The owner uploads the Core rulebook and the Mythras Companion to Claude sessions when needed. They are **never committed** to the repo, which is public. PDF page = printed page + 1 for the Core PDF.
- **Mythras Companion rules are optional** (owner, 2026-11-06): campaign-selectable options only, never mixed into Core behaviour.
- Retained live fixture **Magic Audit — Paired Skills** (`fe479efb-…`): Exhort 45%, Devotion 29%, Folk Magic 29%, MP 2/11, pool 5/6.
- ChatGPT (Work) can run the tests; ChatGPT (Chat) can't clone the repo, so CI is the test evidence for its PRs.
- See `AGENTS.md`, `docs/decisions.md` and `docs/folk-magic-catalogue-format.md`.
