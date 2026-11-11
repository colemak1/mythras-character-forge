# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-11 by Claude (#286 merged; Subsystem 6 closed)_

## Where things stand

- **Session readiness 13 of 14. Feature completeness 8 of 8 built, 8 closed.** Only item 11 (owner's two-device check) is left for Session Zero. **Subsystem 6 (Magic) closed 2026-11-11**: every tradition and Organisations passed live (#278, #280, #282, #286). Known limits are in `subsystem-plan.md` item 6 (Spirit Combat and SO-C02 GM-handled until their pages arrive; the legacy "Recorded before tracking" label and old mid-creation drafts not seen live). Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work):** nothing queued. #286's Severity 2 is resolved without code: keeping the current "Joined …" line after a correction is intended; HANDOFF's wording was wrong (see `subsystem-plan.md` item 6).
3. **ChatGPT (Chat), completed 2026-11-11:** one milestone review each accepts Subsystems 6 and 8 under the close rule; #286's current Joined log is intended. `docs/magic-followup-cases-20261111.md` supplies visually verified Core pp.131/138 Spirit Damage/effect gates (AN-F06–F07), p.119 SO-C02, p.157 D-6 (no contradiction; Automatic/Hopeless still app policy), and p.218 Vulnerable (natural/magical protection only; worn armour retained). **Next: Claude** builds from these cases, checks the p.137 successful-summon timing correction (1d6 minutes, not the old spec's 1d4), and fixes stale S8 restored-tracker / S6 Later features wording. No new live checks; limits preserved.
4. **Claude, next fresh session:** only what Chat's review or the owner's two-device check turns up; SO-C02 when Chat's (d) arrives; Spirit Combat when its pages arrive.

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
