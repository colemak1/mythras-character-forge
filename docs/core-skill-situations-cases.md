# Skill situations: initial audit cases

Authority: user-uploaded `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`, Mythras Core Rulebook, printed pp. 37, 45, 47, 50–51. The parsed PDF is garbled; rules and the differential table were checked on rendered page images.

| Case | Source expectation | Evidence and status |
|---|---|---|
| SK-01a: success and critical range | p. 37: 01–05 always succeeds; critical is one tenth of the modified skill, rounding up. | At 0%, 01–05 now succeed without inventing a 1% critical range. The tests exercise 0%, 1% and automatic-success boundaries. This zero case is a mathematical interpretation of the printed rule; a GM may adjudicate unusual situations. |
| SK-01b: failure and fumble | p. 37: 96–00 fail; 99–00 fumble, except skills over 100 fumble only on 00. | Existing regression tests cover 100%, 101% and boundary rolls. Other modifiers and live rolling remain separate cases. |
| SK-05a: opposed roll | pp. 50–51: higher success tier wins; same successful tier uses the higher roll; two failures go to GM description or reroll. | Existing calculator cases cover ties, same-tier wins and two failures. All tiers and player workflows have not been exhaustively live-tested. |
| SK-05b: high opposed skills | p. 51: subtract the highest participant's amount above 100 from every participant after other modifiers. | Shared reduction is tested, including a reduced 0% opponent. The app clamps negative adjusted numbers to zero; 01–05 still succeed. Rounding, multiple opponents and all conditions remain open. |
| SK-05c: differential rolls | p. 51: compare success levels as shown in the table; when neither side succeeds, neither gets a benefit. | Differential table code and selected calculator examples tested; table-wide independent fixture and live test remain open. |
| SK-05d: situational caps | p. 50: for a particular roll the GM may cap the primary skill at a lower secondary skill. Bureaucracy and Language include contextual uses on pp. 45, 47. | No general per-roll capping control was confirmed in this audit. Apply and record situational caps manually; do not permanently alter a skill for a temporary situation. |
| SK-05e: augmenting | p. 50: GM may allow one appropriate skill to augment another by twice the augmenting skill's critical range; original primary critical and fumble chances remain unchanged. | No general augmenting control was confirmed in this audit. The book's 33% example gives +7%, while twice its rounded-up critical range gives +8%; the source itself presents a rounding tension. Record a GM decision before implementing. |
| SK-05f: reattempt | p. 50: GM may permit a last attempt at one grade harder; a further failure ends attempts for the foreseeable future. | Manual table adjudication; no general tracked retry workflow verified. |

The zero-skill change is tested in code, not yet in the signed-in deployed site. These cases do not establish complete skill or book-wide coverage.
