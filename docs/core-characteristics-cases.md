# Core character characteristics: first verification cases

Source: user-uploaded `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`, Mythras Core Rulebook, printed pp. 8–10. The parsed PDF was garbled, so those pages and their tables were visually checked. Reviewed `js/data.js`, `js/engine.js`, `js/app.js`, and `js/render.js` on top of main commit `7bb6f0a`. Source checks and automated cases here cover the stated scope only; they do not verify every character creation rule, every UI path, or live database permissions.

| ID | Expected behavior / source | Implementation and checks | Current status |
|---|---|---|---|
| CH-01a | Humans use 3d6 for STR, CON, DEX, POW, CHA; 2d6+6 for INT and SIZ (p. 8). | `rollPools()` uses separate groups; human ranges in `charBounds()`. Manual source/code inspection. | Partial: full roll distribution and browser assignment not verified. |
| CH-01b | Roll in order, or assign within the matching dice-range group (p. 8). | Separate pool selectors disable indices already selected in that group. An explicit rolled-order button assigns the dice groups in Core order; the highest-first convenience remains separate. | Automated coverage checks rolled-order assignment and save/reopen. Normal UI prevents reused selectors; saved/malformed roll provenance and live routes remain unverified. |
| CH-01c | Human points build uses all 80 points within possible characteristic ranges (p. 8). | `pbPool`, `pb`/`pbSet`, `validate`; previous signed-in example used exactly 80. | Partial: one live success and existing tests; every invalid-input and editing path remains to test. |
| CH-02a | INT+DEX action-point table (p. 8). | `apCalc`; boundary tests at 12/13, 24/25 and 36/37. | Source and automated boundary examples pass; optional fixed AP and live boundaries remain separate. |
| CH-02b | STR+SIZ damage-modifier table (p. 9). | `DM_TABLE`/`dmCalc`; `rules-smoke.cjs` checks both ends of each printed table band through 130. | Source table and automated table boundaries pass; beyond 130 the app reports a continuation marker rather than a computed die expression. |
| CH-02c | Initiative bonus averages INT and DEX (p. 10). | `initBonus`; previous live example 17+10 → 14. | Partial: rounding convention and complete initiative/armour interactions need separate review. |
| CH-03a | CHA experience modifier and CON healing rate tables (p. 9). | `xpMod`/`healRate`; tests cover 6/7, 12/13 and 18/19. | Source and listed automated boundaries pass; application during awards and healing are separate cases. |
| CH-03b | POW luck table, magic points equal POW (p. 10). | `luckPts`, existing character display; luck boundaries tested at 6/7, 12/13 and 18/19. | Luck source and listed tests pass; broader MP workflows remain separate. |
| CH-04a | Height range by SIZ; weight range by SIZ and body frame; player chooses actual value (pp. 9–10). | `heightWeight`; tests check all human SIZ 8–18 and each frame, plus explicit overrides. Midpoint is a convenience, not a book-mandated value. | Printed ranges pass automated checks for human SIZ 8–18; live override/save/reopen and nonhuman cases remain open. |
| CH-04b | Human HP location table uses CON+SIZ (p. 10). | `hpLocs`; source-based tests cover every printed band boundary and one extension; prior live example CON 10+SIZ 18 gave 6 head/legs, 7 abdomen, 8 chest, 5 arms. | All printed human table bands and one extension pass automated checks; injury interactions, nonhuman bodies and live boundaries remain open. |
| CH-04c | Human base movement is 6m (p. 10). | `moveBase`; prior signed-in example showed 6m. | One live example passes; movement penalties and other species are separate cases. |

## Finding corrected in this batch

The builder enclosed a paraphrase of the dice and points-build rules in quotation marks. It now labels the same guidance as a summary and explicitly identifies the matching dice groups. This is a wording correction; it does not change dice or allocation mechanics.

## Follow-up cases

- Complete independent input, assignment, reload, boundary and edited-character cases for CH-01; distinguish a real invalid Core result from a GM-authorized override or a legacy record.
- Test all HP bands and distinguish human hit locations from nonhuman tables; verify fixed action points and any rounding ambiguities against the relevant pages.
- Verify the p. 9 height/weight choice and custom values through a signed-in save/reopen; assess what should happen for nonhuman species separately.
- Expand standard skill bases, culture and career entries to individual cases before using these results as a denominator for all character creation.

Nine JavaScript suites were run for this batch, including the new table checks. They are local automated tests, not a new live-service test. No overall rules percentage can be calculated from this partial set.

## Additional creation batch

Human characteristic validation now rejects non-integer values (including legacy/imported fractional points-build totals) without changing the saved values. Core p. 8 uses whole dice and point allocations. Automated tests cover a fractional 80-point build and preservation after reload. Live verification remains open. The broader subsystem remains in progress.
