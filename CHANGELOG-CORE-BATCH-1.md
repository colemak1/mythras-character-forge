# Core Batch 1 — awaiting review

## Changed
- MCR-05: CHA Experience Modifier is off by default and applied only when selected for a GM-approved positive award. Existing banked rolls are preserved.
- MCR-06: repeated improvement of a skill can spend additional banked rolls, each against its updated percentage. Legacy usedThisRun data is retained but ignored.
- MCR-09: Serious Wound interruption now says 1d3 turns; Major Wound treatment deadlines are unchanged.
- MCR-10 (minimum): the rest estimate is labelled physical exertion only; blood loss and asphyxiation exceptions are shown. Recovery remains manual.
- MCR-17 (minimum): damage input explicitly requires damage after parry and other reductions, before armour. AP is still subtracted automatically.
- MCR-27/28: removed incorrect Combat Style base warning and corrected the Background Events source comment.
- Skill changes return unavailable allocations to their original pools. Legacy hidden allocations have a visible Return points to pool control. No save-load cleanup silently deletes allocations.
- Updated the homepage regression to accept the existing CSS cache version.

## Sources checked
Uploaded `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`, printed pp.12,18,71,72,79,110. Parsed text was searched first, then rendered pages were checked because the text encoding was garbled. The reports are the development handoff, not rules authority.

## Automated verification
PASS: core-batch-1.cjs, rules-smoke.cjs, combat-turn.cjs, effect-selection.cjs, sitota-homepage.cjs; JavaScript syntax and git diff --check.
FAIL: existing release-23.cjs campaign-loading test throws connection lost. This predates the batch; cloud/auth code is unchanged.

## What to test
1. Award 3 rolls with CHA 13 or 6: checkbox off gives 3, on gives 4 or 2. Reopening the modal leaves it off.
2. Spend two rolls on the same skill and verify the second target includes the first gain. Export/import and reopen the character.
3. Allocate points to a Professional Skill, change it, then redistribute the freed points. Repeat for a speciality, hobby, Quick Skills, and custom career choices. Confirm skills still known through another source retain their bonus points.
4. Open an older save with hidden allocations and use Return points to pool without reselecting its old skill.
5. Check wound wording, Fatigue guidance, damage labels, and the STR+DEX Combat Style percentage.

## Unfinished
Signed-in browser, cloud roundtrip and desktop walkthrough remain to be checked. No database/auth changes. Sorcery and later checklist batches remain pending. No merge or deployment authorized by this changelog.
