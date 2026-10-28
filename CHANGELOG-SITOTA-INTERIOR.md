# New Sit’ota — Unified Interior Visual System

## What changed
- Introduced a single scoped interior stylesheet (`sitota-interior.css`) using the established 16:9 homepage's charcoal, ivory, restrained gold and editorial type.
- Applied the design to the Account, My Characters, Campaign list, Campaign detail, Party Board, Rules Wiki, character builder, Play Mode and public world guide.
- Unified site navigation typography and sizing across interior screens. **The homepage header and castle hero keep their approved appearance.**
- Account and character library use dark, high-contrast panels and controls; the library previews actual saved character portraits in larger rectangular frames.
- Campaign and wiki indexes use restrained dark tiles. Long-form rules chapters, campaign details, and dense gameplay forms retain warm-paper surfaces for reading clarity.
- Character builder gets dark step navigation, paper work area, dark characteristics ledger and a matching dark step footer.
- Play mode keeps its existing combat status, wound and roll colours; simplified ornamental frames and aligned its heading/actions with the new typography.
- Printable character sheet remains intentionally paper-based and the print stylesheet stays print-friendly.
- Added an explicit active-view marker to the existing site header update hook, scoped CSS, and a regression test.
- Bumped the cached `js/sitota.js` URL from `v=3` to `v=4` to prevent the stale-PC-homepage problem.

## Unchanged
No Mythras rules calculations, Supabase schema, authentication flows, saved character formats, campaign data or routing logic were modified. The original Richard Wright homepage art is not reused elsewhere.

## Developer checks
- PASS: new JavaScript source parses.
- PASS: CSS braces and parentheses balanced.
- PASS: every targeted view has explicit styling; home and printable sheet have scoped exclusions.
- PASS: new script version and stylesheet references present.
- Added `tests/sitota-interior.cjs`. Full Node regression suite and browser login walkthrough **not yet run** in this chat.

## Manual review checklist
1. Desktop homepage must remain the 16:9 version with correctly positioned painting and real characters.
2. Account signed-out, sign-up, login, password-reset, logged-in profile and guest states: check contrast and working controls.
3. Character library: images, names, Play/Edit/Print/Delete actions, import JSON, empty/error/loading states.
4. Campaign list, campaign detail, membership, invites, and Party Board tabs including GM controls and combat trackers.
5. Rules Wiki chapter grid, search results, and article reading.
6. Builder rail, form fields, allocation tables, portrait input, ledger, validation and fixed navigation footer.
7. Play Mode combat buttons, wounds, Magic Points, XP, inventory, status indicators, read-only teammate view.
8. World Guide chapter index/search/readability; screen widths 1440, 1024, 768, 375; keyboard navigation.
9. Print a sheet and check white paper, text contrast, and no dark nav.
10. Signed-in save/reload across devices and legacy links remain correct.

## Release scope
Review-only UI PR. **Do not merge until visually reviewed and functional smoke checks are satisfactory.**
