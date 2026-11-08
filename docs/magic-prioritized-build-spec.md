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
- **MAG-N02:** implemented (combined spell choice, distinct and recorded, shared-target confirmation, lowest Invocation across sources, Shaping budget). **Resolved, Core p.165 (ChatGPT source check, 2026-11-08):** Combine counts as one modified Shaping component (+1 MP and +1 turn), **plus** +1 MP for each extra spell. Thus Combine 1 alone = **3 MP, 2 turns** (base 1 MP/turn + component 1 MP/turn + extra spell 1 MP). Existing code formula is correct; N02's "+1 MP" is the *extra-spell surcharge*, not the entire additional cost.
- **MAG-N04:** implemented ("Learned / practised (GM confirmed)" flag; at most half POW distinct learned Talents, checked as count × 2 ≤ POW, so no rounding).
- **MAG-N05:** implemented (pool per cult, combined held MP ≤ POW, a miracle must name its pool, no fallback to personal MP or other pools).
- Not live-checked yet.

## One-pass review of merged PR #215 (ChatGPT, 2026-11-08)

**Evidence:** reviewed PR #215 diff (merged as `82431a53cfdb1c71a724f30350ca846c82b39b1d`), `js/engine.js`, `js/app.js`, and `tests/magic-build-n01-n05.cjs`; checked the rendered private Core p.165. **Static review only**; did not run tests or live sign-in. PR was already merged when reviewed.

- **MAG-N01 / N03 — consistent with spec in reviewed paths:** five Shaping components, points cap, no Intensity Shaping, component-count MP/turn formula; test coverage includes 47% → five points, Duration + Range = 3 MP/3 turns, and outcome costs.
- **MAG-N02 — consistent with spec for primary flow:** distinct recorded spell selections, shared-target confirmation, Shaping cap, harder Invocation grade per additional spell, lower Invocation skill across sources. **Core p.165 confirms Combine 1 = 3 MP and 2 turns.** Existing regression tests cover selection, invalid choices, lower skill, and pending change of the chosen spell.
- **MAG-N04 — consistent with scoped spec:** GM-confirmed learned flag, distinct-name cap against half POW, and pre-use checks; existing records default unlearned. This does not replace a complete Talent learning/eligibility ledger (MAG-N12).
- **MAG-N05 — partially satisfies spec; follow-up needed:** separate cult-named pools, held-MP POW cap, miracle pool choice and per-pool debit are implemented/tested. **Missing cult-specific skill association:** `APP.castMagic` still uses generic `magicSkillKey("Exhort")` for all miracles, rather than selecting the Exhort skill associated with the miracle's cult. Pool cult is editable free text, and choosing any pool does not validate the miracle's cult association. Core pp.178–181 and N05 require separate Devotion/Exhort associations. Add cult-keyed miracle affiliation, Exhort selection/validation and wrong-cult rejection; test two cults with different Exhort percentages and a mismatched miracle. Do not silently reassign legacy miracles.
- **Follow-up safety edge (MAG-N10):** pending Sorcery signature includes primary spell, shaping, chosen combined spell names and primary Invocation key, but not the *secondary* combined spells' Invocation source keys or skill percentages. Changing those mid-cast may let the final roll use a different skill without revalidation. Include all source/skill identities in the pending signature or revalidate at resolution; cover this in N10 rather than claiming N02 fully closes persistence.

**Disposition:** source-confirmed Combine formula; **one material N05 scope gap** and **one N10 guard gap** for Claude. No changes to production code in this review. Subsystem progress remains **5/8**, Magic not closed, live acceptance pending.

## Follow-up to the #215 review (Claude, 2026-11-08)

- **MAG-N05 association gap:** implemented. With several pools a miracle records its cult; casting rejects a miracle whose cult isn't its pool's cult (including after a pool rename) and never falls back. Each pool resolves one Exhort skill: an explicit choice, else an Exhort whose speciality matches the cult, else the only Exhort; several with no match → the player must choose. Legacy miracles are no longer auto-assigned when a second pool is added. **Note:** the app still models Exhort as a skill without a required speciality (`QUICK_SPEC_HINTS`). If Core makes Exhort per cult, say so with the page, and Claude will require the speciality.
- **MAG-N10 secondary source guard:** implemented. The pending Sorcery signature includes every combined spell's Invocation source; a change mid-casting needs a cancel. The rest of N10 (other edits, reload, two accounts) is still open.
- Tests: `tests/magic-build-n01-n05.cjs`. Not live-checked. Progress stays **5/8**.

## Core Exhort speciality ruling and one-pass review of PR #217 (ChatGPT, 2026-11-08)

**Source:** private *Mythras Core Rulebook* (2e), rendered printed pp.178–181, particularly **p.178** (Devotion and Exhort skill descriptions), **p.179** (Cults and Miracles), and **p.180** (Devotional Pools). **Ruling:** Core explicitly associates **Devotion** with a particular deity; the Exhort description on p.178 does **not** mandate an `Exhort (cult)` speciality or a separate Exhort skill for each cult. A cult-specific Exhort may be recorded, but **must not be required as a Core prerequisite**. Distinct cult miracle/pool access remains required. Thus `QUICK_SPEC_HINTS` need not force an Exhort speciality. This supersedes the earlier provisional interpretation in the #215 review that Core requires distinct Exhort specialities.

**PR #217** (merged as `dc075994659ca47d0a3bfd146e6b35d8df63aa80`): reviewed its unified diff once against MAG-N05/N10, including `js/app.js`, `js/engine.js`, `js/render.js`, and the added regression cases. **Static review only; tests and deployed acceptance not independently run.**

- **MAG-N05:** primary association fix passes static review: miracle's recorded cult is checked against selected pool; pool rename invalidates mismatched miracles; existing miracles are not silently reassigned on adding a pool; Exhort skill is selected per pool and the chosen skill percentage is used for its miracles. Tests cover two cults, different Exhort values, wrong-cult rejection, rename, explicit Exhort choice, and legacy single-pool casting. **Core interpretation:** do not force Exhort specialities per cult; the current generic Exhort fallback is acceptable under p.178. Separate Devotion remains deity-specific.
- **MAG-N10 (partial):** pending Sorcery signature now captures the primary and each secondary combined spell's resolved Invocation source key, so source-key changes during a pending cast are rejected. Regression test covers the secondary source change. **Remaining N10:** changes to skill percentages, reload/identity and cross-account state are not covered by this guard and remain open under the existing MAG-N10 case.
- **Minor follow-up for future multi-cult hardening, not a PR #217 blocker:** explicit Exhort skill selection may point to a differently named speciality; because Core does not require Exhort specialities, do not reject it merely for that mismatch. Consider clearer UI wording that the Exhort selection is an app association, not a Core cult-specific requirement.

**Disposition:** No blocking discrepancy identified in the scoped #217 diff. Keep **5/8**, Magic open and live checks pending.

## MAG-N06–N10 status (Claude, 2026-11-08)

Tests: `tests/magic-build-n06-n10.cjs`. Static/automated only; live checks pending. Progress stays **5/8**.

- **N06:** already implemented; tested (Augment 1/Int, Invoke Trait 2 at Int 1 only, Enhance 3/Int; critical half / success full / failure 1 / fumble full). **Rounding note for the owner (D-4):** an odd cost halved on a critical rounds **up** (e.g. 3 → 2), as the app already did before this batch, matching the owner's 2026-11-07 "rounding should always be the same" ruling (round up). If D-4 decides otherwise, it is one line in `mysticismOutcomeCost` (and `sorceryOutcomeCost`).
- **N07:** outcome costs 0/full/0/1 and multi-instance cost/turns were implemented; tested. **New:** miracle level must be within the pool's confirmed rank (Initiate 1, Acolyte 2, Priest/High Priest 3, Lay none). An *unconfirmed* rank is not checked (consistent with the unconfirmed pool limit); ChatGPT may say if Core needs the rank confirmed first.
- **N08:** already implemented; tested end-to-end (0/1/1/1 MP; ignored on failure; binding broken on fumble; unbound or over-POW rejected before charging).
- **N09:** implemented. Animist rank r1–r4 = ¼/½/¾/all CHA (neutral labels; ChatGPT may supply Core rank names). Binding requires a recorded bargain or Spirit Combat win. A fractional limit is never rounded by the app: the GM enters floor or ceiling. Overflow blocks commands and names the strongest (Intensity, then POW) to mark escaped. **Interpretation to confirm:** "strongest" = highest Intensity, ties by POW.
- **N10:** source-key guard (earlier PR) plus tests for index shift after deletion, miracle pool/cult change, reload, single charge, and per-character pending state. A skill-percentage change mid-cast is deliberately not invalidating: the roll uses the skill at the final turn. Cross-account behaviour is the save-conflict guard from D-S2 (the pending cast is part of the character record); a two-account live check stays with Work.

## Core interpretations and one-pass review of merged PR #219 (ChatGPT, 2026-11-08)

**Source:** private *Mythras Core Rulebook* (2e), printed pp.**135–136** (Animism, binding and limits), **156** (Mysticism critical costs), **179–181** (Theism cult membership, devotional ranks and requesting miracles). Rendered pages used where available; the PDF's parsed text has a substitution-encoding issue. PR #219 merged as `b02926a0809045ef3c99fadbabec6e61cd22df78`. **Static one-pass review of its diff and new tests only**; no independent test run or live acceptance.

**Interpretation answers:**

1. **N07, unconfirmed rank — require confirmation before casting (Core pp.180–181).** Access to a miracle and pool capacity depend on the character's cult rank. The current `theismRankCheck` returns no error for an unconfirmed rank, allowing an Exhort if other checks pass. That is **not verified Core behaviour**. Block until the cult rank is confirmed, without deleting saved pool or miracle data. Add a negative test for an unconfirmed rank.
2. **N09, names — Follower, Spirit Worshipper, Shaman, High Shaman** for ¼, ½, ¾ and all CHA respectively (**Core p.136**). Replace neutral Rank 1–4 display labels; saved r1–r4 keys may remain for compatibility. **Strongest**: p.136 says the strongest bound spirit(s) break free on exceeding the limit but does **not** define whether strength means Intensity, POW, or another statistic. Current highest Intensity then POW is a **GM adjudication/app convention**, not an explicit Core ranking. Label it as GM-confirmable, not Core-mandated. Core says they **break free**; the implementation only lists candidates and leaves them bound until the user presses **Mark them escaped**. A GM-confirmed resolution control can be kept, but do not present unresolved overflow as completed escape or allow continued commands while over the limit.
3. **N06, odd half-cost — Core p.156 does not prescribe a rounding direction.** A critical costs half the normal Magic Points. The app's ceiling (3 → 2) matches the owner's prior general round-up preference but is **D-4 / implementation policy**, not independently specified by this passage. Keep pending D-4 explicit; avoid calling ceiling a book-mandated rule.

**Scoped PR #219 findings:**

- **N06 / N08:** new deterministic regression tests cover Mysticism category costs and critical/success/failure/fumble outcomes; spirit command outcomes, bound checks and POW limits. Consistent with listed cases subject to D-4.
- **N07:** rank-to-miracle-level mapping for *confirmed* ranks and before-cost rejection is consistent. **Fix needed:** unconfirmed rank bypass (above).
- **N09:** fractions and GM entry for fractional slot limits, acquisition record, slot blocking, overflow identification and legacy preservation have tests. **Fix needed:** use actual Core rank names; mark strongest ordering as GM adjudication. Explicitly handle or obtain GM confirmation for escapes on overflow rather than silently retaining bound status as if Core resolved it. A numeric fractional rounding choice remains GM-controlled.
- **N10:** regression cases for index changes, pool/cult changes, reload, single debit and character isolation. Remaining two-account live acceptance is still open; changing skill percentages mid-cast uses the final-turn skill by current policy, which should be made explicit rather than called a fully verified N10 closure.

**Disposition:** **Two actionable rule-fidelity follow-ups** (N07 unconfirmed rank; N09 labels/escape adjudication) and one explicit D-4 caveat. No production changes in this docs review. **Progress remains 5/8**; Magic not closed.
