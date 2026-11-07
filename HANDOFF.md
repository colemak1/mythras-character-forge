# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md`).

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item. Branch: claude/happy-brahmagupta-votbg4.

_Last updated: 2026-11-07 by Claude (Subsystem 8 decisions D-S1, D-S2, D-S4 answered)_

## Where things stand

- **Progress 5/8** (`docs/subsystem-plan.md`). Subsystems 1–5 closed; Main Play Mode Combat stays CLOSED. Next audits when the owner resumes them: 6 Magic (low priority), 7 Creatures, 8 Campaign/multi-account (critical items done).
- **Play Mode:** v0 "Stone & Verdigris" look, nine colour schemes (`play-stone.css`), item search, Core-only traits. Nothing waiting on a live check.
- **Home and menus:** owner's redesign handoff Part A done (#197–#201): shared page header, phone tab bar and More sheet, sign-in gates, Home Continue card and character cards, Characters search/sort/Undo delete, Campaign cards and Join with a code, The Pits lobby, Rules table of contents, World Guide chips, Account tabs and profile. Styles in `sitota-menus.css`; tests in `tests/site-menus.cjs`.
- **The Pits** (`experiments/practice-combat.html`, route `#/the-pits`):
  - Rules from ChatGPT's reviews implemented through #191: parry rounding (blocked half rounds up), Knockback, Impale, Barbed, Reach, Entangle (original-roll Trip), Entrapping, Disarm STR limit, Acrobatics vs Trip, concurrent tied Initiative, shield strikes and shield Bash. Ledger: `docs/the-pits-combat-procedure-review.md`.
  - v0 fight screen done (#193–#195, fixes #202): Stone look, view adapter `experiments/pits-view.js`, game layer `experiments/pits-game.js` (Glory, Momentum, Marks: presentation only, never rules).
  - **Melee only (owner, 2026-11-07).** All 35 Core melee weapons and 8 shields playable; saved characters can use any weapon their style trains, carried or not (#205). Ranged was built and removed (#206 reverted); its spec `docs/the-pits-ranged-cases.md` is shelved. Lance and Garrotte unsupported.

## Next

- **Claude (next, fresh session): Subsystem 8 Campaign**, one PR. The owner answered D-S1, D-S2 and D-S4 (see `decisions.md`, 2026-11-07):
  - D-S1: GM "New code" button that replaces the invite code (old code and `#/join/` link stop working); members still see the code.
  - D-S2: warn and reload. A save checks whether the character changed on the server since it was opened (e.g. an `updated_at`/version check); if so, it doesn't overwrite, warns, and offers to reload. Covers GM inventory edits vs an open player sheet, and two tabs.
  - D-S4: GM can remove a member, transfer the GM role to a member, and download the whole campaign as a backup file.
  - Needs a new migration in `supabase/migrations/` (RLS/RPC for code rotation, removal, transfer, version check); the owner must run it on the live project. Tests in the `campaign-*.cjs` style. Then ChatGPT (Work) runs the multi-account live check at the end of `campaign-cases-batch-1.md`.
  - Still open for the owner: D-S3 (any signed-in user can see display names). Other subsystems: 6 Magic (partial; gaps in `magic-subsystem-cases.md`), 7 Creatures (needs a ChatGPT (Chat) case inventory first).
- **Claude:** queued for The Pits only if the owner asks: Unarmed (44 cases in the ledger, PIT-SE03); split `experiments/practice-combat.html`'s very long lines when next touching it.
- **ChatGPT (Work), one batched live check when the owner has credits** (only what Claude can't test headless):
  - Signed in: Play Mode item search (add a sword free, it attacks; paid rope −10 silver; mail location +5 ENC; reload keeps all); builder offers only the 26 Core traits. Use a disposable character and delete it afterwards.
  - The Pits after #202: Basalt setup readable; pill / Last roll / end recap follow the dice; a settled Opponent pill; audible sound if possible.
  - Menus signed in and out on a real phone if possible: tab bar, More sheet, gates, Undo delete (disposable character), Join with a code.
  - Earlier blocked items: multi-account permission check (plan at the end of `campaign-cases-batch-1.md`); new-item pop-up (needs a second player account).
- **Owner:** turn on Settings → General → "Allow auto-merge". Run the Subsystem 8 migration once Claude's PR merges. Later: D-S3 (display names), D-4 and D-5 (Magic, low priority).

## Notes

- The owner uploads the Core rulebook (and the Companion) to Claude sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
