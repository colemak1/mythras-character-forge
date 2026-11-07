# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md`).

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item. Branch: claude/deployment-issues-delays-tvolc7.

_Last updated: 2026-11-07 by Claude (credit-saving rules; handoff trimmed)_

## Where things stand

- **Progress 5/8** (`docs/subsystem-plan.md`). Subsystems 1–5 closed; Main Play Mode Combat stays CLOSED. Next audits when the owner resumes them: 6 Magic (low priority), 7 Creatures, 8 Campaign/multi-account (critical items done).
- **Play Mode:** v0 "Stone & Verdigris" look, nine colour schemes (`play-stone.css`), item search, Core-only traits. Nothing waiting on a live check.
- **Home and menus:** owner's redesign handoff Part A done (#197–#201): shared page header, phone tab bar and More sheet, sign-in gates, Home Continue card and character cards, Characters search/sort/Undo delete, Campaign cards and Join with a code, The Pits lobby, Rules table of contents, World Guide chips, Account tabs and profile. Styles in `sitota-menus.css`; tests in `tests/site-menus.cjs`.
- **The Pits** (`experiments/practice-combat.html`, route `#/the-pits`):
  - Rules from ChatGPT's reviews implemented through #191: parry rounding (blocked half rounds up), Knockback, Impale, Barbed, Reach, Entangle (original-roll Trip), Entrapping, Disarm STR limit, Acrobatics vs Trip, concurrent tied Initiative, shield strikes and shield Bash. Ledger: `docs/the-pits-combat-procedure-review.md`.
  - v0 fight screen done (#193–#195, fixes #202): Stone look, view adapter `experiments/pits-view.js`, game layer `experiments/pits-game.js` (Glory, Momentum, Marks: presentation only, never rules).
  - **Weapons: 43 of 64 Core weapons playable** (all melee and shields). Missing: 19 ranged/thrown, Lance (mounted), Garrotte (ambush).

## Next

- **ChatGPT (Chat):** Ranged Core code cases `PIT-R01–R17` and deferred Lance/Garrotte minima documented in `docs/the-pits-ranged-cases.md` (docs-only PR). **Claude next:** implement ranged in one code PR; leave Lance and Garrotte unsupported until mounted/ambush scenarios are approved.
- **Claude:** then implement ranged combat (one PR), Lance and Garrotte if in scope. Also queued: Unarmed in The Pits (44 cases already in the ledger, PIT-SE03); split `experiments/practice-combat.html`'s very long lines when next touching it.
- **ChatGPT (Work), one batched live check when the owner has credits** (only what Claude can't test headless):
  - Signed in: Play Mode item search (add a sword free, it attacks; paid rope −10 silver; mail location +5 ENC; reload keeps all); builder offers only the 26 Core traits. Use a disposable character and delete it afterwards.
  - The Pits after #202: Basalt setup readable; pill / Last roll / end recap follow the dice; a settled Opponent pill; audible sound if possible.
  - Menus signed in and out on a real phone if possible: tab bar, More sheet, gates, Undo delete (disposable character), Join with a code.
  - Earlier blocked items: multi-account permission check (plan at the end of `campaign-cases-batch-1.md`); new-item pop-up (needs a second player account).
- **Owner:** turn on Settings → General → "Allow auto-merge". Later: decisions D-S1 to D-S4 (Subsystem 8), D-4 and D-5 (Magic, low priority).

## Notes

- The owner uploads the Core rulebook (and the Companion) to Claude sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
