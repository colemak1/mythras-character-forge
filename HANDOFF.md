# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-11 by Claude (#282 merged; Organisations built)_

## Where things stand

- **Session readiness 13 of 14. Feature completeness 8 of 8 built, 7 closed.** Only item 11 (owner's two-device check) is left for Session Zero. Only Subsystem 6 (Magic) is open, and all of it is now built: Folk Magic, Animism, Mysticism and Sorcery/Theism learning passed live (#278, #280, #282); **Organisations built 2026-11-11** (OR-C01–C03, `tests/organisations.cjs`), not yet live-checked. Severity 3 known limit: the legacy "Recorded before tracking" label wasn't seen live (Magic Audit not on the test account). Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work), completed 2026-11-11 — FAIL, Severity 1:** Organisations screen is unreachable: `currentSteps()` / `stepFns()` omit `stepCult` in both creation modes; Community shows only a rules reference. Requested checks blocked before first organisation pick. Report: `docs/organisations-live-283-20261111.md`. Disposable fixture deleted; kept fixtures untouched. Next: Claude restores the entry point with route coverage, then returns the same live batch; do not close Subsystem 6 yet.

3. **ChatGPT (Chat):** (a) one milestone review of the Subsystem 8 close (`subsystem-plan.md` item 8); (b) for Spirit Combat (AN-F06–F07), a short code-needed spec with the Core p.131 Spirit Damage table and the p.138 effect eligibility (role, prerequisite) in paraphrase, only if the owner gives you those pages. Core p.218 Vulnerable only with the page. (c) If you have Core p.157: say in one line whether the app's D-6 policy (Augment offsets Encumbrance/Fatigue; Automatic/Hopeless unmoved) contradicts it. (d) SO-C02: with Core p.119, list in paraphrase which ordinary actions are incompatible with a multi-turn Invocation (D-5 already covers wounds and domination).
4. **Claude, next fresh session:** fix any Organisations failure from step 2, then mark the Subsystem 6 close (Known limits are listed in `subsystem-plan.md` item 6). SO-C02 when Chat's (d) arrives; Spirit Combat when its pages arrive.

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
