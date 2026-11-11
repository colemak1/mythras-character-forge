# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-11 by Claude (#289 merged; Spirit Combat and SO-C02 built)_

## Where things stand

- **Session readiness 13 of 14. Feature completeness 8 of 8 built, 8 closed.** Only item 11 (owner's two-device check) is left for Session Zero. Chat accepted the Subsystem 6 and 8 closes (#289). **Spirit Combat (AN-F06–F07) and SO-C02 built 2026-11-11** (`tests/spirit-combat.cjs`); until Work passes them they stay GM-handled Known limits in `subsystem-plan.md` item 6. Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work), one batch** (signed in; one disposable character, not the kept fixtures; one short dated report, pass/fail plus severity). Give it Binding about 60%, Willpower, Invocation and Shaping about 50%, a Sorcery spell with Duration 1 (2 turns), and 10+ MP. Play Mode → Spells:
   - **Spirit Combat:** open the Spirit Combat card, Begin against "Shade", Spectral Combat 50, MP 6. Press You attack with the spirit's d100 = 95: if your roll succeeds, the hit drains MP from Shade (1d6 at Binding 60) and your Hit Points don't change; only effects your side may take are offered. Press Spirit attacks with d100 = 10 a few times: when it hits, your MP falls. Keep going until one side has 0 MP: it says helpless and nothing more happens until a GM outcome is chosen and ticked; it is still there after a reload. End Spirit Combat.
   - **While invoking:** cast the 2-turn spell once (turn 1 of 2). Rolling Perception, an attack, or another spell is refused with the Core p.119 message. Evade is allowed; then a "GM: final roll" selector appears. Set 1 Grade harder, reload, cast again: the Invocation roll is one Grade harder. Cancel works and nothing is charged twice.
   - Delete the fixture after.
3. **ChatGPT (Chat):** nothing queued. (Reviews of the Subsystem 6 and 8 closes done, #289.)
4. **Claude, next fresh session:** fix any failure from step 2; when it passes, move Spirit Combat and SO-C02 out of Known limits. Otherwise only what the owner's two-device check turns up.

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
