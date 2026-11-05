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

## Switching between assistants

The owner does not alternate messages between assistants. Each assistant works through a full batch, then hands off only when the next step belongs to the other one.

- **Keep going** while the next step is yours. Don't hand off for something you can do yourself.
- **When the next step is the other assistant's**, update `HANDOFF.md`, then end your reply with:
  1. **Next: Claude** or **Next: ChatGPT**, and one line saying why.
  2. A short message in a block the owner can paste as-is. It must say what changed (PR number or files), what to do next, and to read `HANDOFF.md` first.
- **If the owner needs to act first** (merge a PR, sign in, run a deploy), say so before the paste-ready message.
- **If neither assistant can proceed** (waiting on a decision), say **Next: owner** and ask the question.
- Don't hand off just to report progress. Report it and keep working.

## Deployment

GitHub Pages publishes from `main` automatically ("pages build and deployment"). There must be exactly one automatic publisher; do not add deploy or repair workflows. **Manual Pages deployment** (`publish-dice-experiment.yml`) is a manual fallback only. If a deploy hangs on "updating_pages" or fails with "in progress deployment", the problem is on GitHub's side: wait a few minutes, check githubstatus.com, then run the manual fallback.
