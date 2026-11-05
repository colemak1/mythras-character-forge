# Working agreement for AI assistants

Two assistants work on this repository: **Claude** (Claude Code) and **ChatGPT**. Read `HANDOFF.md` before starting, and update it before ending a session.

## Roles

- **Claude owns all production code.** That covers everything under `js/`, `experiments/`, `tests/`, the HTML and CSS files, `supabase/` and `.github/`, including small rule fixes.
- **ChatGPT owns rules accuracy.** It verifies against the Mythras Core Rulebook with page references, writes rule-case specifications, records interpretations, and does independent live acceptance testing when it has browser access. It writes to `docs/` and `HANDOFF.md`, not to code.
- A rule fix flows like this: ChatGPT documents the case in `docs/` ("given X → Core p.N says Y"), Claude implements it with a test, and ChatGPT verifies it on the deployed site.

## Rules

1. Never commit directly to `main`. Work on a branch, open a pull request, and let the owner merge it. Only one assistant edits a given area at a time.
2. Run every test before pushing: `for f in tests/*.cjs; do node "$f" || echo "FAIL $f"; done`. The **Tests** workflow runs the same check on every push and pull request. Never skip, delete or weaken a test to get it passing.
3. Add release notes at the top of `CHANGELOG.md`. Do not create new `CHANGELOG-*.md` files.
4. Write rulings and interpretations in `docs/decisions.md` or the relevant `docs/*-cases.md` ledger, not only in chat.
5. Mythras Core is authoritative. Sit'ota house rules must be labelled as house rules and never removed without the owner's approval.
6. Report progress against the 8 groups in `docs/subsystem-plan.md`. A small release does not advance the count.

## Deployment

GitHub Pages publishes from `main` automatically ("pages build and deployment"). There must be exactly one automatic publisher; do not add deploy or repair workflows. **Manual Pages deployment** (`publish-dice-experiment.yml`) is a manual fallback only. If a deploy hangs on "updating_pages" or fails with "in progress deployment", the problem is on GitHub's side: wait a few minutes, check githubstatus.com, then run the manual fallback.
