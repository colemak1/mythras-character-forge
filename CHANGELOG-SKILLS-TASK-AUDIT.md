# Skills and task resolution audit

Subsystem 2 update. Source: uploaded Mythras Core Rulebook, pp. 37–53 and 65–67.

- Skill Advantages preserve the Automatic grade. Very Easy remains the easiest grade that requires a roll.
- Native Tongue and learned Languages display spoken fluency on the Sheet and in Play Mode. Direct skill rolls are blocked for both.
- All 22 Standard and 36 Professional formulas match the Core summary (p. 53). The optional simplified difficulty and contest modifiers are documented for manual GM use (pp. 38, 51).
- Play Mode's Skills section now includes GM guidance for retries, augmentation, caps, group rolls and task rounds. The guidance is a reference for manual adjudication.
- The Play Mode reference includes a calculator for one capped or augmented roll. It uses the unaugmented skill for critical and fumble thresholds, and rounds the augmentation to the nearest whole percent to reproduce the book’s example.
- Existing automated tests cover d100 outcome boundaries, all 16 differential outcomes and selected opposed and over-100 cases.

## What to test

- In Play Mode, choose Automatic with an applicable skill Advantage and no harder condition. The roll button should report that no roll is needed. Under Standard, the same Advantage should make the roll Easy.
- Expand **GM skill and task rulings** under Skills. Compare its guidance to the Core pages above, including the task-round progress for all four outcomes.
- In **GM skill and task rulings**, augment 38% with 33%. A roll of 4 is Critical, 5–45 succeeds normally, and 46 fails. Capping 48% with 23% produces a 23% target.
- In the contested roll calculator, enter 130% vs. 90% and rolls of 10 and 70. Expect adjusted skills of 100% and 60%, a Critical versus Failure and a two-level differential.

## Skill-specific handling

| Core rules | Forge handling |
| --- | --- |
| Native Tongue and Language, pp. 42, 47 | Display fluency. Use the cap calculator for a verbal check limited by fluency. The GM adjudicates related dialects. |
| Literacy, p. 47 | Linked Literacy is capped by its spoken language. Existing unlinked entries are flagged for manual review. |
| Lockpicking and Mechanisms, pp. 47–48 | Use the contest calculator for Lockpicking opposed by the maker’s Mechanisms. If the maker’s value is unknown, the GM sets the difficulty. |
| Conditional skill outcomes, pp. 38–50 | The generic roller gives a tier. The GM applies situational consequences such as follow-up Influence, Insight or Locale grade shifts. Injury, movement, advancement, combat and magic automation are audited in their respective subsystems. |
| Crafting and extended tasks, pp. 65–67 | Play Mode shows the progress changes for each tier. The GM tracks elapsed rounds, decides deadlines and applies quality and enhancements. |

## Remaining verification

Verify these workflows on the signed-in deployed revision. The completed subsystem count remains 1/8.
