# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md`).

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item. Branch: claude/gallant-hypatia-3el31w.

_Last updated: 2026-11-09 by Claude (shared combat rules engine)_

## Where things stand

- **Owner, 2026-11-09:** Creatures before Magic. D-4 (round up) and D-5 (casting interruptions per Core p.119, GM-prompted) decided in `docs/decisions.md`.
- **Whole plan:** `docs/roadmap.md` (Phases 0–4, from 5/8 to finished, with the owner decisions each needs).

- **Progress 5/8** (`docs/subsystem-plan.md`). Subsystems 1–5 closed; Main Play Mode Combat stays CLOSED. Next audits when the owner resumes them: 6 Magic (low priority), 7 Creatures, 8 Campaign/multi-account (D-S1–D-S4 implemented; DB permission tests in CI; signed-in live check remains).
- **Play Mode:** v0 "Stone & Verdigris" look, nine colour schemes (`play-stone.css`), item search, Core-only traits. Nothing waiting on a live check.
- **Home and menus:** owner's redesign handoff Part A done (#197–#201): shared page header, phone tab bar and More sheet, sign-in gates, Home Continue card and character cards, Characters search/sort/Undo delete, Campaign cards and Join with a code, The Pits lobby, Rules table of contents, World Guide chips, Account tabs and profile. Styles in `sitota-menus.css`; tests in `tests/site-menus.cjs`.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits. Change a combat rule there, with a test in `tests/combat-rules.cjs`.
- **The Pits** (`experiments/practice-combat.html`, route `#/the-pits`):
  - Rules from ChatGPT's reviews implemented through #191: parry rounding (blocked half rounds up), Knockback, Impale, Barbed, Reach, Entangle (original-roll Trip), Entrapping, Disarm STR limit, Acrobatics vs Trip, concurrent tied Initiative, shield strikes and shield Bash. Ledger: `docs/the-pits-combat-procedure-review.md`.
  - v0 fight screen done (#193–#195, fixes #202): Stone look, view adapter `experiments/pits-view.js`, game layer `experiments/pits-game.js` (Glory, Momentum, Marks: presentation only, never rules).
  - **Melee only (owner, 2026-11-07).** All 35 Core melee weapons and 8 shields playable; saved characters can use any weapon their style trains, carried or not (#205). Ranged was built and removed (#206 reverted); its spec `docs/the-pits-ranged-cases.md` is shelved. Lance and Garrotte unsupported.

## Next

- **ChatGPT (Work), first:** install the campaign migration following `docs/server-install-20261109.md` (pre-check, install, verify, live retry). Then finish the creature tracker checks in `docs/live-batch-20261109.md`; the form no longer resets.
- **ChatGPT (Work), diagnostics/live 2026-11-09:** `docs/server-check-results-20261109.md` proves all 3 public continuity RPCs absent; New code still fails. `docs/live-batch-20261109.md`: header samples, Sheet scroll, notes Saved/player view, error clearing and active-delete/sign-out passed; creature form refresh blocked entry; phone/direct permission/remaining multi-account checks unaccepted. Disposable fixtures deleted. Claude reviewed (2026-11-09): migration hand-off and form fix done. Progress 5/8.

- **ChatGPT (Work), with the next live batch:** new header on every route (desktop and phone, More sheet, Escape), header on The Pits and the character sheet, Play Mode page scroll; campaign manager as GM and as player (New code, Make GM, Remove, Delete confirms; notes Saved). The campaign creator redesign (Mockup B) is designed but not built; build only if the owner asks.

- **Owner (done 2026-11-09):** D-S3 migration run; test accounts created for Work.
- **ChatGPT (Work), when accounts exist:** multi-account steps 1–10 plus D-S3 (as an outsider, other users' names show and nothing else); new-item pop-up; signed-in Play Mode item search and 26 Core traits; Undo delete and Join with a code. Signed out or standalone: The Pits terminal recap timing (play a bout to Victory/Defeat) and recheck the initiative strip, fixed in the D-S3 PR. Record in `docs/live-batch-pr209-20261107.md` or a new dated file. Real phone and audible sound stay blocked unless the owner can check them.
- **ChatGPT (Chat):** review the last two sections of `docs/creature-cases-batch-1.md` once (B18/B19/anatomy source check, and the new B18 builder path + B20). Confirm one reading in `docs/decisions.md`: does Core p.218's INT 8+ also bind the character's own INT (built that way), or only the species?
- **ChatGPT (Work), with the next live batch:** creature character. As GM, add a sapient creature with all seven dice and Move, tick "GM permits", copy its stat block. As player, Concept step → "Play a creature your GM approved", paste, tick approval, build it with Points Build (pool = its averages rounded up), pick culture and career, save, reload: species, ranges and hit-location table persist. Check an INT 7 creature and an INS creature are refused, and Ability/Poison/Magic/Weapon effect lines show as GM-resolved on the tracker card.
- **ChatGPT (Work), with the live batch:** Magic Audit fixture: Combine 1 asks for a second spell and shared targets; Talent blocked until "Learned" is ticked; add a second cult pool, check combined POW cap, that each miracle asks for its cult, that a miracle spends only its own pool, and that the wrong cult is rejected; a miracle above its pool rank, or with no confirmed rank, is refused; Animist rank (Follower…High Shaman) limits binding and needs a recorded bargain or Spirit Combat. GM tracker (signed in, own campaign): paste a creature stat block, check the listed errors, add it, roll a hit location and apply damage after armour; with traits (e.g. Flying, Breathe Flame, Multi-headed), check the card's trait controls.
- **Claude, done 2026-11-09:** B18 builder path and B20 entry abilities (`tests/creature-pc.cjs`). **Next code batch:** nonhuman hit-location tracking in Play Mode for creature characters (today it keeps the 7 human boxes and shows the creature table beside them), only if the owner wants it; otherwise Magic P2 (D-4/D-5 decided) or Subsystem 7 audit fixes after Work's live check. Pits Unarmed only if the owner asks.
- **Claude, done 2026-11-09: one shared combat rules engine** (`docs/brief-combat-engine.md`, all four steps). `js/combat-rules.js` (pure, dice passed in) is used by The Pits and Play Mode; the hit-location table is data. Tests: `tests/combat-rules.cjs` (each rule, with Core page) and `tests/pits-golden.cjs` (five seeded bouts, identical before and after). No script line in `practice-combat.html` is over 200 characters. Behaviour unchanged.
- **ChatGPT (Chat): rule on D-CE1 to D-CE4** in `docs/decisions.md` ("Combat engine: differences"): Failure against Fumble, rounding at a difficulty grade, Bypass Armour stacking, two names. Give the Core page for each. Claude then makes both sides match.
- **ChatGPT (Work), with the next live batch:** play three or four bouts in The Pits on the live site (one with a shield, one with an impaling weapon, one with a whip or net, one from a saved character) and roll attack, parry, damage and a Special Effect in Play Mode. Nothing should differ from before; report anything that does.
- **Claude, next:** nonhuman hit locations are now possible (pass a creature's table to `CombatRules`); build only if the owner asks. Regenerate the golden fixtures (`node tests/pits-golden.cjs --update`) only with an intended rules or wording change.
- **Claude's machine note:** Windows checkout uses CRLF; asset stamps are hashes of the LF (committed) bytes, so run `tests/asset-versions.cjs` in an LF clone, not the working copy. Node is installed; Python isn't, so stamp with an equivalent Node script (hash each `?v=` file's LF bytes).
- **ChatGPT (Work), live batch 2026-11-08:** `docs/live-batch-pr212-20261108.md`: A/B/C/D signed in, joins/items/reload/Undo and sampled Pits victory timing passed; Red/Blue and saved fixture deleted. New code / Remove / Make GM FAIL with missing server-update message; Claude investigate RPC availability despite reported migration. D-S3 grants verified; direct permission matrix, conflicts/gifts/pop-up and full traits/backup checks remain unaccepted. Progress 5/8.
- **ChatGPT (Chat), 2026-11-09:** source-checked optional Rabble/Underlings and creature follow-up in docs-only creature PR; Magic code-needed batches Animism, Mysticism, Sorcery, Theism and organisations in a separate docs-only PR. Claude to review and implement only approved, in-scope deltas; active effects and MP recovery remain GM-managed (D-2/D-3). Progress 5/8.
- **Owner, later:** D-4 and D-5 (Magic, low priority). Settings → General → "Allow auto-merge" if not on yet.

## Notes

- The owner uploads the Core rulebook (and the Companion) to Claude sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
