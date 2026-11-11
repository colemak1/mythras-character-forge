# Handoff

Read `AGENTS.md`, then this, at the start of every session; update it before ending one. Keep it short: replace finished items, don't append history (history goes in `CHANGELOG.md` and dated `docs/` files). Priorities come from `docs/session-zero.md`.

**Owner kickoff line for a new Claude session** (paste as the first message):
> Read AGENTS.md and HANDOFF.md, then continue with the next Claude item.

_Last updated: 2026-11-11 by Claude (The Pits arena redesign: prototype layout and animations on our engine; owner to review)_

## Where things stand

- **Session readiness 13 of 14. Feature completeness 8 of 8 built, 8 closed.** Only item 11 (owner's two-device check) is left for Session Zero. Chat accepted the Subsystem 6 and 8 closes (#289). **Spirit Combat (AN-F06–F07) and SO-C02** built and passed live 2026-11-11 (`spirit-combat-live-290-20261111.md`); no longer Known limits. Details: `docs/session-zero.md`.
- **Backups:** Supabase Free plan, so no automatic server backups. The GM downloads a campaign backup after every session.
- **Look:** Codex · Stone everywhere; tokens in `sitota-theme.css` (loaded last). Other stylesheets use the tokens only; no hex colours.
- **Combat rules** live in `js/combat-rules.js` (`CombatRules`), shared by Play Mode and The Pits; tests in `tests/combat-rules.cjs`. The Pits is melee only (owner, 2026-11-07).

## Next

0. **Owner (wish list):** try the redesigned Pits fight screen (`experiments/practice-combat.html?stage=duel` for Sword v Spear, or start any Pits fight). It is the prototype's layout and animations on our engine; `?layout=classic` restores the old screen. Tell Claude what to change: look, pacing, anything missing (Impale lodge, entangle). Screens: `docs/pits-arena-screens/`. Code: `experiments/pits-stage.js`, `pits-arena.js`, their CSS, `tests/pits-stage.cjs`, `tests/pits-arena.cjs`.

1. **Owner:** the 10-minute two-device check in `session-zero.md` (item 11), when you have a second person or phone. Data lost there is Severity 1 and reopens Subsystem 8.
2. **ChatGPT (Work), 2026-11-11:** Pits visual review complete; next Claude implements `docs/pits-visual-review-20261111.md` (owner wants full-screen battle without top Sit’ota navigation). Live Forge Impale/leg-colouring/withdrawal and playable prototype Choose Location checked; eight presentation findings plus direct visual comparison (both versions misalign leg-hit contact). Then batch the changed live workflows.
3. **ChatGPT (Chat):** nothing queued.
4. **Claude, next fresh session:** only what the owner's two-device check turns up.

## Notes

- The owner uploads the Core rulebook (and the Companion) to sessions when needed. They are **never committed**: the repo is public. Core PDF page = printed page + 1. Write paraphrases, never book text.
- Mythras Companion rules are optional, campaign-selectable only.
- Live fixtures kept: Creation Audit (Human), Magic Audit (Paired Skills). Delete any other test characters or campaigns after use.
- ChatGPT (Chat) can't run the tests, so CI is the test evidence for its PRs.
- Rulings: `docs/decisions.md`; case ledgers: `docs/*-cases.md` and `docs/the-pits-combat-procedure-review.md`.
- **Owner, open:** close #230 (Claude's close was blocked by a permission check); turn on Settings → General → "Allow auto-merge" if not on yet; send owned home art when ready.
- **Claude's Windows machine:** checkout uses CRLF; asset stamps hash the LF bytes, so run `tests/asset-versions.cjs` in an LF clone. Python isn't installed there; stamp with an equivalent Node script.
