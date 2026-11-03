# Character creation consolidation

- Final review distinguishes corrections, recorded GM overrides and manual details; the Finish action rechecks earlier edits. Full/Quick switches cannot transfer a reset skill-step override to another step.
- Core Background Events are explicitly optional; skipping retains notes and results. Official event summaries now reach the sheet and Markdown export.
- Saved dice assignments must match their pools; fractional manual values remain visible for correction.
- Repeated career subjects display together, with distinct specialities still chosen individually.
- Legacy unknown culture/career names remain recoverable without deleting their points on load.
- Corrected source notes for human measurements, Combat Style bases and fixed AP.
- Added 1,440 complete allocation/save-round-trip cases, all16 cultural travel choices, all216 ordinary 3d6 combinations and all24 career speciality/style contexts.

Testing: run all twelve `tests/*.cjs` suites. Live tests: fresh rolled creation; four cultures; custom offers/styles; Literacy cap; optional event skip and sheet output; correction/GM review; save and reload. See `docs/character-creation-completion.md` for exact evidence and boundaries. Subsystem count remains0/8 until the final deployed checks pass.
