# Roadmap to finish (written 2026-11-09)

The plan from today to a finished site. It follows the 8 groups in `subsystem-plan.md` (now **5/8**). `HANDOFF.md` holds the next step; this file holds the whole route. Update a phase's status line when it closes.

A group counts as finished only with its case list, source checks, code or GM handling, tests and live acceptance (`subsystem-plan.md`).

## Path to 8/8 (owner, 2026-11-10: no more side work until 8/8)

Order: **8 → 7 → 6.** Each Claude batch runs in a fresh session (AGENTS.md). Before building, check every case ID in its spec against the code and tests, because some spec rows are already built. Each batch ends with one PR and a paste-ready Work live list.

1. **8, Campaign and live integration.** No code is known to be left. Needs:
   - **Owner: decide D-S5.** Do the CI database permission tests count as the evidence for the direct-access steps?
   - **Work:** the two-account matrix in `docs/subsystem-8-closeout-20261109.md` (New code, Remove, Make GM, save conflict, gifts and pop-up, outsider privacy, backup, header route matrix). This needs two separate signed-in accounts.
   - **Chat:** fill in that closeout. **Claude:** fix any failures, then mark 8 closed. → 6/8.
2. **7, Creatures and GM procedures.** Specs: `creatures-remaining-code-20261109.md`, `creatures-rabble-underlings-cases-20261109.md` (Rabble/Underlings, CRTR-C21–C27), `creature-cases-batch-1.md`. Also review docs PR #230 (older; may be superseded by B18/B20). Claude builds the open cases, Work does one GM-tracker pass, Chat closes out. → 7/8.
3. **6, Magic and organisations.** One batch each, in this order:
   - Folk Magic finish (`magic-folk-finish-20261109.md`)
   - Animism finish (`magic-animism-finish-20261109.md`, `magic-animism-code-cases-20261109.md`; AN-F01 Trance done)
   - Mysticism (`magic-mysticism-code-cases-20261109.md`; MY-C03 reviewed in #252)
   - Sorcery and Theism/cults (`magic-sorcery-code-cases-20261109.md`, `magic-theism-cults-code-cases-20261109.md`; SO-C01 and TH-C02 together)
   - Organisations (`magic-organisations-code-cases-20261109.md`)

   Then a Work live pass on the Magic Audit fixture, and Chat's closeout. → 8/8.

## Phase 0: settle what shipped today (in progress)

- **Work:** run the Supabase server check (`server-check-20261109.md`), then the live batch for #231–#234: header, campaign manager, character sheet scroll, creature tools and the three #213 fixes.
- **Claude:** fix whatever that finds. Write the server fix migration if the check points at a trigger. Work runs it.

## Phase 1: close 8, Campaign and live integration → 6/8

What's left: production New code, Remove and Make GM; the permission checks Work couldn't do through the browser; conflict, gift and pop-up checks with two people at once.

1. **Claude:** fix the production RPC failure (from the Phase 0 result).
2. **Owner decision (D-S5):** Work's browser can't send raw API requests. Proposal: the database permission tests (`tests/db/permissions.cjs`, run in CI) count as the evidence for the direct-access steps, and Work checks the same rules through the app.
3. **Work:** two-account checks the app can show: New code, Remove, Make GM and their effects; the save-conflict warning; gifts and the new-item pop-up. Use two signed-in browsers, or one account on the phone.
4. **Chat:** write the Subsystem 8 closeout (inventory → evidence), like Combat's.
5. **Claude:** mark it closed in `subsystem-plan.md`.

## Phase 2: close 7, Creatures and GM procedures → 7/8

Done: B01–B19 built, with the source checked today.

1. **Claude:**
   - B18 builder path: build a player character from a GM-approved creature, with the INT 8+ floor and Points Build in the builder, and culture and career as normal.
   - B20 per-entry abilities (kept as GM-resolved notes).
2. **Chat:** list the rest of the creatures chapter (creature competence, balancing, Rabble/Underlings, other GM procedures). Specs cover code-needed cases only.
3. **Claude:** build that batch.
4. **Work:** one live GM-tracker pass.
5. **Chat:** closeout.

## Phase 3: close 6, Magic and organisations → 8/8

The biggest group. Spec first, one tradition per batch.

1. D-4 and D-5 are decided (`decisions.md`, 2026-11-09). Claude builds D-5's "hurt while casting" choices in the first Magic batch.
2. Batches, in order:
   - Folk Magic finish
   - Animism (spec exists: `magic-cases-batch-2-animism.md`)
   - Mysticism
   - Sorcery
   - Theism and cults
   - organisations and ranks

   Each batch runs Chat spec → Claude build and tests → Chat review → Work live check.
3. **Chat:** closeout.

## Phase 4: finish and polish (does not change the count)

- **Campaign creator redesign** (Mockup B, already designed). Ask Claude whenever.
- **Player style picker:** approved v0 looks as selectable themes.
- **Owner on a real phone:** sound, touch and layout once over every page. These are the checks no assistant can do.
- **Housekeeping (Claude):** split the very long lines in `experiments/practice-combat.html`; drop dead CSS left from old designs.
- **Optional, only if you ask:** The Pits unarmed combat.

## Rough size

Counted in Claude sessions, one batch each:

| Phase | Sessions |
|---|---|
| Phase 1 | 1–2 |
| Phase 2 | 2–3 |
| Phase 3 | 5–7 (one per tradition, plus fixes) |
| Phase 4 | 2–3 |

Each needs a Work live pass, and Chat work in between, which costs no credits.

## Decisions waiting on the owner

- **D-S5:** accept the database tests as evidence for direct-access permission steps (Phase 1).
- ~~D-4, D-5~~: decided 2026-11-09 (owner delegated): round up; casting interruptions per Core p.119, GM-prompted. See `decisions.md`.
- ~~Order of Phases 2 and 3~~: **Creatures first** (owner, 2026-11-09).
