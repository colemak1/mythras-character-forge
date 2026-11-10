# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-10 by Claude (new workflow: Session Zero, severity, one review per milestone)_

## Where things stand

- **Session readiness 9 of 14. Feature completeness 7 of 8 built** (5 closed). Details: `docs/session-zero.md`.
- **Workflow changed (owner, 2026-11-10):** see Priorities, When something is done, and Reviews in `AGENTS.md`. Earlier "Next" lists are retired; anything still useful from them is in `session-zero.md` under Not blocking.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

1. **Owner (answered 2026-11-10):** the first campaign uses almost no magic; build every tradition anyway, after the Session Zero items. Session 1 is a few months out.
2. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone.
3. **ChatGPT (Work), one batch** (signed in, own campaign; one short dated report, pass/fail plus severity):
   - **Tracker (items 9, 10):** add a creature with How many 3, set all to Rabble, hit one below its HP: it flees and the card says the rest flee. Add 4 as Underling, hit one twice: it withdraws; hurt a second and the rest withdraw. Two creatures of the same name with Intimidate: a Critical on one shows on the other.
   - **Restored copy (item 14):** open GM Tools on the retained restored fixture: cards draw, missing HP shows 0 / 0. Then clean up the fixtures (keep Creation Audit and Magic Audit).
   - **Creature character (item 2):** as GM, add a sapient creature, tick "GM permits", copy its stat block; as player, Concept → "Play a creature your GM approved", build with Points Build, save, reload: species, ranges and hit locations persist. An INT 7 creature is refused.
   - Anything blocked: record it once and move on.
4. **ChatGPT (Chat):** one line on Core p.218 Vulnerable (does worn armour still count?). Only if you have that page; otherwise say so.
5. **Claude, after Work's report:** fix any Severity 1, then close Subsystems 7 and 8 under the new rule with their Known limits listed, and update the two numbers. Then Subsystem 6, one tradition per batch in `roadmap.md` order (Animism first; Folk Magic is done).

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
