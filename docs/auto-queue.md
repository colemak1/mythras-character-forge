# Automation queue

One shared list of work moving between Claude (builds and fixes) and ChatGPT (Work) (live checks), so each knows what
is theirs without a handoff message (owner, 2026-11-27). Items come from site feedback and Pits reports (exported to
the `pits-reports` branch every 6 hours, `docs/pits-reports.md`), Work's live checks and the owner.

This is a work list, not a status report: `docs/session-zero.md` and `docs/subsystem-plan.md` stay the only status
documents, and `docs/pits-report-ledger.md` keeps the per-report diagnosis. Link to those rather than repeating them.

## Statuses

| Status | Meaning | Who acts next |
|---|---|---|
| `QUEUED FOR CLAUDE` | Needs code: a bug, a fix that failed its live test, or an approved idea. | Claude |
| `READY FOR LIVE TEST` | Merged and deployed; needs a signed-in check on the live site. | ChatGPT (Work) |
| `PASSED` | Work's live check passed. Final until code in that area changes (AGENTS.md, Reviews). | nobody |
| `FAILED LIVE TEST` | Work's check failed. Claude moves it back to `QUEUED FOR CLAUDE` and adds 1 to **Retries**. | Claude |
| `NEEDS OWNER` | A decision only the owner can make, or out of retries. | owner |

## Rules

1. **One row per item.** IDs are `AQ-<n>`, never reused. Severity is 1, 2 or 3 as in `AGENTS.md`; Severity 1 goes first.
2. **Retries.** **Retries** counts fixes that failed a live test, starting at 0. A `FAILED LIVE TEST` with Retries
   already at 2 goes to `NEEDS OWNER` instead of back to Claude, with one line on what keeps failing.
3. **Moving an item.** Change its status, update **Updated** (date) and **Note** (one line: PR number, Work's report
   file, or the question for the owner). Done items stay until the next batch, then are deleted: history lives in
   `CHANGELOG.md` and Work's dated reports.
4. **Who edits.** Claude edits rows it builds; Work edits only **Status**, **Retries**, **Updated** and **Note** on
   rows it tests; the owner may edit anything. Keep this file out of docs PRs that touch other shared files.
5. **Ideas** from site feedback (`[Site idea]`) are not queued until the owner picks them: list them under Ideas.

## Queue

| ID | Item | Source | Sev | Status | Retries | Updated | Note |
|---|---|---|---|---|---|---|---|
| AQ-1 | Site-wide feedback button (bug or idea, saved with page, view and viewport) | owner, 2026-11-27 | — | `READY FOR LIVE TEST` | 0 | 2026-11-27 | Check at 390px and desktop: button above the tab bar, never over navigation; a sent bug appears in the next export as `[Site bug]`. |
| AQ-2 | Export runs every 6 hours (12 AM, 6 AM, 12 PM, 6 PM Pacific) | owner, 2026-11-27 | — | `READY FOR LIVE TEST` | 0 | 2026-11-27 | After merge: the Actions tab shows a scheduled run of "Export Pits fight reports" at the next slot. |

## Ideas (waiting for the owner)

| From | Idea | Page |
|---|---|---|
