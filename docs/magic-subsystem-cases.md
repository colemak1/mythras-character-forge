# Subsystem 6 verification ledger

This ledger consolidates existing implementation and session evidence. Source ranges come from the repository's Core scope register. Individual spell, Talent, miracle and spirit entries still require child cases. These rows are audit work packages, not verified whole chapters.

| Area | Existing evidence | Remaining before closeout |
|---|---|---|
| General magic, Core pp.112–120 | Starting allowance guidance and MP controls exist | Inventory rituals, learning, recovery, resistance, restrictions and interactions |
| Folk Magic, pp.121–129 | One live failed cast spent 1 MP; card cost corrected | Live success, critical, fumble, insufficient MP and recovery; spell-specific child cases |
| Sorcery, pp.161–177 | Live unshaped failure cost zero; absent Shaping blocks allocation; memorisation warning tested | Live valid shaped cast through reload, cancellation, final roll and cost; Combine grade and budget; individual spells and rounding interpretations |
| Mysticism, pp.154–160 | Live absent-Meditation gate; mocked final-turn, category-cost and reload checks | Live valid paired skills, preparation, cancellation, outcome costs, active ceilings; Talent child cases and rounding |
| Animism, pp.130–153 | Mocked bound-spirit eligibility checks | Live legal/illegal commands and saved status; source inventory for contact, binding, spirit combat, tricks and types |
| Theism, pp.178–191 | Mocked final-turn, pool cap and legacy-entry checks | Live pool/rank, donation, valid miracle preparation and costs; multiple-cult handling; miracle child cases |
| Organizations, pp.192–213 | Joining/promotion and training reference verified live for pp.196–199 | Remaining benefits, duties, restrictions, rank access and organization child cases |

## Next implementation and live batch

Use a dedicated persistent magic audit character, created through the normal builder or import workflow, with the paired skills required for valid Sorcery and Mysticism. Record its starting MP and configuration. The previous single-hobby character cannot exercise both skills simultaneously.

Exercise a valid shaped Sorcery cast and a valid Mysticism preparation through intermediate save/reload, cancellation, completion and outcome costs. Then exercise Animism commands and Theism pool/miracle workflows on suitable fixtures. Capture actual rolls and results; deterministic local cases cover outcomes that random live rolls do not produce.

Complete the source and child-case inventory alongside this work. User-entered names and GM adjudication do not certify individual abilities. Do not mark this subsystem complete from the workflow batch alone.

## Evidence limits

Local workflow tests substitute skill lookups, random rolls and cloud calls. They establish useful behavior under controlled inputs, but do not prove the live skill-selection and save path.

Temporary changes on Creation Audit — Human were removed after each magic walkthrough. Existing test roll histories can remain. No valid multi-turn magic walkthrough has yet been completed live.

## Paired-skill live batch — November 5, 2026

Fixture: Magic Audit — Paired Skills, a dedicated Quick Character created through the normal signed-in builder. Professional selections were changed through Quick Skills between tests. This character is retained for further checks.

- Sorcery: Duration 1, full cost 2 MP, two turns. Turn 1/2 survived reload at 11 MP. Final roll 41 against Invocation 49% succeeded, leaving 9 MP. A second preparation was cancelled at 9 MP using the deployed control.
- Mysticism: Mysticism (Audit Path) with Meditation, Augment category, Intensity 2. Turn 1/2 spent no MP. A normal character reopen preserved preparation. Final roll fumbled and spent the full 2 MP, leaving 7/11. A second preparation was cancelled without another charge. The Talent remained inactive.
- Theism: Exhort and Devotion (Audit Cult), recorded High Priest pool rank, pool 6, one Acolyte instance. Turn 1/2 survived reopening. Final roll succeeded and spent 2 devotional points, leaving 4/6. Cancellation of a second preparation left 4/6.
- Persistence failure: an immediate reload after the first Mysticism preparation lost that step. The preceding UI showed 1/2. Repeating the step and reopening normally preserved it. The cause and recovery path remain unverified. Do not close persistence on the basis of normal reopen alone.
- Remaining: all outcome branches, invalidation after edits, pool limits and donation live cases, Animism, individual ability inventory and broader magic interactions. These live cases do not close the subsystem.

## Recovery and Animism live batch — November 5, 2026

- On the deployed draft-recovery build, began an Acolyte miracle and immediately reloaded. The recovery prompt appeared. Accepting restored CASTING 1/2 with devotional pool 4/6. Cancelling cleared preparation and retained 4/6. This verifies the owner acceptance path. Decline and cross-owner behavior remain covered locally.
- Binding 29% gives a critical range of 3 and a spirit POW ceiling of 9. A GM-confirmed bound POW 10 spirit was rejected before rolling or charging MP.
- Changing the spirit to POW 9 allowed the command roll. The roll failed, the spirit ignored the command, and personal MP fell from 7 to 6. Uploaded Core p.136 was checked visually for the one-MP command and failure outcome.
- Marking that POW 9 spirit unbound blocked another command without charging MP. The fixture retains the unbound Audit Spirit for later work.
- Still open: legal command success/critical/fumble branches, maximum bound spirits by rank and CHA, spirit interaction and combat inventory, complete spell/Talent/miracle child cases, and remaining pool interactions. No subsystem closeout follows from this batch.
