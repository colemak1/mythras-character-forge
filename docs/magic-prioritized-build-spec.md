# Subsystem 6 — Magic: prioritized buildable open cases (2026-11-07)

**Source:** private *Mythras Core Rulebook* (2e), printed pages; verified source cases in [magic-subsystem-cases.md](magic-subsystem-cases.md) and implementation status in [magic-cases-batch-1.md](magic-cases-batch-1.md). **Not a request to implement all magic now:** owner has deprioritized it. Each line below is a **code-needed** scenario, not an already-passing feature. Preserve owner choices **D-2** (MP recovery manual), **D-3** (no automatic active-spell tracking outside Mysticism), and pending **D-4/D-5**. Do not resurrect the old Folk catalogue bug: PR #118's 70-choice/Beastcall acceptance **passed**.

| Priority / ID | Given → code behavior / deterministic test | Core |
|---|---|---|
| P0 MAG-N01 | Sorcery Shaping 47% gives **5 points**; sum across **Combine, Duration, Magnitude, Range, Targets** cannot exceed 5. **Intensity is not selectable Shaping**. Preserve/migrate legacy save fields without silently treating old Intensity as Magnitude. | pp.161–162 |
| P0 MAG-N02 | Sorcery Combine 1 combines **two different spells**, shared target(s), one harder Invocation grade and +1 MP; use lower Invocation if from distinct sources. Combined components must fit MAG-N01's budget. | pp.162, 165 |
| P0 MAG-N03 | Sorcery cost/turns depend on **number of modified components**, not total Shaping points: e.g. Duration 1 + Range 1 = 3 MP and 3 turns, with final-turn roll. Critical half cost; failure 0 MP; fumble full cost. | pp.162, 165 |
| P0 MAG-N04 | Mysticism 34% permits Intensity **2**, not 3; separately reject total active Intensities above Meditation/10 and more than half POW distinct practiced Talents. A catalogue entry is not automatically a learned Talent. | pp.155–157 |
| P0 MAG-N05 | Theism multi-cult: separate Devotion/Exhort associations and devotional pools; combined held pool MP ≤ POW. Reject casting from wrong/insufficient pool; don't silently use personal MP. | pp.178–181 |
| P1 MAG-N06 | On final Mysticism roll, critical/success/failure/fumble spend **half/full/1/full** MP respectively; enforce Invoke Trait 2 MP and Enhance Attribute 3 MP per intensity. Half-cost rounding remains subject to D-4; don't encode an unapproved rounding choice. | p.156 |
| P1 MAG-N07 | On final Theism Exhort roll, critical/success/failure/fumble spend **0/full/0/1** devotional MP; enforce miracle rank, pool ceiling and multi-instance extra turns/cost. | pp.180–181 |
| P1 MAG-N08 | Bound spirit command critical/success/failure/fumble: **0/1/1/1 MP**, with command, ignored until next turn, or broken binding/escaped spirit respectively; reject unbound or POW-over-limit before charging. | pp.131, 135–136 |
| P1 MAG-N09 | Bound-spirit slots by rank: ¼/½/¾/all CHA, with strongest spirit(s) escaping on overflow; require GM-confirmed spirit acquisition via bargain or Spirit Combat before binding. Rounding is an open interpretation; avoid a hidden default. | pp.135–136 |
| P1 MAG-N10 | Invalidating a pending multi-turn cast by editing paired skill, spell, intensity, pool or character identity must cancel/revalidate the pending request **without** free effect or double charge; test reload/reopen and two accounts. | pp.119, 155–156, 165, 181 (app persistence guard) |
| P2 MAG-N11 | General casting while preparing: reject incompatible non-reactive actions, distinguish AP-spending defensive reactions that **delay** completion from interruptions; injury/mental disruption follows D-5's manual GM guidance until owner approves automatic wound hooks. | p.119 |
| P2 MAG-N12 | Add **learning/eligibility ledger** for new Folk spell (3 Experience Rolls + 1 week) vs other abilities (5 + 1 month), with GM approval and earned spell known separately from a catalogue entry. | pp.118, 121 |
| P2 MAG-N13 | Implement only **source-checked ability children** as GM-assisted effects or explicit mechanics: spirit combat/types/tricks, each Talent, Sorcery spell, miracle and cult benefit. Every child gets a source page, valid target, resistance, duration, cost, and persistence fixture; no blanket 'all magic verified' claim. | pp.137–153, 157–160, 166–177, 182–213 |

**Already correct / reuse (one line):** Folk 70-choice catalogue and Beastcall acceptance, normal Folk roll costs, three-tradition preparation recovery, and a bounded-spirit rejection case have prior evidence; do not rebuild them.

**Recommended Claude batch:** one code PR for **MAG-N01–N05** with boundary tests, followed by **N06–N10**; P2 waits for owner priority and D-4/D-5. Each PR should update the existing magic ledgers with implemented vs GM-assisted evidence. Do not treat source-only cases as passing or advance 5/8 without child-case closeout and live checks.

## Implementation status (Claude, 2026-11-08)

- **MAG-N01, MAG-N03:** already implemented; now covered by `tests/magic-build-n01-n05.cjs`.
- **MAG-N02:** implemented (combined spell choice, distinct and recorded, shared-target confirmation, lowest Invocation across sources, Shaping budget). **Open question for ChatGPT:** the app charges Combine as a modified component (+1 MP, +1 turn) *and* +1 MP per extra spell, so Combine 1 alone costs 3 MP and 2 turns. N02 / SO-B05 read as "+1 MP" in total. Please confirm Core p.165 for Combine's MP and turns; the formula is unchanged until then.
- **MAG-N04:** implemented ("Learned / practised (GM confirmed)" flag; at most half POW distinct learned Talents, checked as count × 2 ≤ POW, so no rounding).
- **MAG-N05:** implemented (pool per cult, combined held MP ≤ POW, a miracle must name its pool, no fallback to personal MP or other pools).
- Not live-checked yet.
