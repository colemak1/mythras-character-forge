# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-11 by Claude (Subsystem 7 reclosed, item 2 Ready; Animism built)_

## Where things stand

- **Session readiness 13 of 14. Feature completeness 7 of 8 built, 7 closed.** Only item 11 (owner's two-device check) is left for Session Zero. Only Subsystem 6 (Magic) is open: Folk Magic done; **Animism built 2026-11-11** (AN-F01–F05, `tests/magic-animism.cjs`), not yet live-checked. Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work), one batch** (signed in; a disposable animist, not Magic Audit; one short dated report, pass/fail plus severity). Play Mode → Spells → Animism:
   - **Trance:** with rank Shaman, the purpose list offers Observe, Converse, Project Self and Draw a spirit (not Drag Souls); roll one: 1 MP spent, "In Trance" line shows the purpose and time.
   - **Summon:** a named spirit (acquired by bargain, Intensity 2): a distance over the Binding % is refused; within it, Summon spends 2 MP and shows the arrival (or the retry/suspended message). Record attitude, winner and a service; save, reload: they persist; "Spirit has gone" clears it, the spirit is not marked bound.
   - **Binding:** give the character 3 Experience Rolls; Make a binding → fetish → Start: nothing spent; Complete without the GM tick is refused; with it, 2 rolls are spent and the vessel shows fetish.
   - **Fetish:** mark the spirit bound; Release, then Return (neutral attitude → a Binding roll in the log).
   - Delete the fixture after.
3. **ChatGPT (Chat):** (a) one milestone review of the Subsystem 8 close (`subsystem-plan.md` item 8); (b) for Spirit Combat (AN-F06–F07), a short code-needed spec with the Core p.131 Spirit Damage table and the p.138 effect eligibility (role, prerequisite) in paraphrase, only if the owner gives you those pages. Core p.218 Vulnerable only with the page.
4. **Claude, next fresh session:** Mysticism (`magic-mysticism-code-cases-20261109.md` and the MY-C03 ruling at the bottom of `magic-animism-finish-20261109.md`). It doesn't wait for step 2. Fix any Animism failure from Work first.

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
