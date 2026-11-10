# Stone signed-in live check — 2026-11-09

Scope: deployed Stone reskin #253 and The Pits header fix #254. Date uses the owner's local time (America/Los_Angeles); Claude's separate signed-out check is `docs/live-check-stone-20261110.md`.

Read `AGENTS.md`, `HANDOFF.md`, and Claude's check first. The connected local Chrome attempt was signed out, then detached during Light selection. The owner subsequently requested the internal browser and completed secure sign-in there. The results below supersede the initial all-blocked report.

## Signed-in results

| Check | Result | Evidence |
| --- | --- | --- |
| GM campaign manager → Home page; save quote, attribution, session title/date/time/place | PASS | Created disposable campaign. Saved quote “Every road begins with a single step.”, attribution “Stone audit GM”, title “Stone acceptance session”, date 2026-11-20, and combined Time and place “7:00 PM — Test table”. Manager displayed Saved. |
| GM Home displays saved content | PASS | Home showed all values and “Next session · Friday, November 20”. Content also persisted after Rules & books save and reopening campaign. |
| Player in same campaign sees quote/session | blocked | Second secure sign-in returned to the same GM account, not a separate player. No player-membership result claimed. |
| Rules & books save and reload | PASS | Changed to ongoing characteristic training, faster skill improvement (1d6+1), and Mythras Companion selection-only. Manager showed ONGOING TRAINING / SKILLS 1D6+1 / + MYTHRAS COMPANION after save and later reopening. Home settings remained intact. |
| Rules apply to linked character without GM-review error | PARTIAL / discrepancy | Created character through campaign's New character action; campaign party and Home card confirmed the link. Play Mode opened without the GM-review error. However Improve Skills help still described +1d4+1, despite campaign displaying 1d6+1. Actual improvement die and characteristic-training behavior were not exercised; do not accept propagation as fully passed. |
| Home and Characters character cards | PASS | Both showed “Human · Civilised · Warrior” first. No combat-style or AP chips on either card; campaign badge remained. Fixture was a saved, unfinished character, not a completed-creation audit. |
| Play Mode → Settings | PASS | Appearance offered Light / Dark / Match device. Stone was selected, described as following site Light/Dark. Eight alternate colour schemes also listed. |
| Appearance switching and reload persistence | PASS, scoped | Selected Dark in Play Mode, reloaded, reopened Settings: Dark aria-pressed=true; rendered dark screenshot checked. Repeated Light: Light aria-pressed=true and Stone aria-pressed=true after reload. Selected Match device on Account, reloaded, and confirmed aria-pressed=true. OS appearance changes and alternate colour-scheme switching were not tested. |

## Finding for Claude

**Skill-improvement help disagrees with saved campaign choice.** Reproduction: create campaign → Rules & books → choose “Optional: 1d6+1 (faster progress)” → Save → create a linked Human character → Play → Improve skills. The manager says SKILLS 1D6+1, but Improve Skills explanatory paragraph says +1d4+1%. This remained after reopening the saved character from the campaign and returning to Play from Home. No “GM needs to review the campaign rules” error appeared on these paths. Investigate whether the mismatch is only help text or also the die used; the live check does not establish a mechanics failure or a Stone regression.

## Visual glance

Internal-browser desktop viewport was 1363×936. These are visual spot checks, not a numerical contrast audit or exhaustive interaction test.

| Surface | Desktop Light | Desktop Dark | 390px Light / Dark |
| --- | --- | --- | --- |
| Home, including quote/session and character card | Readable | Readable | blocked |
| Characters | Readable; saved identity order checked | Readable | blocked |
| Campaign list | Readable | Readable | blocked |
| Campaign manager and Rules & books editor | Readable | Not independently checked | blocked |
| Rules index | Readable | Readable | blocked |
| World Guide welcome | Readable | Readable | blocked |
| Account | Readable | Readable | blocked |
| The Pits lobby | Readable; populated character selection checked | Readable | blocked |
| Character builder | Readable in sampled Concept/Characteristics/Culture/Career views | Not independently checked | blocked |
| Play Mode | Readable | Readable | blocked |
| Printed sheet, party board, Pits fight screen, deeper reference pages | Not checked | Not checked | blocked |

The Pits lobby heading was sentence case “The Pits”; no unreadable/broken layout found in the inspected desktop surfaces. Exact 390px checks are blocked: this internal browser advertises no viewport-resizing capability. No claim of mobile acceptance; Claude's earlier signed-out phone results remain separate evidence.

## Cleanup and validation

- Created only “Stone Live Audit — disposable” and “Stone Audit Hero”. Used normal UI controls to delete both.
- Verified Campaign list says “No campaigns yet” and Characters says “0 saved to your account”. Campaign deletion also removed the test quote/session. No existing fixtures changed.
- Appearance restored to Match device; Stone remained the Play Mode scheme.
- Credentials were collected through secure browser authentication; no passwords, account identifiers, tokens, or invite codes recorded here.
- Documentation only; no production files or CHANGELOG.md changed. Runtime tests not run (connector-only documentation edits; no local checkout).
- Progress remains **5/8**; Main Play Mode Combat stays CLOSED.

## Next

Claude: review/merge this docs PR and investigate the 1d6+1 versus 1d4+1 help discrepancy. Player Home visibility, full linked-rule behavior, exact 390px matrix, and uninspected surfaces remain unaccepted.
