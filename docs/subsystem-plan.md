# Mythras Forge Core verification plan

Progress: **5/8**: subsystems 1–3 retained, **5 (Combat) closed 2026-11-06** and **4 (Advancement, hazards and recovery) closed 2026-11-07**. Numbering is stable; partial work does not count as finished. A subsystem is finished only when its applicable Core rules and exceptions are inventoried, implementation or explicit GM handling is checked against the user's uploaded Core rulebook, meaningful automated cases pass, and relevant signed-in workflows are verified on the deployed revision. Open interpretations, unsupported behavior, and exclusions must be explicit. This is not a book-wide accuracy percentage.

1. **Character creation and background** — characteristics, attributes, cultures, community, passions, careers, age, bonus skills and creation flow. Complete for the Ordinary human Core Full Creation scope, with explicit GM-assisted handling and documented interpretations. See character-creation-completion.md for source, automated and signed-in deployment evidence. Other seven subsystems and supplemental workflows are not certified by this completion.
2. **Skills and task resolution** — standard/professional skills, difficulty, augmentation, caps, opposed/differential and group rolls, and task rounds. First pass checked Core pp. 37–38, 50–52 and 65–67, fixed an Automatic-grade regression, and exposed GM adjudication guidance in Play Mode. All 58 base skill formulas match p.53. Spoken fluency and the optional simplified modifiers have been checked against pp.38, 42, 47 and 51. The cap and augmentation calculator is covered by regression tests, and contextual outcomes are documented as GM adjudication or assigned to their dedicated subsystem. Signed-in verification passed in Play Mode and the Sheet for caps, augmentation, contested rolls, fluency, and Automatic checks. Automatic with an Advantage was covered locally. See the "Skills and task resolution audit" entry in ../CHANGELOG.md (originally CHANGELOG-SKILLS-TASK-AUDIT.md).
3. **Equipment and economy** — money, starting gear, armour, weapons, encumbrance and their entries. Starting money, social class, and base armour checked against Core pp. 23–24, 34, 58 and 77. Personal weapon and shield tables checked against pp. 63–65. GM-approved material overrides apply to ENC and initiative. Initial signed-in checks passed. Siege, vehicles, ammunition, manufacture and repair have a GM reference on Money & Gear. Fixed-price Core tools have editable inventory presets. Worn clothing and ENC thresholds passed automated tests. Signed-in follow-up passed for catalogue insertion, worn clothing and the equipment reference. The test character returned to 90 sp and 0 inventory ENC.
4. **Advancement, hazards and recovery**: **CLOSED 2026-11-07** for the Core PC scope (printed pp.68–85). Evidence:
   - **Inventory:** `advancement-cases-batch-1.md` (216 cases) reconciled in `advancement-reconciliation.md`: each group implemented with tests, GM-assisted by design, or an owner decision.
   - **Rule tests:** `advancement-cases.cjs`, `advancement-options.cjs`, `hazard-notes.cjs`, plus ageing and training in `core-batch-1.cjs` and `campaign-setup.cjs`.
   - **Source checks:** hazard notes (#161, implemented in #163); skill summaries and damage helper (#170, fixed in #171).
   - **Live acceptance:** steps (a)–(f) in #164 and (g)–(i) in #172 (owner-only, signed in, reload and account reopen).
   - **Owner decisions:** optional 1d6+1 skill improvement and the Passion shift helper (`decisions.md`).
   - **GM-assisted by design:** hazard timing, disease and poison courses, trauma outcomes, nonhuman ageing.
   - **Limits:** the live passes ran on the pre-Stone Play Mode; the Stone layout changed presentation, not advancement logic, and has its own pending walkthrough. A disposable test campaign's deletion was not re-confirmed after a browser reset (cleanup only).
5. **Combat**: **CLOSED 2026-11-06** for the PC-focused Core scope (printed pp.86–111). Evidence:
   - **Inventory:** `combat-closeout-review.md` maps every chapter section and all 43 Special Effects to the 380-case ledger.
   - **Rule fixes and tests:** Batches 2–4 implemented with regression tests (`tests/combat-batch2.cjs`, `combat-batch3.cjs`, `combat-closeout.cjs`).
   - **Live acceptance:** PRs #145, #149, #151, then the final integrated fight (#155, steps 1–7) and its step-8 re-check (#157).
   - **Interpretations:** recorded in the ledger, e.g. Knockback has no extra starting metre (p.104).
   - **GM-assisted by design:** positioning, multi-actor combat and complex wound outcomes.
   - **Out of scope:** creature anatomy and Rabble/Underlings belong to Subsystem 7; multi-account combat to Subsystem 8.
   - **Known evidence limit:** the final fight had full MP, so MP recovery from a deficit was not exercised (MP recovery stays manual under D-2).
6. **Magic and organizations** — all Core traditions, spells, spirits, cults, ranks and interactions. Partial audit. See magic-subsystem-cases.md for the consolidated gaps and next batch.
7. **Creatures and GM procedures** — creature traits and statistics, GM systems and applicable optional rules. Inventory incomplete.
8. **Campaign and live integration** — campaign configuration, permissions, GM/player workflows, persistence, imports and deployment verification. Partial live evidence; incomplete.

The guided combat practice tutorial is a later feature, after the builder is verified and corrected; it is not included in the finished count. New work outside these subsystems must be identified explicitly. Detailed source and case tracking remains in `core-rule-scope.md` and linked audit files.


## Reconciliation

Earlier conversational reports advanced 4 and 5 after a handful of live examples. Those examples remain evidence, but they do not meet this plan’s complete-subsystem definition. The first three prior closeouts are retained for their stated scope; this reconciliation does not extend or independently recertify them.

A small release or individual test does not advance the subsystem count. Report progress against the same eight groups. A completion claim needs the group’s case inventory, source checks, implementation or explicit manual behavior, regressions and applicable live workflows.

The earlier 70–85% estimate is withdrawn. No complete denominator or weighting exists for a current book-wide accuracy percentage.
