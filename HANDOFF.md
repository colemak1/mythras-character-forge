# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md`).

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item. Branch: claude/gallant-hypatia-3el31w.

_Last updated: 2026-11-09 by Claude (#213 findings fixed; server check for the owner)_

## Where things stand

- **Progress 5/8** (`docs/subsystem-plan.md`). Subsystems 1–5 closed; Main Play Mode Combat stays CLOSED. Next audits when the owner resumes them: 6 Magic (low priority), 7 Creatures, 8 Campaign/multi-account (D-S1–D-S4 implemented; DB permission tests in CI; signed-in live check remains).
- **Play Mode:** v0 "Stone & Verdigris" look, nine colour schemes (`play-stone.css`), item search, Core-only traits. Nothing waiting on a live check.
- **Home and menus:** owner's redesign handoff Part A done (#197–#201): shared page header, phone tab bar and More sheet, sign-in gates, Home Continue card and character cards, Characters search/sort/Undo delete, Campaign cards and Join with a code, The Pits lobby, Rules table of contents, World Guide chips, Account tabs and profile. Styles in `sitota-menus.css`; tests in `tests/site-menus.cjs`.
- **The Pits** (`experiments/practice-combat.html`, route `#/the-pits`):
  - Rules from ChatGPT's reviews implemented through #191: parry rounding (blocked half rounds up), Knockback, Impale, Barbed, Reach, Entangle (original-roll Trip), Entrapping, Disarm STR limit, Acrobatics vs Trip, concurrent tied Initiative, shield strikes and shield Bash. Ledger: `docs/the-pits-combat-procedure-review.md`.
  - v0 fight screen done (#193–#195, fixes #202): Stone look, view adapter `experiments/pits-view.js`, game layer `experiments/pits-game.js` (Glory, Momentum, Marks: presentation only, never rules).
  - **Melee only (owner, 2026-11-07).** All 35 Core melee weapons and 8 shields playable; saved characters can use any weapon their style trains, carried or not (#205). Ranged was built and removed (#206 reverted); its spec `docs/the-pits-ranged-cases.md` is shelved. Lance and Garrotte unsupported.

## Next

- **Owner (first):** run the read-only query in `docs/server-check-20261109.md` and paste the result to Claude. It shows why New code, Remove and Make GM fail in production. Or retry New code now: the app shows the server's real error.

- **ChatGPT (Work), with the next live batch:** new header on every route (desktop and phone, More sheet, Escape), header on The Pits and the character sheet, Play Mode page scroll; campaign manager as GM and as player (New code, Make GM, Remove, Delete confirms; notes Saved). The campaign creator redesign (Mockup B) is designed but not built; build only if the owner asks.

- **Owner (done 2026-11-09):** D-S3 migration run; test accounts created for Work.
- **ChatGPT (Work), when accounts exist:** multi-account steps 1–10 plus D-S3 (as an outsider, other users' names show and nothing else); new-item pop-up; signed-in Play Mode item search and 26 Core traits; Undo delete and Join with a code. Signed out or standalone: The Pits terminal recap timing (play a bout to Victory/Defeat) and recheck the initiative strip, fixed in the D-S3 PR. Record in `docs/live-batch-pr209-20261107.md` or a new dated file. Real phone and audible sound stay blocked unless the owner can check them.
- **ChatGPT (Chat):** review the B18/B19/anatomy section at the end of `docs/creature-cases-batch-1.md` once (Claude checked it against the owner's Core PDF).
- **ChatGPT (Work), with the live batch:** Magic Audit fixture: Combine 1 asks for a second spell and shared targets; Talent blocked until "Learned" is ticked; add a second cult pool, check combined POW cap, that each miracle asks for its cult, that a miracle spends only its own pool, and that the wrong cult is rejected; a miracle above its pool rank, or with no confirmed rank, is refused; Animist rank (Follower…High Shaman) limits binding and needs a recorded bargain or Spirit Combat. GM tracker (signed in, own campaign): paste a creature stat block, check the listed errors, add it, roll a hit location and apply damage after armour; with traits (e.g. Flying, Breathe Flame, Multi-headed), check the card's trait controls.
- **Claude, next code batch:** B18 builder path (a PC built from a creature, with its own culture and career; the INT 8+ floor), then B20 per-entry children. Magic P2 waits for owner priority and D-4/D-5. Pits Unarmed only if the owner asks.
- **ChatGPT (Work), live batch 2026-11-08:** `docs/live-batch-pr212-20261108.md`: A/B/C/D signed in, joins/items/reload/Undo and sampled Pits victory timing passed; Red/Blue and saved fixture deleted. New code / Remove / Make GM FAIL with missing server-update message; Claude investigate RPC availability despite reported migration. D-S3 grants verified; direct permission matrix, conflicts/gifts/pop-up and full traits/backup checks remain unaccepted. Progress 5/8.
- **Owner, later:** D-4 and D-5 (Magic, low priority). Settings → General → "Allow auto-merge" if not on yet.

## Notes

- The owner uploads the Core rulebook (and the Companion) to Claude sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
