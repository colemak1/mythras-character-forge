# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-11 by Claude (creature limb HP fix; status from Work's #274 report)_

## Where things stand

- **Session readiness 12 of 14. Feature completeness 7 of 8 built, 6 closed.** Item 14 passed live (#274). Subsystem 7 reopened for one Severity 1 (creature character arms/legs 0/0 HP), fixed in code with a test; it recloses when Work's recheck passes. Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work), completed 2026-11-10:** `docs/creature-hp-live-275-20261110.md`: all three HP rechecks PASS; entry HP correct, Right Arm wound 2/5 persists in the account copy after save/reload, Attributes lists all nine locations. Fixture deleted; C remains signed in. **Next: Claude** — mark item 2 Ready, reclose Subsystem 7 and continue step 4; preserve typed Culture and restored-tracker passes.
3. **ChatGPT (Chat):** one milestone review of the Subsystem 8 close (`subsystem-plan.md` item 8). Core p.218 Vulnerable only if you are given the page.
4. **Claude, after Work's report:** reclose Subsystem 7 and mark item 2 Ready on a pass (fix any failure). Then Subsystem 6, one tradition per batch in `roadmap.md` order (Animism first; Folk Magic is done); item 11 stays with the owner and doesn't block it.

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
