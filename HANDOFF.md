# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md`).

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item. Branch: claude/happy-brahmagupta-votbg4.

_Last updated: 2026-11-08 by Claude (Subsystem 8 D-S1, D-S2, D-S4 implemented)_

## Where things stand

- **Progress 5/8** (`docs/subsystem-plan.md`). Subsystems 1–5 closed; Main Play Mode Combat stays CLOSED. Next audits when the owner resumes them: 6 Magic (low priority), 7 Creatures, 8 Campaign/multi-account (D-S1/D-S2/D-S4 implemented; live check and D-S3 option A implementation remain).
- **Play Mode:** v0 "Stone & Verdigris" look, nine colour schemes (`play-stone.css`), item search, Core-only traits. Nothing waiting on a live check.
- **Home and menus:** owner's redesign handoff Part A done (#197–#201): shared page header, phone tab bar and More sheet, sign-in gates, Home Continue card and character cards, Characters search/sort/Undo delete, Campaign cards and Join with a code, The Pits lobby, Rules table of contents, World Guide chips, Account tabs and profile. Styles in `sitota-menus.css`; tests in `tests/site-menus.cjs`.
- **The Pits** (`experiments/practice-combat.html`, route `#/the-pits`):
  - Rules from ChatGPT's reviews implemented through #191: parry rounding (blocked half rounds up), Knockback, Impale, Barbed, Reach, Entangle (original-roll Trip), Entrapping, Disarm STR limit, Acrobatics vs Trip, concurrent tied Initiative, shield strikes and shield Bash. Ledger: `docs/the-pits-combat-procedure-review.md`.
  - v0 fight screen done (#193–#195, fixes #202): Stone look, view adapter `experiments/pits-view.js`, game layer `experiments/pits-game.js` (Glory, Momentum, Marks: presentation only, never rules).
  - **Melee only (owner, 2026-11-07).** All 35 Core melee weapons and 8 shields playable; saved characters can use any weapon their style trains, carried or not (#205). Ranged was built and removed (#206 reverted); its spec `docs/the-pits-ranged-cases.md` is shelved. Lance and Garrotte unsupported.

## Next

- **Owner (first):** run `supabase/migrations/20261108120000_campaign_continuity_and_save_conflicts.sql` once in the Supabase SQL editor (safe to re-run). It adds character revisions and the GM actions for D-S1, D-S2, D-S4 (implemented in the Subsystem 8 PR; see `CHANGELOG.md`). Until it runs, the app behaves as before and the new GM buttons say the server needs the update.
- **ChatGPT (Work), migration/live batch:** owner confirms migration run; attempted batch recorded in `docs/live-batch-pr209-20261107.md`. Multi-account steps 1–10, new-item pop-up and signed-in checks BLOCKED (manual disposable signup); phone/audio unavailable. Standalone Pits partial: initiative strip actor/AP metadata needs Claude review; terminal recap still outstanding. No fixtures created; sound restored off. Progress 5/8.
- **Owner decided D-S3: option A (2026-11-07).** Any signed-in user can see other users' display names, including outside shared campaigns; do not expose emails or private data. **Claude implementation pending:** restrict read surface to display names, preserve write/RLS boundaries, test signed-in nonmembers and signed-out denial, then live-check. Other subsystems: 6 Magic (prioritized backlog drafted), 7 Creatures (case inventory drafted).
- **ChatGPT (Chat):** Prepared Subsystem 7 Core creature cases (`docs/creature-cases-batch-1.md`), Subsystem 6 priority backlog (`docs/magic-prioritized-build-spec.md`), and owner-approved D-S3 option A (`docs/decisions.md`) in docs-only PR #210. Claude can review/merge docs once credits return; D-S3 production implementation and live check still pending. No audit closeout; 5/8.
- **Claude:** queued for The Pits only if the owner asks: Unarmed (44 cases in the ledger, PIT-SE03); split `experiments/practice-combat.html`'s very long lines when next touching it.
- **ChatGPT (Work), one batched live check when the owner has credits** (only what Claude can't test headless):
  - Signed in: Play Mode item search (add a sword free, it attacks; paid rope −10 silver; mail location +5 ENC; reload keeps all); builder offers only the 26 Core traits. Use a disposable character and delete it afterwards.
  - The Pits after #202: Basalt setup readable; pill / Last roll / end recap follow the dice; a settled Opponent pill; audible sound if possible.
  - Menus signed in and out on a real phone if possible: tab bar, More sheet, gates, Undo delete (disposable character), Join with a code.
  - Earlier blocked items: new-item pop-up (needs a second player account); fold it into the Subsystem 8 multi-account check.
- **Owner:** turn on Settings → General → "Allow auto-merge". Later: D-S3 (display names), D-4 and D-5 (Magic, low priority).

## Notes

- The owner uploads the Core rulebook (and the Companion) to Claude sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
