# Character and skill spot checks

Source: user-uploaded Mythras Core Rulebook, printed pp. 8–10, 29 and 37–38, visually checked against the rendered pages. This is a bounded review, not a full chapter audit.

1. Human height and weight (pp. 9–10): previous estimate did not use Core ranges or the three weight columns. Corrected for humans; midpoint is an app default, and the player may choose within the range. Existing overrides are retained. Nonhuman estimate remains unverified.
2. Action points, experience modifier, healing rate, luck and human location HP (pp. 8–10): compared thresholds and formulas with engine.js and added boundary checks. This does not verify nonhuman hit locations or the rest of the attributes.
3. Skill outcomes (p. 37): checked normal success, critical threshold, automatic success/failure and fumble boundaries in resolveRoll; added examples. This is not a review of opposed rolls or every caller.
4. Difficulty grades (p. 38): verified the table and the rule that the hardest penalty takes precedence. PR #71's treatment of relative encumbrance as a grade from Standard remains an interpretation, not explicit text in this table. This is not a complete interaction audit.
5. Agent, Alchemist, Beast Handler and Courtesan career skill lists (p. 29): compared to data.js and found no differences in the listed choices. The other careers and selection workflow were not part of this spot check.

All nine Node test suites were run after the height/weight change; they do not establish live browser or production persistence. Source page images were used for tables and lists.
