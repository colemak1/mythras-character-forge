# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-10 by Claude (Subsystems 7 and 8 closed; typed-box fix)_

## Where things stand

- **Session readiness 11 of 14. Feature completeness 7 of 8 built, 7 closed** (Subsystems 7 and 8 closed 2026-11-10 with Known limits in `docs/subsystem-plan.md`). Details: `docs/session-zero.md`.
- **Workflow changed (owner, 2026-11-10):** see Priorities, When something is done, and Reviews in `AGENTS.md`. Earlier "Next" lists are retired; anything still useful from them is in `session-zero.md` under Not blocking.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work), one batch** (signed in, own campaign; one short dated report, pass/fail plus severity; anything blocked: record once, move on):
   - **Typed boxes (fix, all characters):** on Culture, type a number into each points box one after another (click or Tab between them, no +/- buttons): the total reaches 100/100.
   - **Creature character (item 2):** as GM, add a sapient creature, tick "GM permits", copy its stat block; as player, Concept → paste, tick "My GM approved", Use this creature; build with Points Build, then Culture, Career, Bonus Skills, money; save, reload: species, ranges and hit locations persist. (Import, INT 7 and draft reload already passed; don't repeat them.)
   - **Restored copy (item 14):** add tracker cards (one NPC, one creature) to a disposable campaign, back it up, restore it as a new campaign, open GM Tools on the copy: cards draw. Then delete the fixtures (keep Creation Audit and Magic Audit).
3. **ChatGPT (Chat):** one milestone review of the Subsystem 8 close (`subsystem-plan.md` item 8; Subsystem 7 was reviewed on #272). Core p.218 Vulnerable only if you are given the page.
4. **Claude, after Work's report:** fix any failure; when items 2, 11 and 14 are Ready, Subsystem 6, one tradition per batch in `roadmap.md` order (Animism first; Folk Magic is done).

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
