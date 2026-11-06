# Changelog

All release notes, newest first. Add new entries at the top of this file; do not create new `CHANGELOG-*.md` files.
Entries before November 5, 2026 were merged from separate `CHANGELOG-<TOPIC>.md` files; each entry is preceded by a comment naming its original file.

---

## Security: GM notes hidden from players; campaign assignment checks

- **GM session notes and the Combat Tracker are now GM-only.** They used to be stored on the campaign record, which every player in the campaign can read, so a player could see your notes and NPC stats with their browser's developer tools. They now live in a separate table only the GM can read.
- **Needs the owner to run the database change once:** open Supabase → SQL Editor, paste `supabase/migrations/20261106120000_gm_private_state_and_assignment_checks.sql`, and run it. It copies existing notes and tracker data across. Until then, the app keeps working the old way.
- The same change stops a player moving their character into a campaign they don't belong to, and makes the GM inventory function accept only an item list.
- All 183 campaign and account cases (ChatGPT, PR #129) are mapped in `docs/campaign-cases-batch-1.md`, with four decisions for the owner and a multi-account test plan.

---

## Subsystem 8 — Campaign and live integration case inventory (docs-only)

- Added `docs/campaign-cases-batch-1.md`: **183** app-acceptance cases across **10** groups for campaign setup/rules, auth and account isolation, invites, character ownership and assignment, Party Board/GM tools, save/reload/concurrent edits, imports/backups, backend RLS/RPCs, campaign continuity, and end-to-end session workflows.
- Cases use **App/security contract — not Core** where no rulebook rule applies; Core pp.72–73 are cited only for the two characteristic advancement methods.
- **Highest priority:** deny unrelated-account access, ensure members' read-only character views and the GM's narrowly scoped inventory/unassign rights, prevent stale autosaves from undoing assignments or losing progress, and keep the GM's campaign accessible through creation/service failures.
- Source review used current client code and project decisions, **not live server migrations**. No implementation passes, signed-in test results, or server-policy certification are claimed. **Subsystem 8 open; project progress 3/8.**
- Docs only; no JavaScript, CSS, HTML, tests, Supabase or deployment settings changed. Full local Node suite not run (repository checkout unavailable); CI/Claude must verify.

---

## PR #128 live acceptance blocked on test-session setup (2026-11-05, America/Los_Angeles)

- Confirmed live GM sign-in and DM campaign access. The inspected New Campaign has only the DM member and no linked characters. An independent test-player browser session was not established.
- Item reveal/notice ordering, acknowledge-and-reload behavior, and third-item/AP-save concurrency remain **not run**, not passed or failed. No items, campaigns, memberships, characters or AP were changed; campaign creation was abandoned before submission.
- HANDOFF.md records the missing prerequisites and exact remaining checks. Documentation only; progress remains 3/8.

---

## New item pop-ups for players

- **GM:** open a player's sheet from the Party Board, go to Inventory, and use **Give an item** (name, quantity, ENC, cost, an optional note). Tick **Reveal** for the full-screen reveal; leave it unticked for a small notice.
- **Player:** the next time their sheet loads or saves, or within about 30 seconds while Play Mode is open, they see "New item" with the item's name, details and your note. The full reveal is a dark crimson panel with a slow light burst (still for anyone who has reduced motion turned on). Each gift shows once; several gifts queue up one after another. Gifted items are tagged "new", then "gift", in the inventory list.
- **Fix:** a player's open sheet used to save its whole inventory, so anything the GM added while the player was in Play Mode could be erased by the player's next autosave. Their sheet now pulls in the GM's gifts before saving. Items the GM edits in other ways (not through Give an item) can still be overwritten this way; that's a wider fix for later.

To test: as GM, give a test character an item with Reveal ticked. Open that character as its player: the reveal appears; Continue dismisses it and it doesn't come back after a reload.

---

## Advancement rulings: 20-point trainers and maiming

- A mentor exactly 20 percentage points better than the student now trains on the first row of the Training Improvement table (1d2). The book's text says "at least 20%" but its table starts at 21%; the owner ruled for the text.
- Play Mode's permanent-injury box now shows the Core p.80 Permanent Injury results for the selected location. Results 1 and 2 remove one third or two thirds of its HP, with the HP lost rounded up; result 3 leaves 1 HP. Click a result to fill in the new maximum, then confirm. A location never drops below 1 HP.
- Both rulings are recorded in `docs/decisions.md`.

To test: in Play Mode, select a location, open "Permanent injury: location maximum" and check the three buttons (e.g. a 5 HP arm shows 3, 1 and 1). In the Experience panel, train a skill with a mentor exactly 20 points higher: it should gain 1–2%.

---

## Combat follow-up live acceptance after PRs #121/#122 (2026-11-05, America/Los_Angeles)

- One signed-in batch passed all six requested checks: initiative/surprise/reset, action groups, Club-linked Special Effects, unfamiliar-weapon penalty/floor, Unarmed combat tools and nonzero armour subtraction.
- Club success at 35% blocked Bleed and allowed Stun Location. Dagger Broadly similar rolled at Hard 23% from 35%, and retained the 20% STR+DEX floor when using a 20% style. Chest armour AP 1 reduced 4 damage to 3 HP.
- Restored temporary weapons/armour, HP, money, AP, initiative and surprise; retained roll evidence. Updated `docs/combat-cases-batch-1.md` and `HANDOFF.md`. All 19 local test files passed. No production code changed; Subsystem 5 stays open, progress 3/8.

---

## Advancement cases mapped; unarmed damage display fixed

- All 216 Advancement, hazards and recovery cases (ChatGPT, PR #124) now have an app status in `docs/advancement-cases-batch-1.md`. No incorrect calculations were found: Experience Rolls, improvement, characteristic training and permanent improvement, new Professional Skills, ageing, Fatigue and natural healing already match the book. Hazards, disease and traps stay GM-assisted.
- Two rulings are needed from the owner: trainer exactly 20% better, and how to round a third or two thirds of a maimed location's HP.
- Fixed the doubled plus sign on the Unarmed damage line found in the live check (PR #123): it now reads "1d3+1d2", "1d3-1d4", or just "1d3".

---

## Subsystem 4 — source-verified advancement, fatigue, healing and hazards cases

- Added `docs/advancement-cases-batch-1.md`: **216 individual acceptance cases** across ten groups for Core Experience Rolls, skill and Passion improvements, temporary/permanent characteristic boosts, mentor training, ageing, fatigue/exertion, medical and natural healing, maiming, environmental hazards, disease/poison conditions and examples, survival, traps, weather, Luck Points and relevant interactions (printed Core pp.68–85 with cited supporting pages).
- Checked original PDF and visually verified key ageing, training, disease, Fatigue, falling, fire, maiming and trap tables. Explicitly left the exact +20 training differential and fractional maiming calculations for GM/owner interpretation rather than inventing missing rules.
- **Documentation only:** implementation/test status, live acceptance and GM-managed scope remain for Claude's mapping. Subsystem 4 is **OPEN**; 3/8 prior closeouts retained. No JS, HTML, CSS, tests or deployment configuration changed; local Node suite not run; CI is the required PR test signal.

---

## Combat live acceptance after PR #121 (2026-11-05, America/Los_Angeles)

- Signed-in checks passed for initiative arithmetic/manual d10/New Round retention, the three action groups and sampled 1-AP buttons, human unarmed stats, a successful attack against No parry, and selecting Press Advantage.
- Temporary chest armour AP 2 reduced 5 entered damage to 3 HP (Chest 7→4/7, Minor Wound). Restored the audit fixture's HP, armour, silver, AP and initiative; retained test roll evidence.
- Documented a cosmetic unarmed damage double plus (`1d3 + +0`), with correct numeric values. No production code changed. Full evidence and limits are in `docs/combat-cases-batch-1.md`; `HANDOFF.md` updated. All 19 Node test files passed. Subsystem 5 remains open; progress 3/8.


---

## Combat: weapon-specific Special Effects, unfamiliar weapons, surprise

- **Roll with a weapon.** Each carried weapon in Play Mode has a roll button for the Combat Style that covers it, and Unarmed has its own. The roll remembers the weapon, and the Special Effects list then hides effects that weapon can't use. A club can Bash and Stun Location but not Bleed; only ranged weapons get Marksman; only Small weapons get Remise. You can also set "Weapon used" on any combat roll. With no weapon set, every effect stays available.
- **Unfamiliar weapons (Core p.88).** A weapon outside your Combat Styles offers the book's choices: similar (no penalty), broadly similar (1 grade harder), reasonably different (2 grades), used with a trained weapon (1 grade), substantially different (base STR+DEX). The penalty never takes you below STR+DEX.
- **Surprised (Core p.105).** A toggle on the Actions tab: initiative −10, Attack disabled, and a reminder that you can't defend until your initiative and the first hit on you gains an extra Special Effect. New Round clears it.
- Unarmed rolls now count as combat rolls, so they get the attack/defence and Special Effects tools.

To test: in Play Mode, roll a carried club, mark it as an attack, click "No parry", and open Special Effects: Bleed should not be choosable but Stun Location should. Tick "Surprised" and roll initiative: it should be 10 lower.

---

## Combat: Core action list, initiative roll, unarmed stats, and case mapping

- **Action list** in Play Mode now follows Core pp.91–93: proactive actions (Attack, Brace, Cast Magic, Change Range, Dither, Hold Magic, Mount, Move, Outmanoeuvre, Ready Weapon, reloads, Regain Footing, Struggle), reactive actions (Counter Spell, Evade, Interrupt, Parry) and Free Actions at 0 AP (Delay, Assess Situation, Drop Weapon, Signal, Speak, Use Luck Point, Ward Location). Non-Core labels like "Change Combat Stance" and "Shove / Grapple" are gone. Each action shows its conditions.
- **Initiative roll:** roll 1d10 + your current Initiative Bonus (armour and Fatigue included), or type in your own d10. It stays for the whole fight; New Round doesn't clear it.
- **Unarmed attacks** are always listed: 1d3 + Damage Modifier, Size S, Reach T (Core pp.105–106).
- All 191 Combat cases from ChatGPT are mapped to app status in `docs/combat-cases-batch-1.md`. Claude checked the Differential table (p.51), armour initiative penalty (pp.58, 90), Combat Actions (pp.91–93) and all 43 Special Effects (p.100) against the book: the app matches.
- New `tests/combat-cases.cjs` covers AP, initiative, the action list, Differential results, no-parry, the parry Size matrix, hit locations, wound levels, armour on applied damage, and all 43 Special Effects' eligibility.

To test: open Play Mode, Actions tab. Click "Roll initiative" and check the total is your d10 plus the Initiative shown in the top bar. Check that the action list has Proactive, Reactive and Free groups, and that "Unarmed (human)" appears under weapons.

---

## Subsystem 5 — Combat Core case inventory (documentation only)

- ChatGPT added `docs/combat-cases-batch-1.md`: 191 individual **Given → Core p.N → expected app behaviour** cases for action economy, AP and initiative, Combat Styles, attacks/parries, all 43 Special Effects, melee/ranged situational rules, damage, armour and wounds (Core Combat pp.86–111, plus supporting pp.8 and 51).
- Cases identify GM-assisted rules and the enabled optional Reach/Range rule. This is a source-verification batch only: the implementation status, automated tests and signed-in acceptance remain for Claude/ChatGPT Work. **Subsystem 5 remains open; overall progress 3/8.**
- No production source, tests, site assets or deployment configuration changed. Local Node suite not run (clone unavailable); PR CI is required before merge.

---

## Folk Magic catalogue accepted live after PR #118 (2026-11-05, America/Los_Angeles)

- Signed-in catalogue-only recheck passed: the builder lists all 70 Core choices. Selecting Beastcall (X) shows Instant, Ranged, Resist (Willpower), Core p.124 and the animal-type speciality box; Play Mode shows its traits.
- Observed content-hash stamps match PR #118's merged revision. The earlier empty-picker failure is retained as history in `docs/magic-cases-batch-1.md`; `HANDOFF.md` now closes this specific live check.
- No casts, cost checks or reload regressions repeated; no production code changed. Magic remains paused, Subsystem 6 remains open and progress remains 3/8.

---

## Fix: updates not reaching returning players

- Each script and stylesheet in `index.html` carries a `?v=` stamp so browsers know when to fetch a new copy. The stamps were numbered by hand and weren't bumped for the last three releases, so a browser that had the site cached could keep running old code. That's why the new Folk Magic spell list didn't show up in the live check.
- The stamps are now a fingerprint of each file's contents, set by `python3 scripts/stamp-assets.py`. A new test fails if any stamp is out of date, so this can't silently happen again.
- Three older tests that pinned specific stamp numbers now just check the files are linked with a stamp.

To test: after this deploys, open the site and reload once. The builder's Folk Magic step should list 70 spells.

---

## Live magic acceptance evidence (2026-11-05)

- ChatGPT (Work) verified PR #110 in one signed-in session: immediate reload recovered turn 1/2 for Mysticism, Sorcery and Theism; declining recovery once did not prompt again on character reopen. Preparations and cancellations did not spend resources.
- Folk Magic live failure/success spent 1 MP each, critical spent 0 MP, 0 MP refused before rolling, and card timing/potency/range matched Folk Magic 29%. Five catalogue entries matched rendered Core pp.124/128, including Bladesharp's d8 values.
- **Catalogue live acceptance remains open:** this browser still received the previous empty picker/manual-entry interface after PR #116's successful Pages deployment. Beastcall traits, Core page and speciality could not be accepted live. The ledgers separate this failure from passing main-data tests; Claude should check served assets/invalidation.
- Recorded detailed evidence in `docs/magic-cases-batch-1.md` and `docs/magic-subsystem-cases.md`, and updated `HANDOFF.md`. All 17 Node test files passed. Documentation only; no production code changed. Progress remains **3/8**.

---

## Folk Magic spell catalogue

- The builder's Folk Magic picker now lists all 70 spells from Mythras Core pp.123–129, with traits, full descriptions and page numbers. Play Mode spell cards show each spell's traits. Spells typed in by hand before still work, and if the name matches a Core spell, they now show its details.
- Data comes from `docs/folk-magic-catalogue.json` (ChatGPT, PR #114). `scripts/build-folk-magic.py` copies it into `js/data.js`, and a test fails if the two differ.
- Fixed PDF-extraction errors in the source: Bladesharp's damage steps had lost every "8" (now 1d4>1d6>1d8>1d10>2d6>2d8>2d10), two stray "·" characters, one missing space.
- Added the Trigger trait explanation.
- Spell effects (damage steps, durations, resistance) are still resolved at the table (decision D-3).

To test: in the builder's Magic step, give a character Folk Magic, open the spell list and pick Beastcall (X). It should show its traits, "Core p.124" and a speciality box for the animal type. In Play Mode the card should list its traits.

---

## Documentation: Folk Magic catalogue, Animism case inventory, and Magic decisions (2026-11-05)

- ChatGPT prepared `docs/folk-magic-catalogue.json` from the user-provided Mythras Core pp.123–129: all 70 spells, printed names and traits, full reflowed descriptions, page numbers and two `(X)` specialization hints (PR #114). **Claude implementation in `FOLK_MAGIC` is still pending.**
- D-4: proposed rounding up for fractional specialist starting-spell counts and Magical Strength ceilings; neither Core p.121 nor p.116 specifies a fractional example. D-5: recommended GM-led casting interruptions, pending owner decision (`docs/decisions.md`).
- Separately, ChatGPT opened PR #115 with 66 initial Animism source cases (pp.130–145) and explicitly identified unfinished spirit-type and ability children.
- Docs-only source work. No code, tests or deployments changed; CI and subsequent live checks remain necessary.

---

## Magic cases Batch 1 and Folk Magic card details

- Filed ChatGPT's Subsystem 6 Batch 1 cases (Core pp.112–129) in `docs/magic-cases-batch-1.md`, with the app's current status for each case and five open decisions.
- Folk Magic cards in Play Mode now show 1 Turn, Intensity 1, Magnitude 1 and range in metres (the Folk Magic skill, unaffected by difficulty grade).
- New `tests/magic-folk-cases.cjs` covers Folk Magic casting costs (critical 0, success 1, failure 1, fumble 1d3 without overdrawing), the 0 MP block, the single Folk Magic skill, and the card display.

To test: open Play Mode for a Folk Magic character and check a spell card reads "1 Turn · Intensity 1 · Magnitude 1 · ranged N m", where N is the Folk Magic skill.

---

## Account save on reload and tab switch

- Play Mode changes reach the account 1.5 seconds after the last click. A reload inside that window opened the older account copy, which explains the lost Mysticism preparation turn in the November 5 paired-skill batch. Waiting saves now start as soon as the page is hidden, reloaded or closed instead of waiting for the timer.
- If the owner declines the "restore local draft" prompt, that draft is no longer offered again on the next open.
- The local draft and recovery prompt remain the fallback when the browser abandons a request during unload.
- Regression tests cover the immediate save on page hide, draft acknowledgement, and the declined draft not being offered again.

To test (signed in): start a two-turn Mysticism preparation, then reload immediately. Turn 1/2 should be kept, either directly or through the recovery prompt. Repeat, decline the prompt, then reopen the character: no second prompt should appear.

---

<!-- merged from CHANGELOG-PRACTICE-RECENTER-2.md, added 2026-11-05 -->
## Practice Combat — Recenter update 2

Combat choices now explain the current situation during the gauntlet, with optional guidance and readable descriptions on the choices themselves.

### Changed

- Guidance is on by default in Normal and Hardcore. It can be switched off without changing the fight, dice or pace. The preference is remembered. Guided Tutorial always keeps its explanations.
- Guidance stays visible when a choice is focused or hovered. Hovering no longer replaces the situation explanation, and the duplicate helper line is removed.
- A missed attack explains the tradeoff: spend an AP attempting to earn defensive Special Effects, or keep the AP.
- Weapon and shield parries show their effective roll target and the actual Size comparison for the incoming weapon. Evade makes its prone consequence explicit. Disabled reactions name the current restriction.
- Attack and Delay are both visible on ordinary turns. Useful range changes, shield wards and immediate recovery actions are surfaced when applicable; other actions stay available under More actions.
- Action descriptions are readable without hover and use the engine's current target, including fatigue and other applied conditions. The last AP, reach disadvantage, prone state and disarm state have distinct context.
- Legal Special Effects are grouped by purpose: control, damage/protection, and position/recovery. Grouping does not remove or auto-select any legal effect.
- Corrected shield wards: a warded shield can be used for an active parry, which ends its ward. Parrying with the separate weapon keeps the shield ward intact.
- Normal roll screens keep their existing roll instructions without repeating a guidance panel. Tutorial retains its roll explanations.
- Manual roll prompts, left/right fighter positions and the existing meaningful result pauses are preserved. No new Continue steps were added.

### What to test

1. Enter Normal Gauntlet. Look for both Attack and Delay, with short explanations. Switch Guidance off and on; the fight and Action Points must not change.
2. When an opponent misses, inspect the explanation for choosing a parry anyway.
3. Compare weapon and shield parries against a larger weapon, including their current roll targets and protection.
4. Set a shield ward, then actively parry with that shield. Its passive ward must clear. A weapon parry must leave the separate shield ward intact.
5. Earn Special Effects and check the purpose groups. All legal options should remain selectable.
6. Check a last-AP decision, a reach disadvantage and a prone recovery decision. Guidance should describe that situation rather than repeat a generic tutorial line.

### Source verification

Used the uploaded **pdfcoffee.com_mythras-2e-2-pdf-free.pdf** (Mythras Core, 2e). Searched its parsed text first. Because the text encoding is garbled, rendered page images were then checked directly. Printed pages 91-95 cover actions, Delay, standing, wards, missed-attack parries, damage reduction and Special Effects; p.100 supplies the effect summary table; pp.101 and 103 cover prone fighting and Evade; pp.106-107 cover optional weapon reach. PDF page numbers are one higher than the printed page labels.

The in-app text uses concise teaching summaries and the book's action names. Source page references are available in each expanded Why explanation. Arena-specific limitations are identified as such. This is a focused decision/teaching update, not a declaration that the entire combat engine has been re-audited.

### Validation

319 automated checks passed: 14 tactical-guidance checks, 175 practice UX/pacing checks, 14 character-practice checks, 96 rules smoke checks and 20 unified workflow checks. The browser review used a synthetic practice fighter and the actual arena runtime.

- Tactical-guidance integration checks verify displayed targets, disabled reactions, retained legal effects, AP-safe preference changes, source-verified shield ward transitions, last-AP decisions and relevant reach choices.
- Existing practice UX/pacing, character handoff, rules smoke and unified workflow checks passed.
- Browser preview checked ordinary choices, a missed attack, weapon/shield Size comparisons, an active parry from a shield ward, Special Effect grouping, a reach disadvantage and the Guidance Off view.

### Next

Tune generated opponents into coherent tactical challenges and make the gauntlet's increasing difficulty clearer while testing several actual character builds.


---

<!-- merged from CHANGELOG-PRACTICE-RECENTER-1.md, added 2026-11-05 -->
## Practice Combat — Recenter update 1

Saved characters can now enter the practice gauntlet from **Characters → Practice Combat**. The arena continues to open on its existing page.

### Changed

- Added a Practice Combat action to each saved character card.
- Uses a temporary, rested copy with the character's actual Combat Style percentage, advanced characteristics, six combat/recovery skills, Action Points, location HP maximums, location armour and armour initiative penalty.
- Select a Combat Style and a supported weapon/shield that the character both owns and has listed in that style. An unsupported loadout cannot silently become the preset fighter.
- Normal restores the imported HP maximums after a win; Hardcore carries only practice injuries forward. Retrying starts another fresh practice copy.
- Setup identifies abilities and equipment outside the arena's current scope. Combat Style Traits, species abilities, magic, Luck, encumbrance modifiers, ranged attacks, dual wielding and in-combat weapon switching remain unimplemented.
- Fixed unreadable setup headings, made the character loadout compact, and added a return link to My Characters.
- Decision help now reports the current Action Point situation. Manual rolls and the existing result pacing are preserved.

Supported weapon profiles: Broadsword, Shortspear, Mace, Dagger and Greatsword. Supported shields: Buckler, Heater and Hoplite. The existing five weapon profiles are reused; this update adds no new weapon data or rule interpretations. Derived character values come from the existing Forge sheet calculations.

### What to test

1. Open Characters, choose Practice Combat on a saved character, and compare the available style, skills, AP, armour and HP maximums with the sheet.
2. Select a weapon and shield; select a Greatsword and check that the shield becomes unavailable.
3. Start a fight, take damage, then return to Characters. The saved character's wounds and resources must be unchanged.
4. Win a Normal encounter and check the next opponent starts with restored practice HP. In Hardcore, practice damage should carry forward.
5. Try a character with an unsupported weapon or an empty Combat Style weapon list. Setup must explain the missing loadout and prevent entry.

### Validation

- Character-practice integration tests cover profile isolation, progression values, HP maximum overrides, armour, ownership, zero skills, invalid profiles, unsupported loadouts, two-handed gear, Normal recovery and Hardcore carryover.
- Existing practice UX, unified route/workflow and rules smoke suites pass.
- Browser preview verified loadout selection, the two-handed shield restriction, opponent entry and the imported fighter's displayed battle values using a synthetic test character.
- A signed-in production walkthrough with a real saved account character remains to be checked; account and database writes were not changed.

### Next

Improve situation-specific decisions and teaching throughout the gauntlet, with explanations verified against the uploaded Mythras Core Rulebook. Then tune coherent generated opponents and progression around actual character builds.


---

<!-- merged from CHANGELOG-MAGIC-AUDIT.md, added 2026-11-04 -->
## Magic and organizations audit

- Sorcery now displays the INT limit for memorised spells, the single Concentration limit, and the time needed to swap memorised spells. Source: uploaded Mythras Core Rulebook, p.165.
- The editor prompts for GM review when named spells exceed current INT. Recorded spells may include spells outside the memorised selection, so this is an advisory.

To test, open the Sorcery editor on a character with more named spells than INT. Verify the warning appears and all entries remain accessible.

### Folk Magic cost display

- Play Mode now shows the 1 MP base cost for player-recorded Folk Magic spells. Critical success costs zero and a fumble costs 1d3 MP (uploaded Core p.122).
- To test, record a Folk Magic spell, open Play Mode → Magic, and check the card shows 1 MP base before rolling.

### Cult and brotherhood ranks

- Community & Connections now has an expandable reference for joining, promotion and suggested training discounts (uploaded Core pp.196–199).
- The previous update changed a dormant affiliation editor. The reference is now available through the standard builder.

To test, open Community and expand **Cults and brotherhoods**. Common starts at 0% and Leader reaches 100%, with 25-point steps between ranks.

### Casting progress and cancellation

Active Sorcery, Mysticism and Theism entries now open to show casting progress and a Cancel casting control. Sorcery previously placed its cancellation control inside a closed spell disclosure. Mysticism and Theism had cancellation handlers without matching controls.

Live evidence: a dedicated Quick Character with Invocation and Shaping completed a two-turn Duration-shaped cast. Reload preserved turn 1/2 and 11 MP. The final successful roll spent 2 MP. The fixture remains saved for subsequent tests.

To test, begin a multi-turn cast, reload, then cancel. The casting marker should clear without a roll or MP charge.

### Recover an unconfirmed account save

- A reload can offer the signed-in owner a local draft when its account save was not confirmed. Accept restores the draft; Cancel loads the account copy. The choice protects against silently overwriting changes made on another device.
- Successful account writes acknowledge only the exact matching local snapshot, preserving newer unsynced edits.
- Regression coverage exercises recovery of an in-progress Mysticism cast, declining recovery, and owner isolation. A live immediate-reload retest remains open.

To test, begin a two-turn cast and reload before account sync finishes. Accept recovery and verify preparation remains at turn 1/2. Repeat and decline to open the account copy.


---

<!-- merged from CHANGELOG-COMBAT-AUDIT.md, added 2026-11-04 -->
## Combat audit

- The Play Mode parry calculator accepts a failed or absent parry without weapon sizes. A successful parry still uses both effective sizes.
- The calculator explains when to choose Special Effects and when a defender may parry a miss. Source: uploaded Mythras Core Rulebook, pp.94–95.

To test, select a hit location in Play Mode and open the parry calculator. With 8 attack damage and no sizes, No parry and Failed parry should each show 8 before armour. A successful Large parry against a Huge attack should show 4. The calculator does not apply damage.


---

<!-- merged from CHANGELOG-ADVANCEMENT-HAZARDS-AUDIT.md, added 2026-11-04 -->
## Advancement, hazards and recovery audit

- Play Mode Vitals now links the GM's hazard rulings to the existing damage, Fatigue and recovery controls.
- The reference covers poison and disease resistance, falls, fires, exertion, sleep deprivation and healing. Source: the uploaded Mythras Core Rulebook, pp.74–80, checked against rendered pages.
- The direct HP control now calls out falls as an example of damage that bypasses armour.

To test, open Vitals, expand **Hazards and recovery**, and open a hit location. Check the direct HP tooltip and verify that applying a resolved fall bypasses armour. Use a test character for damage and recovery checks.

### Follow-up

- Vitals now explains breath-holding, Endurance outcomes and blood-loss recovery (uploaded Core p.71).
- Mentor training shows the weekly cash guideline and trainer versus teacher student limits (Core p.73).
- An ageing regression verifies both failed checks, updated skill bases, duplicate prevention, reload and undo (Core pp.70–71).

To test, expand the Vitals hazard reference and the Experience Rolls mentor panel. On a test human aged 54, record a failed physical and mental ageing check, reopen the character and remove the test record.


---

<!-- merged from CHANGELOG-ZERO-SKILL-ROLLS.md, added 2026-11-04 -->
## Skill roll boundary

- Correct a 0% skill so a roll of 01 is an automatic success rather than an invented critical. At 1%, 01 remains a critical.
- Cover this boundary in the opposed-roll calculator, including the shared reduction for skills above 100%.
- Record remaining situational capping, augmentation, retries and contested-roll audit work.

Source: user-uploaded Mythras Core Rulebook, printed pp. 37 and 50–51. The 0% critical range is a mathematical interpretation of the printed rule. All automated Node suites pass; a signed-in live test remains outstanding.


---

<!-- merged from CHANGELOG-WEAPON-MALFUNCTION-AUDIT.md, added 2026-11-04 -->
## Weapon Malfunction audit

- The Special Effect now identifies the conflict between its Core p.100 summary and the standard differential-roll result, and directs the GM to adjudicate it manually.
- Test: find Weapon Malfunction in Special Effects and read its description. The app does not invent an eligibility rule for the ambiguous entry.
- All nine JavaScript suites were run; signed-in live browser testing remains outstanding.


---

<!-- merged from CHANGELOG-UPDATE-30.md, added 2026-11-04 -->
## Update 30 — Record Special Effects from a combat roll

- A won Combat Style roll now opens the Special Effects list in selection mode, showing the number of choices allowed by the opposed result.
- Players can choose and remove effects. Selections appear on the roll result and persist with the character's roll log.
- The selector caps choices at the result's margin, permits repeated stackable effects, excludes defensive-only choices, and blocks clear critical or fumble requirements when the roll does not qualify. Weapon and other situational requirements remain visible for table adjudication.
- Changing the opponent's roll clears choices made against the earlier result. Read-only sheets cannot alter selections.
- The existing reference list remains available when the opponent wins.

Verified locally with `node tests/effect-selection.cjs`, `node tests/combat-turn.cjs`, and `node tests/rules-smoke.cjs`. Signed-in hosted play remains to be checked with an authenticated account.


---

<!-- merged from CHANGELOG-UPDATE-29.md, added 2026-11-04 -->
## Update 29 — GM turn clarity

- The tracker names the active and next combatant, and marks the active card **Acting now**.
- Initiative edits and adding or removing combatants preserve whose turn it is. If the active combatant is removed, the next one takes over.
- Advance turn keeps spent Action Points; New round restores them.

Test: Add three combatants, advance once, change another combatant's initiative, and verify the same person remains active. Remove the active one and check the next combatant. Spend AP, advance, then start a new round to see AP restore.


---

<!-- merged from CHANGELOG-UPDATE-28.md, added 2026-11-04 -->
## Update 28 — Special Effects visibility

- The searchable Special Effects choices now appear first when the tab opens.
- The roll comparison table follows the choices and starts collapsed.
- The optional range explanation remains below the choices.

Test: Open a character in Play Mode, choose **Special Effects**, and confirm names such as **Bleed**, **Disarm Opponent**, and **Trip Opponent** appear immediately. Search for an effect and expand it to read its requirements.


---

<!-- merged from CHANGELOG-UPDATE-27.md, added 2026-11-04 -->
## Update 27 — Combat roll follow-through

Combat roll results link directly to Special Effects and injury controls. Choose a body location to record raw damage; armour subtraction is unchanged.

Test: roll a Combat Style, choose the opponent’s result, open effects, then record injury. New Round alone restores Action Points.


---

<!-- merged from CHANGELOG-UPDATE-26.md, added 2026-11-04 -->
## Update 26 — Password reset recovery

- Register the Supabase auth listener before restoring a session so a reset-link redirect can open the new-password form.
- Keep the account form visible when recovery is detected during startup.
- Refresh the router asset on the live site.

Test: request a new reset email, open its link once, and check that Forge shows **Choose a new password**. Then set a new password and sign in. Previously used reset links cannot be reused.

Verification: the cold-start password-recovery regression and all 11 prior release regressions passed locally. A fresh live email-link walkthrough is still needed.


---

<!-- merged from CHANGELOG-UPDATE-25.md, added 2026-11-04 -->
## Update 25 — Campaign access hardening

### Changed

- Campaign data, characters, profiles, and custom campaign content now require a signed-in account at the database policy level.
- Anonymous callers can no longer invoke campaign-join or DM-only RPCs.
- Campaign membership helpers moved out of the public API schema.
- DM inventory edits and character removal retain their required server-side DM checks, with a hardened function search path.
- Future public database functions receive no automatic execute grant.

### Verified

- All five public data tables have RLS enabled and only authenticated policies.
- The anonymous role has no access to campaign join, DM actions, or private membership helpers.
- The authenticated role retains the minimum required access for campaign joining and policy evaluation.
- 11 application release regressions pass.

### Still to test live

- DM creates a campaign and joins with a second signed-in account.
- Player joins using an invite code, sees the campaign, and cannot edit DM-only content.
- DM can edit a member character's inventory and remove that character from the campaign.

### Follow-up

- Enable Supabase Auth leaked-password protection in the project Auth settings.


---

<!-- merged from CHANGELOG-UPDATE-24.md, added 2026-11-04 -->
## Update 24 — Sign-in and homepage repair

- Removed the top release/save banner entirely.
- Removed added homepage import, guest backup/restore, and wiki links.
- Sign-in entry remains available when the authentication library cannot load; the account page explains the failure.
- Guest access is disabled in the public build, including old stored guest markers. Protected pages require sign-in even when the cloud library fails to load.
- Existing error warnings and unload protection remain active.

Validation: core smoke suite and eight release regression tests passed. Recovery tests now check that retry and export appear on failure and disappear after successful retry.

Still required before production reliability is claimed: real signed-in hosted save/reload, second-browser retrieval, interrupted network recovery, campaign access isolation, and visual browser review. These checks are not covered by the Node tests.

Manual checks: open Sign In from the homepage; verify the banner and extra bottom links are gone; open a protected character URL while signed out and verify the account page appears. Complete signed-in save/reload testing separately.


---

<!-- merged from CHANGELOG-UPDATE-23.md, added 2026-11-04 -->
## Update 23 — Release readiness

Released October 23, 2026.

### What changed

- The current Mythras Forge application is now prepared for the production GitHub Pages release.
- Added a visible release and save-status bar, including a retry control for failed cloud saves.
- Local campaign and homebrew save failures now surface to the player instead of failing silently.
- Cloud character saves are serialized per character. Failed saves stay retryable, and signing out preserves unsaved local work when a final save cannot complete.
- Guest character, campaign, and local autosave data now survive account sign-out.
- The GM tracker now distinguishes turns from rounds: turns advance the active combatant, while **New round** restores Action Points and advances round-based effects. Existing injuries and spent Action Points carry into the tracker.
- Combat effects can use turn or round durations.
- Removed the fixed fictional round display from Play Mode so it does not imply live combat state.
- Updated asset cache versions for the release.

### What to test

1. Create a guest character, spend an Action Point or apply damage, then reload the page.
2. Sign in, make a small character edit, and confirm the save status reaches **Saved**. If a save fails, use **Retry save** and confirm the error clears.
3. In the GM tracker, advance a turn and verify Action Points do not reset; choose **New round** and verify that they do.
4. Add one turn-based and one round-based effect, then advance turns and start a new round to confirm each countdown follows its selected unit.

### Release checks

- Core rules smoke suite: 80 checks passed.
- Update 23 persistence and tracker regression suite: 8 checks passed.
- Desktop browser walkthrough: completed the Quick Character flow through Play Mode and verified the playable character sheet.

### Known release boundary

The configured production authentication and database service still needs a signed-in, live-service walkthrough after deployment; guest play and the local persistence path were verified in this release environment.


---

<!-- merged from CHANGELOG-UNIFIED-SITOTA.md, added 2026-11-04 -->
## Unified New Sit’ota application

### What changed

- `index.html` now hosts the existing Forge runtime. Home, Characters, Campaigns, Create Character, Rules, Explore Sit’ota and Account use the same application and navigation header.
- The New Sit’ota home retains its dark typographic design and Explore button. At the Table exposes the existing character/campaign actions, including create/join campaign and the signed-in autosave continuation.
- The existing world-guide content and search are application views at `#/world/<chapter>`, available without signing in.
- `forge.html` is now a compatibility redirect. Query strings and fragments are copied intact before any app/auth script runs; `replace()` avoids an extra Back-history stop.
- Printable sheets retain their header exception. Public-view styles use their own names and variables to avoid changing builder controls.
- No Supabase schemas, storage keys, character formats, calculations, or gameplay handlers changed.

### Rollback

Baseline: `4783ac6ac01d35c4b856707971767770d50f8865` (current main when work began).
Remote branch: `rollback/pre-unified-sitota-2026-10-27`; a local tag of the same name also exists. The original homepage, Forge host and all application files can be recovered from that reference. Rollback after release should be a reviewed revert PR; do not reset shared history.

### Verification

PASS: `node tests/core-batch-1.cjs`, `node tests/rules-smoke.cjs`, `node tests/combat-turn.cjs`, `node tests/effect-selection.cjs`, `node tests/sitota-homepage.cjs`, `node tests/unified-routes.cjs` (8 route/workflow cases), syntax checks on changed JS, and `git diff --check`.

The unified tests exercise public views without altering open character state, private-route gates, history dispatch, signed-in character loading/editing/saving, campaign loaders, invite resumption, cold password recovery and JSON export/import. Supabase calls are stubbed; these tests do not claim a live cloud round trip.

Desktop browser preview (1348px wide): home and guide appearance; guide search; Back/Forward; Rules; signed-out library/Create Character gating; and old `forge.html?compat=a%20b#/world/places` redirect. An isolated, uncommitted local guest test copy additionally exercised builder input, autosave continuation, library, printable-sheet header hiding, campaign creation/rename and party-board navigation. Production guest entry remains disabled. Browser JSON import was interrupted and is not recorded as passed.

Known pre-existing failure, reproduced before edits: `node tests/release-23.cjs` throws `connection lost` in its first campaign-loading case. Its architecture-dependent script list was updated; the unrelated campaign recovery behavior is outside this PR. `tests/desktop-browser.py` was updated for the unified host and the existing repeatable-XP behavior, but was not run; browser QA used the preview directly.

### Manual testing before approval

Use a preview of this branch with a permitted Supabase redirect URL and a test account. Keep a JSON backup of any real character before editing. Do not merge/deploy until approved.

1. Open the root in a signed-out browser. Check Home, Explore Sit’ota, every guide chapter, search, Rules and Account; use Back/Forward between them. Confirm one header, no Open Forge step, and no horizontal overflow at desktop/laptop widths.
2. Click Characters, Campaigns and Create Character while signed out. Confirm Account is shown and no private character name appears on Home. Home’s create/join campaign actions must still give the existing sign-in guidance.
3. Sign in. Load an existing character from Characters, edit it, save, reopen and reload the page. Check both Play and printable Sheet; the shared navigation returns after leaving the sheet. Confirm other characters and the uploaded portrait are intact.
4. Use Create Character, then return Home and Continue as the autosaved character. Check the existing confirmation when starting another character with work open. Browse the guide and return to the same draft.
5. Open Campaigns and a campaign/party board. Create a test campaign, rename it, return through the list, and verify edits persist. Test joining with a code and a copied invite link in a separate signed-out session, including sign-in/confirmation and automatic invite resumption.
6. Export a character JSON, import it through Characters, and confirm it creates a separate character with preserved fields. Reject malformed JSON without changing existing saves.
7. Test old `/forge.html#/character/<id>`, `/play`, `/sheet`, `/campaign/<id>`, `/board` and `#/join/<code>` bookmarks. Confirm arrival in the root app and normal Back/Forward behavior. Add a harmless query parameter and verify it survives the redirect.
8. Request a password-reset email for the test account. Follow both a current root callback and any existing `forge.html` callback; confirm the new-password screen opens. The account owner should enter/submit the new password. Also test email confirmation. Check the configured root URL is allowed in Supabase; this PR does not change project settings.

### Still unfinished

Live signed-in Supabase save/load, multi-account campaign/invite behavior, email-confirmation and real password-reset links require manual verification. Browser JSON import/export needs completion. Existing campaign-loading failure remains. No production deployment is included.


---

<!-- merged from CHANGELOG-THEISM-EXHORTATION.md, added 2026-11-04 -->
## Miracle exhortation

- Set each miracle's level and the number of instances. The app calculates the full Devotional Pool cost and tracks exhortation turns; Exhort is rolled on the last turn.
- Older miracles retain their recorded cost and require a GM-confirmed level before casting. No saved entries are deleted or converted.
- Test: set a miracle to Acolyte and one instance; the first click records a turn and the second rolls, spending 2 pool points on success. Try multiple instances, insufficient points, cancellation, save/reload, and all roll outcomes.
- Still unfinished: cult access, rank-based pool limits, multiple-cult pools, and interruption are GM-managed. Signed-in persistence remains to be tested.


---

<!-- merged from CHANGELOG-STYLE-SLOT-WARNING.md, added 2026-11-04 -->
## Custom career Combat Style warning

Reducing custom-career Combat Style slots now warns before removing a named or linked style, its composition or allocated points. Cancelling preserves the existing slots and data; unused blank slots can still be removed without a prompt.

All ten Node suites pass, including cancellation and confirmation. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-STARTING-MAGIC.md, added 2026-11-04 -->
## Starting magic guidance

- Show the general Core starting allowance for Animism, Mysticism, Sorcery and Theism, plus the book's starting path, school and cult guidance where applicable.
- Test a new magician at 40% and 41%, add named abilities above the allowance, then reopen an experienced character. Confirm the review message does not remove records or block later-acquired abilities.
- Still unfinished: the creator does not enforce starting prerequisites or distinguish starting abilities from those learned later. Confirm choices with the GM.


---

<!-- merged from CHANGELOG-STANDARD-SKILL-BASES.md, added 2026-11-04 -->
## Standard skill creation bases

Checked all 22 standard-skill base formulas against the uploaded Mythras Core Rulebook, p. 11. Added independent formula and calculated-value checks using the book's worked character example, plus a Combat Style base and cultural language bonus check. All ten Node suites pass. Full creation and signed-in live verification remain incomplete; subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-SPECIALITY-POINTS.md, added 2026-11-04 -->
## Speciality allocation preservation

When changing a professional skill speciality to one that already has points in the same creation phase, preserve both allocations instead of overwriting the destination. Duplicate selections are still flagged for correction; combined points may need reallocation to satisfy the normal per-skill limit.

All ten automated Node suites pass, including a collision regression. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-SPECIALITY-CHOICE.md, added 2026-11-04 -->
## Professional skill choices

- Apply one consistent interpretation to custom and published careers: a broadly offered skill may be chosen for distinct specialities, subject to GM agreement. Each choice uses one of the three selections; identical specialities are rejected.
- Explain the Core Literacy language prerequisite and cap in creation. This is manual guidance; the cap is not yet calculated by the app.
- Keep existing selected skills and points when an option is removed so the player can correct the choice.

Source: user-uploaded Mythras Core Rulebook, pp. 28–29 and 44–48. The repeated-choice rule is an interpretation, not explicit book text. Automated cases pass; live verification remains open.


---

<!-- merged from CHANGELOG-SORCERY-CORE.md, added 2026-11-04 -->
## Sorcery Core corrections

- Replace Intensity Shaping with Combine; limit total points by the caster's Shaping skill.
- Apply one harder Invocation grade per extra combined spell. Preserve legacy values for explicit review and recheck casting in progress.
- Test: at Shaping 47%, allocate five points then six; verify the latter cannot cast. Test one and two Combine points, existing saves with Intensity or combined spells, cancellation and resuming casting, and JSON export/import.
- Still manual: confirm spells are different, share targets, and use the lowest relevant Invocation skill when sources differ. Existing casting trackers without a Shaping snapshot must be cancelled and restarted.


---

<!-- merged from CHANGELOG-SOCIAL-CLASS-ROLL.md, added 2026-11-04 -->
## Social class rolling

- Roll social class using the four culture-specific d100 tables in the uploaded Mythras Core Rulebook, p. 24.
- Show and save the result and apply its class money modifier; retain manual selection for GM-agreed choices.
- Warn before replacing an existing class. Background resources remain a GM decision.
- All 400 culture/roll combinations and save/reopen are checked in automated tests.

All ten Node suites pass. Signed-in live testing remains blocked by the currently signed-out browser session. The local desktop browser test could not launch Chromium in this environment. Subsystem 1 is not finished.


---

<!-- merged from CHANGELOG-SKILLS-TASK-AUDIT.md, added 2026-11-04 -->
## Skills and task resolution audit

Subsystem 2 update. Source: uploaded Mythras Core Rulebook, pp. 37–53 and 65–67.

- Skill Advantages preserve the Automatic grade. Very Easy remains the easiest grade that requires a roll.
- Native Tongue and learned Languages display spoken fluency on the Sheet and in Play Mode. Direct skill rolls are blocked for both.
- All 22 Standard and 36 Professional formulas match the Core summary (p. 53). The optional simplified difficulty and contest modifiers are documented for manual GM use (pp. 38, 51).
- Play Mode's Skills section now includes GM guidance for retries, augmentation, caps, group rolls and task rounds. The guidance is a reference for manual adjudication.
- The Play Mode reference includes a calculator for one capped or augmented roll. It uses the unaugmented skill for critical and fumble thresholds, and rounds the augmentation to the nearest whole percent to reproduce the book’s example.
- Existing automated tests cover d100 outcome boundaries, all 16 differential outcomes and selected opposed and over-100 cases.

### What to test

- In Play Mode, choose Automatic with an applicable skill Advantage and no harder condition. The roll button should report that no roll is needed. Under Standard, the same Advantage should make the roll Easy.
- Expand **GM skill and task rulings** under Skills. Compare its guidance to the Core pages above, including the task-round progress for all four outcomes.
- In **GM skill and task rulings**, augment 38% with 33%. A roll of 4 is Critical, 5–45 succeeds normally, and 46 fails. Capping 48% with 23% produces a 23% target.
- In the contested roll calculator, enter 130% vs. 90% and rolls of 10 and 70. Expect adjusted skills of 100% and 60%, a Critical versus Failure and a two-level differential.

### Skill-specific handling

| Core rules | Forge handling |
| --- | --- |
| Native Tongue and Language, pp. 42, 47 | Display fluency. Use the cap calculator for a verbal check limited by fluency. The GM adjudicates related dialects. |
| Literacy, p. 47 | Linked Literacy is capped by its spoken language. Existing unlinked entries are flagged for manual review. |
| Lockpicking and Mechanisms, pp. 47–48 | Use the contest calculator for Lockpicking opposed by the maker’s Mechanisms. If the maker’s value is unknown, the GM sets the difficulty. |
| Conditional skill outcomes, pp. 38–50 | The generic roller gives a tier. The GM applies situational consequences such as follow-up Influence, Insight or Locale grade shifts. Injury, movement, advancement, combat and magic automation are audited in their respective subsystems. |
| Crafting and extended tasks, pp. 65–67 | Play Mode shows the progress changes for each tier. The GM tracks elapsed rounds, decides deadlines and applies quality and enhancements. |

### Remaining verification

Verify these workflows on the signed-in deployed revision. The completed subsystem count remains 1/8.


---

<!-- merged from CHANGELOG-SKILL-RESELECT.md, added 2026-11-04 -->
## Professional skill re-selection

Reselecting the same professional skill no longer clears its speciality or allocated points. This can occur when a career offers the same skill with different suggested specialities. All ten Node test suites pass, including a save/reopen regression. Signed-in live testing remains open.


---

<!-- merged from CHANGELOG-SITOTA-POLISH.md, added 2026-11-04 -->
## New Sit’ota visual correction

### Changed

- Rebuilt the public homepage and player guide as a typographic, art-free site. Removed generated hero/city images, placeholder character cards, decorative symbols, and the ornamental product styling.
- Replaced placeholder cards with direct routes to the real saved-character library, campaign, creation flow, and rules reference.
- Added a shared New Sit’ota header and dark site frame around Forge routes. Dense Forge content remains on readable paper-toned surfaces; authentication logic and the database schema are unchanged.
- Added an optional player-supplied character portrait on the Concept step. JPEG, PNG, and WebP uploads are resized to at most 512 pixels and saved in the character state; the real character library shows the portrait. Existing characters keep their initials until a player uploads one.
- Kept old hash bookmarks and authentication callbacks forwarding to `forge.html`.

### Test

1. On desktop, inspect the homepage and each world guide chapter, including chapter search.
2. Follow Characters, Campaigns, Create a character, Rules, and Open Forge. Verify the shared navigation and the appropriate sign-in gate.
3. Sign in and check a saved character, campaign, builder, play mode, and sign-out. Verify saves and synchronization.
   Upload and remove a portrait, reopen the character on another device, and test JSON export/import.
4. Open an old root hash bookmark and a fresh password-reset callback to check forwarding.

### Unfinished

- The user may supply original art or a logo for the homepage later. The homepage deliberately does not show fictional character data.
- A signed-in Supabase walkthrough and visual desktop browser review are still needed before this is merged.
- The pre-existing `tests/release-23.cjs` campaign-loading failure remains separate.


---

<!-- merged from CHANGELOG-SITOTA-INTERIOR.md, added 2026-11-04 -->
## New Sit’ota — Unified Interior Visual System

### What changed
- Replaced the decorative filled **Explore Sit’ota** hero button and book icon with a restrained, underlined text link.
- Introduced a single scoped interior stylesheet (`sitota-interior.css`) using the established 16:9 homepage's charcoal, ivory, restrained gold and editorial type.
- Applied the design to the Account, My Characters, Campaign list, Campaign detail, Party Board, Rules Wiki, character builder and public world guide. **Play Mode is excluded entirely.**
- Unified site navigation typography and sizing across interior screens. **The homepage header and castle hero keep their approved appearance.**
- Account and character library use dark, high-contrast panels and controls; the library previews actual saved character portraits in larger rectangular frames.
- Campaign and wiki indexes use restrained dark tiles. Long-form rules chapters, campaign details, and dense gameplay forms retain warm-paper surfaces for reading clarity.
- Character builder gets dark step navigation, paper work area, dark characteristics ledger and a matching dark step footer.
- Play Mode receives **no theme changes**; its existing layout, typography, buttons, colours and combat indicators are unchanged.
- Printable character sheet remains intentionally paper-based and the print stylesheet stays print-friendly.
- Added an explicit active-view marker to the existing site header update hook, scoped CSS, and a regression test.
- Bumped the cached `js/sitota.js` URL from `v=3` to `v=5` to prevent the stale-PC-homepage problem.

### Unchanged
No Mythras rules calculations, Supabase schema, authentication flows, saved character formats, campaign data or routing logic were modified. The original Richard Wright homepage art is not reused elsewhere.

### Developer checks
- PASS: new JavaScript source parses.
- PASS: CSS braces and parentheses balanced.
- PASS: every targeted view has explicit styling; home, Play Mode and printable sheet have scoped exclusions.
- PASS: new script version and stylesheet references present.
- Added `tests/sitota-interior.cjs`. Full Node regression suite and browser login walkthrough **not yet run** in this chat.

### Manual review checklist
1. Desktop homepage must remain the 16:9 version with correctly positioned painting and real characters.
2. Account signed-out, sign-up, login, password-reset, logged-in profile and guest states: check contrast and working controls.
3. Character library: images, names, Play/Edit/Print/Delete actions, import JSON, empty/error/loading states.
4. Campaign list, campaign detail, membership, invites, and Party Board tabs including GM controls and combat trackers.
5. Rules Wiki chapter grid, search results, and article reading.
6. Builder rail, form fields, allocation tables, portrait input, ledger, validation and fixed navigation footer.
7. Confirm Play Mode is visually unchanged: combat buttons, wounds, Magic Points, XP, inventory, status indicators, read-only teammate view.
8. World Guide chapter index/search/readability; screen widths 1440, 1024, 768, 375; keyboard navigation.
9. Print a sheet and check white paper, text contrast, and no dark nav.
10. Signed-in save/reload across devices and legacy links remain correct.

### Release scope
Review-only UI PR. **Do not merge until visually reviewed and functional smoke checks are satisfactory.**

### User-requested release exceptions
- No Play Mode CSS rules are included; shared header/body styling explicitly excludes Play Mode.
- Existing print styles remain untouched.
- Homepage CSS now uses `v=3`, and the renderer uses `v=5`, to invalidate desktop caches.


---

<!-- merged from CHANGELOG-SITOTA-HOMEPAGE.md, added 2026-11-04 -->
## New Sit’ota homepage — review branch

### Changed

- The root page welcomes players to New Sit’ota and opens a public, player-facing world guide.
- The existing Forge application is preserved at `forge.html`, with links from the new homepage to character, campaign, and rules screens.
- Old hash routes and authentication query callbacks forward to the matching Forge route.

### Test before merging

1. Open the new homepage and Explore Sit’ota while signed out.
2. Follow My characters, Our campaign, Rules, and Create a character; confirm normal sign-in and existing saved data.
3. Follow an old `/#/character/<id>` bookmark and a campaign invitation; verify they reach `forge.html` with the same route.
4. Request a fresh password reset and confirm the callback opens the new-password form inside Forge.

### Still unfinished

- The public world guide contains starter material and empty chapters for future player-safe entries.
- The full signed-in browser and authentication callback walkthrough requires a deployed preview or review branch.
- The pre-existing `tests/release-23.cjs` campaign-loading failure remains unresolved.


---

<!-- merged from CHANGELOG-SITOTA-16X9.md, added 2026-11-04 -->
## New Sit’ota — 16:9 homepage redesign (review)

### What changed
- Matched the approved widescreen composition: slim site header, panoramic castle hero, one-row character gallery, and three-column campaign/rules/world navigation.
- Used the original Richard Wright painting provided by the site owner, cropping only the surrounding white bars; stored optimized AVIF and WebP files locally with discreet artist/copyright credit. No generative reconstruction of the painting.
- Retained the real, account-backed character gallery and each character's saved portrait. The illustrative names and character portraits from the reference screenshot are NOT shipped.
- Preserved Create Character, Join/Create Campaign, Rules Wiki, World Guide, Continue Character, account, existing deep links, and the legacy forge.html redirect.
- Scoped new CSS to the homepage; no Supabase schema, game rules, character save, or server changes.

### What to test before merge
1. Desktop approximately 1648×928: compare top-level layout to the approved 16:9 screenshot. Ensure the castle remains visible, hero text is legible, and the portrait strip and tools fit naturally.
2. Signed in: four actual saved-character cards display their image, name, metadata, and open the correct Play view; fewer/more characters and missing portraits display gracefully.
3. Signed out: no fictional sample character data is shown and sign-in is available.
4. Verify Explore Sit’ota, character library, new character, campaigns and join flow, wiki, Account and browser back/forward navigation.
5. On phones/tablets, verify no horizontal overflow and readable hero/buttons.
6. Verify stale forge.html bookmarks and Supabase reset/auth callbacks still function.
7. Run node tests/sitota-homepage.cjs and broader app tests. The full suite has NOT been run in this chat.

### Publication note
This is a review PR, not a live deployment. The repository and GitHub Pages site are public. The user reports permission to use the painting on a personal/private site; confirm authorization extends to publicly accessible hosting before merging.


---

<!-- merged from CHANGELOG-SHARED-SKILL-POINTS.md, added 2026-11-04 -->
## Shared professional skill points

- Removing one duplicate professional skill choice retains its points if another choice still uses the same skill and speciality.
- Changing one duplicate's speciality leaves shared points on the skill still selected; allocate points to the new speciality separately.
- Removing the last choice returns its points to the pool as before.

All ten Node suites pass, including save/reopen and Full, career and Quick creation cases. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-SHARED-COMBAT-STYLE.md, added 2026-11-04 -->
## Shared Combat Style points

Changing one career Combat Style slot no longer clears cultural-style career points while another slot still links to that style. The allocation returns to the pool when its last career link is removed. Reselecting the same source also leaves points intact.

All ten Node suites pass, including a save/reopen regression. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-RULES-BASELINE.md, added 2026-11-04 -->
## Rules baseline

- Reconcile the master checklist with releases through PR #45; mark partial work and outstanding verification clearly.
- Restore a visible retry message when campaigns cannot be loaded, so a connection error is not mistaken for an empty account.
- Update stale homepage and combat-navigation regression expectations to match the current interface.
- Test: sign in, open Campaigns, simulate a failed connection and retry when connectivity returns. Confirm existing campaigns appear. Signed-in production testing remains outstanding.


---

<!-- merged from CHANGELOG-ROLLED-ORDER.md, added 2026-11-04 -->
## Rolled-order characteristics

Added an explicit option to assign human characteristic rolls in the order specified by the uploaded Mythras Core Rulebook, p. 8. The 3d6 and 2d6+6 groups remain separate; the existing highest-first shortcut remains available.

All ten Node suites pass, including assignment and save/reopen. Signed-in live verification remains open. Subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-PROFESSIONAL-SPECIALITIES.md, added 2026-11-04 -->
## Professional skill specialities

Source: user-uploaded Mythras Core Rulebook, pp. 28–29 and 44–48.

- Add required specialities for Literacy, Musicianship, Mysticism and Navigation in character creation and hobby choices.
- When naming a previously unspecialised legacy skill, retain its bonus points if the old instance is no longer shared.
- Document what the book confirms about separate specialities and the remaining uncertainty about choosing one `(any)` offer multiple times.

Automated tests cover prompts and legacy-point migration. Literacy's language requirements and a signed-in live test remain open.


---

<!-- merged from CHANGELOG-PROFESSIONAL-CHOICE-POINTS.md, added 2026-11-04 -->
## Professional skill choice points

Adding another unspecialised professional-skill choice no longer resets points already allocated to the same skill. This protects points while specialities are being entered in Full and Quick creation. All ten Node suites pass; signed-in live verification remains open.


---

<!-- merged from CHANGELOG-PORTRAIT-SAVE.md, added 2026-11-04 -->
## Portrait persistence

Portrait uploads and removals now start saving immediately. Opening a saved character waits for pending cloud saves before reading it back, preventing quick navigation from replacing a new portrait with an older copy.

Test: upload a portrait, immediately return Home, then reopen Edit. Confirm the portrait appears in both places and remains after reloading. Remove it and repeat. Check JSON export includes the portrait.

Automated regression covers upload, pending-save reopen, normalization, Home rendering, and removal with stubbed cloud storage. Real account and iOS photo-picker checks remain manual.


---

<!-- merged from CHANGELOG-PASSION-ADVANCEMENT.md, added 2026-11-04 -->
## Passion advancement

- Spend banked Experience Rolls on recorded Passions using the Core p.72 skill-improvement procedure. Gains persist with the Passion and appear wherever its value is displayed.
- Test: open a character with a Passion, award two rolls, improve the Passion twice, and confirm the second roll uses the updated percentage. Save, reload, and export/reimport the character to check the value persists. Confirm a character with no rolls cannot spend one.
- Record a GM-directed Passion increase or decrease from events in play without spending an Experience Roll (Core p.82). Test a positive and negative adjustment, save and reopen; the other Passions and banked rolls should be unchanged.
- Still manual: the GM determines event-driven adjustments. Automatic fumble tracking and Experience Roll-based reductions are not implemented. Test signed-in save/reload with a real account before relying on this in play.


---

<!-- merged from CHANGELOG-NATURAL-RECOVERY.md, added 2026-11-04 -->
## Natural recovery and fatigue

- Apply one natural healing interval to a wounded location. The next interval reflects the updated severity; Major Wounds require confirmation of successful treatment. A GM-confirmed strenuous-activity reduction can be entered.
- Choose Fatigue guidance for physical exertion, blood loss or asphyxiation. Fatigue remains manually controlled.
- Test a Serious Wound at 0 HP: apply one week, then check that positive HP uses a day for the next interval. Check that a Major Wound cannot heal without treatment confirmation. Save and reopen.
- Still manual: elapsed time, treatment verification, permanent injuries, Pulp/Paragon healing adjustments and whether a fatigue cause has ended. Signed-in production persistence remains untested.


---

<!-- merged from CHANGELOG-MYSTICISM-PREPARATION.md, added 2026-11-04 -->
## Mysticism preparation

- Talent preparation now records one turn per Intensity and rolls on the final turn. The app rechecks existing individual and combined limits before each turn, preserves pending preparation across save/reload, and offers a cancel button.
- Test an Intensity 3 Talent: the first two clicks should not roll or spend points; save and reopen, then make the final click. Try an excessive Intensity, edit a Talent while preparing and cancel. Verify a failed roll does not mark the Talent active.
- Still manual: GM checks Talent category and point cost, interruptions and action points; activation and duration markers are player-controlled. Intensity rounding outside the book's 34% example remains under review. Test with a real signed-in account before relying on persistence.


---

<!-- merged from CHANGELOG-MOVEMENT-ENCUMBRANCE.md, added 2026-11-04 -->
## Movement and encumbrance audit

- Worn armour now reduces running and sprinting speed by its armour penalty, after calculating gait speed. Walking is unaffected (Core p.70).
- Incapacitated or otherwise immobile characters can no longer run or sprint due to an Athletics bonus (Core p.79).
- Twenty zero-ENC items count as one ENC, including quantities across inventory and weapons. The gear screen shows the count (Core p.77).
- Test an unarmoured character's run and sprint, equip armour, and check both decrease by the armour penalty while walking stays unchanged. Set Fatigue to Incapacitated and check running and sprinting are unavailable. Add 19 then 20 named zero-ENC items and check total gear ENC increases by one.
- Mixed fatigue/encumbrance interactions beyond these cases and signed-in persistence remain subject to further verification.


---

<!-- merged from CHANGELOG-MAGIC-ELIGIBILITY.md, added 2026-11-04 -->
## Magic eligibility

- Bound-spirit commands now require a recorded spirit POW within the Binding skill's limit. Existing spirit records are preserved; missing POW prompts review.
- The Theism editor now shows the Core rank and multiple-cult pool limits, with an explicit note that they are not yet enforced.

Test: with Binding 45%, command a bound POW 15 spirit and verify the roll occurs; try POW 16 and a missing POW and verify neither rolls nor spends Magic Points. Reopen an older spirit record and confirm its information remains. Review Theism's pool guidance against the character's cult rank.

Still unfinished: Theism rank-based and multiple-cult pool enforcement, starting access for other traditions, Mysticism preparation, and real-account browser testing.


---

<!-- merged from CHANGELOG-LITERACY-MODE-SWITCH.md, added 2026-11-04 -->
## Literacy links when switching creation modes

Switching between Full and Quick creation now clears links for reset Literacy or Language skills, while retaining valid links for learned skills that remain on the character. This prevents a newly selected skill from inheriting an unrelated old link. The underlying Literacy and spoken-language rule is in the user-uploaded Mythras Core Rulebook, p. 47.

Automated regression and all ten Node suites pass. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-LITERACY-LANGUAGE.md, added 2026-11-04 -->
## Literacy and language

- Link a Literacy skill to its associated Native Tongue or acquired Language in character creation.
- Apply the spoken skill as a cap to the effective Literacy percentage, while preserving stored points. If the spoken skill improves, the effective Literacy value can rise up to its stored value.
- Prevent experience or training improvements from increasing linked Literacy beyond the current spoken-language limit; do not spend an Experience Roll when already at the limit.
- Keep existing unlinked characters unchanged and show a warning that the cap is not automatic until the player chooses the correct language. If a linked language is removed, the warning returns.

Source: uploaded Mythras Core Rulebook, printed p. 47. Factotum was identified as a useful workflow reference; its generator describes itself as using Mythras Imperative, so this change follows Core. All automated Node suites pass. Live verification and the GM's choice of the correct language remain necessary.


---

<!-- merged from CHANGELOG-INDIVIDUAL-ARMOUR.md, added 2026-11-04 -->
## Independent armour locations

- Choose armour independently for both arms and both legs, with shortcuts to set matching limbs. Location damage, character sheets, costs, ENC and Initiative use the selected side.
- Existing shared limb armour is carried over to both sides without removing the original fields.
- Test an older character with arm armour, save and reopen, then remove armour from only one arm. Apply the same damage to each and check the AP and HP changes; export and reimport the character.
- Real-account cloud migration and live persistence still require testing. Parry reductions remain a manual input before armour.


---

<!-- merged from CHANGELOG-IMPORT-MAGIC.md, added 2026-11-04 -->
## Character import and Core magic

- Import a character backup directly into My Characters as a new independent copy, preserving the open character and showing errors on failure.
- Replace the unsupported starting Folk Magic dice allowance with Core's skill-based guidance and allow GM-approved names to be recorded when the catalogue is empty.
- Correct Mysticism's individual Intensity at 34% to 2. The draft rounds other fractions up as a tentative interpretation; the GM should confirm boundaries. Specialist Folk Magic rounding and starting allowances remain GM-managed.

Test: sign in, import a backup from Account, verify it appears in My Characters, reopen it and reload; check portrait and that the original remains separate. Try invalid JSON and a failed network save. For a Folk Magic character verify default starting guidance and add a name; for Mysticism 34% verify maximum Intensity 2. Cloud behavior is stubbed in automated tests; real account and browser testing remain outstanding. Mysticism preparation and activation prerequisites are not addressed here.


---

<!-- merged from CHANGELOG-HOME-CHARACTERS.md, added 2026-11-04 -->
## Homepage character cards

Restores a Your Characters section between the welcome and At the Table sections, with up to four recently saved characters, View All, and a Create a New Character card. Cards open the existing Play view and show saved culture/career details and player-uploaded portraits; characters without portraits use initials. Signed-out visitors see a sign-in prompt. Removes Create Character from the shared top navigation; the creation card and existing page action retain the normal draft confirmation.

No generated art, sample characters, rules, save formats, or database changes.

### Manual testing

1. Signed out: open Home. Check the sign-in prompt and create card; neither reveals saved character information. Confirm the top navigation has no Create Character item.
2. Sign in and return Home. Confirm up to four of your most recently saved characters appear, with their uploaded portraits or initials. Open a card, edit/save, then return Home and confirm the updated name/portrait appears. View All should open the complete library.
3. Create a New Character should use the usual draft confirmation. Confirm creation is still available in At the Table.
4. Check an empty account, failed character loading (Retry), and signing out/switching accounts. No previous account's cards should be displayed.
5. Check desktop and narrow layout, keyboard focus, guide navigation, browser history, and the existing character library.

Live account testing remains manual. Changes are prepared for review before merge/deployment.

### Verification

- Homepage checks and all ten unified route/workflow cases pass, including portrait filtering, four-character ordering, escaped names, and an account-switch race. Supabase calls are stubbed in automated tests.
- Browser preview checked signed-out gating, local empty state, a newly saved local character appearing on Home, and the create card opening the existing builder. No production character data was modified.
- JavaScript syntax and whitespace checks pass.


---

<!-- merged from CHANGELOG-EXPERIENCE-ACCESS.md, added 2026-11-04 -->
## Experience access fix

- View-only sheets now reject changes to experience flags and the free fumble improvement.
- Owners can still apply an earned fumble improvement as before.
- Test: open a shared sheet in view-only mode and confirm experience controls cannot change it. On an editable sheet, flag a fumbled skill and apply its free improvement.
- Automated coverage checks that view-only calls leave the experience state unchanged. Signed-in sharing and persistence still need a live test.


---

<!-- merged from CHANGELOG-EQUIPMENT-ECONOMY-AUDIT.md, added 2026-11-04 -->
## Equipment and Economy audit

Source: uploaded Mythras Core Rulebook, pp. 23–24, 34, 54, 58, 62–67 and 77.

- Starting funds preserve fractional silver when applying the culture and social class multipliers.
- Background wealth adjustments are tracked separately from purchases. Older saves with a negative spending balance from an applied wealth event retain the same credit after migration.
- All eight armour construction tiers were checked for AP, per-location price, worn ENC and initiative penalty. Forge follows the per-location initiative formula where the printed Mail suit ENC disagrees with the seven individual pieces.
- Social class roll ranges and money multipliers were checked against the four Core tables. Class-based possessions and other resources are adjudicated by the GM.

- Compared all 64 personal weapon and shield entries with the Core tables. Corrected the thrown dagger to zero ENC and the Atlatl range bonus notation.
- GM-approved armour material overrides apply by location to worn ENC and initiative. Armour Points and base prices still come from the construction.

### What to test

- A Civilised Outcast with a 4d6 sum of 5 starts with 93.75 sp of purchasing value.
- Opening an older save with a net background wealth credit retains its purchasing power and clears the invalid negative spending entry.
- Full Plated Mail costs 9,800 sp, contributes 21 worn ENC, and applies a 9-point initiative penalty.

The initial equipment release passed signed-in checks for weapon values, fractional funds and worn armour.

The follow-up adds a collapsible reference on **Money & Gear** for all six siege weapons, all eight vehicles, ammunition bundles and manufacture or repair. Siege gear and cargo stay out of personal ENC. The GM tracks their use, task progress, quality and upkeep. Open the panel and check that a Ballista lists 5 Combat Rounds and a crew of 2–4, and that the freight wagon lists 10 occupants and 200 cargo ENC.

Follow-up live verification and broader inventory and encumbrance cases remain open.

#### Inventory and encumbrance follow-up

- Money & Gear and Play Mode can exclude worn everyday clothing from ENC without losing its purchase price or packed ENC. Spare clothing and carried armour use their full ENC.
- Verified the 20-item zero-ENC grouping across inventory and weapons, and the exact STR ×2, ×3 and ×4 boundaries.
- Core p.77 non-human scaling and optional item-count encumbrance are GM procedures. Preset weapon and armour ENC uses the book’s human-scale values.

To test, add a coat with 1 ENC and a cost of 4 sp, then toggle worn clothing. The gear load drops by 1 and the cost stays 4 sp. Check the panel in Money & Gear and confirm Play Mode shows the same load.

#### Ordinary gear catalogue

- Money & Gear has 64 fixed-price Core tools from pp.60–61. Selecting a tool adds an editable inventory row with ENC and price. Copper prices convert at 10 cp per sp (Core p.54).
- Lockboxes, material variants and other variable purchases use manual inventory or spending entries. Accommodation, food, clothing and livestock remain GM-priced using the Core tables.
- Test adding three bundles of nails or tacks. They total 0.60 sp. Add 10 m of hemp rope and confirm the ledger shows 10.60 sp and the rope contributes 2 ENC.


---

<!-- merged from CHANGELOG-DIFFICULTY-GRADES.md, added 2026-11-04 -->
## Difficulty grades

- Apply the hardest of task difficulty, encumbrance and fatigue, interpreting Burdened as Hard and Overloaded as Formidable for STR/DEX skills (Core pp.38, 77, 79).
- Test: a Hard Athletics roll while Burdened remains Hard; Overloaded makes it Formidable. A non-STR/DEX skill is unaffected by encumbrance. Wearied fatigue applies Formidable.
- This interpretation reconciles Core's hardest-grade rule with its relative encumbrance wording; the book does not provide this exact worked example. Signed-in browser testing remains outstanding.


---

<!-- merged from CHANGELOG-DIFFERENTIAL-TABLE.md, added 2026-11-04 -->
## Differential roll audit

Compared the 16 outcomes in the differential-roll table with the user-uploaded Mythras Core Rulebook, printed p. 51. Added an independent regression case for every outcome through the contested-roll calculator. All match the book; no behavior change was needed. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-DICE-ASSIGNMENT.md, added 2026-11-04 -->
## Characteristic roll assignment

Reject reused or invalid dice-pool indices in the assignment handler, preserving existing values when a selection is rejected. This complements the existing dropdown restriction and supports the separate dice groups in the uploaded Mythras Core Rulebook, p. 8.

All ten automated Node suites pass. Imported legacy states and signed-in live workflows require further review; subsystem 1 remains in progress.


---

<!-- merged from CHANGELOG-DEVOTIONAL-POOL.md, added 2026-11-04 -->
## Devotional Pool rank checks

- Confirm the rank associated with the tracked Devotional Pool. For a whole-number rank limit, the builder prevents increasing above that limit. An existing oversized pool is preserved and flagged for review before casting.
- Test POW 12 / Initiate: a new pool of 3 is accepted, 4 is rejected. Open an older pool above 3 and confirm its value is retained and flagged; correct it and save/reopen. Test an unconfirmed rank and a fractional result with your GM.
- Still unfinished: separate multiple-cult pools, combined pool totals, fractional rounding, and signed-in production verification.


---

<!-- merged from CHANGELOG-CUSTOM-CAREER.md, added 2026-11-04 -->
## Custom career setup

- Preserve allocations for still-offered skills when editing an existing custom career.
- Keep the custom-career editor open after entering a name and add an explicit continue action.
- Enforce the Core limit of seven standard skills including Combat Styles, while retaining existing selections for correction.
- Explain GM agreement and the current limitation that the builder does not save a separate list of up to seven professional skill options.
- Add regression coverage for the limit, editing and saved over-limit state. Live verification remains outstanding.

Source: user-uploaded Mythras Core Rulebook, printed p. 33. See `docs/core-career-cases.md` for scope and remaining gaps.


---

<!-- merged from CHANGELOG-CUSTOM-CAREER-RESELECT.md, added 2026-11-04 -->
## Custom career re-selection

Clicking Custom Career while already editing it no longer resets professional choices, combat style details or allocated career points. All ten Node test suites pass, including a save/reopen regression. Signed-in live testing remains open.


---

<!-- merged from CHANGELOG-CULTURE-CHANGE-WARNING.md, added 2026-11-04 -->
## Culture change warning

Changing cultures now asks before resetting player-selected cultural skills or modified cultural allocations, and explains that bonus points on removed professional skills may return to the pool. Untouched automatic starting allocations do not trigger the warning. Cancelling preserves the existing choices and points.

All ten automated Node suites pass. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CULTURE-CASES.md, added 2026-11-04 -->
## Culture skill audit

- Compared all four Core culture skill offers and standard-skill choice sets against the uploaded Core Rulebook, pp. 13–16; added checks for the listed offers.
- Invalid, repeated or unexpected cultural standard-skill choices in inconsistent saved data now block completion with a message. Existing data is retained for correction.
- All nine local JavaScript suites pass. Test on the live site after deployment: make each culture's allowed selections, change a selection after allocating points, and reopen a saved character. Confirm the optional Sit'ota Combat Style allocation still behaves as expected.


---

<!-- merged from CHANGELOG-CULTURE-CAREER-MATRIX.md, added 2026-11-04 -->
## Culture and career combinations

Added an automated integration check across all 96 combinations of the four Core cultures and 24 published careers. Each combination retains its eligible standard skills and the expected number of career Combat Style slots. This complements source-based list checks; it does not verify every allocation, speciality or live workflow.

All ten Node suites pass. Subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-CULTURAL-STYLE-WARNING.md, added 2026-11-04 -->
## Cultural Combat Style warning

Turning off a cultural Combat Style now warns before returning its allocated points to their pools and unlinking career styles. Cancelling preserves the style, links and allocations. Untouched blank styles can still be turned off without a prompt.

All ten Node suites pass, including cancellation and confirmation. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CULTURAL-PASSIONS.md, added 2026-11-04 -->
## Cultural Passion suggestions

Correct suggested cultural Loyalty target types: Loyalty to a chief uses the person formula, while Loyalty to a town uses the place formula. Players still choose appropriate target types for the broad Love and Hate suggestions.

Source: user-uploaded Mythras Core Rulebook pp. 14–16 and 23. All ten Node suites pass. The signed-in social-class test also passed one Civilised roll (90 → Gentry ×3 → 3,600 sp) and save/reopen on the deployed revision. This is not a complete character-creation verification; subsystem progress remains 0/8.


---

<!-- merged from CHANGELOG-CREATION-COMPLETION.md, added 2026-11-04 -->
## Character creation consolidation

- Final review distinguishes corrections, recorded GM overrides and manual details; the Finish action rechecks earlier edits. Full/Quick switches cannot transfer a reset skill-step override to another step.
- Core Background Events are explicitly optional; skipping retains notes and results. Official event summaries now reach the sheet and Markdown export.
- Saved dice assignments must match their pools; fractional manual values remain visible for correction.
- Repeated career subjects display together, with distinct specialities still chosen individually.
- Legacy unknown culture/career names remain recoverable without deleting their points on load.
- Corrected source notes for human measurements, Combat Style bases and fixed AP.
- Added 1,440 complete allocation/save-round-trip cases, all16 cultural travel choices, all216 ordinary 3d6 combinations and all24 career speciality/style contexts.

Testing: run all twelve `tests/*.cjs` suites. Live tests: fresh rolled creation; four cultures; custom offers/styles; Literacy cap; optional event skip and sheet output; correction/GM review; save and reload. See `docs/character-creation-completion.md` for exact evidence and boundaries. Final deployed checks passed on November3,2026; subsystem count is1/8 for Core human creation and background. See the final deployed verification record for limits.


---

<!-- merged from CHANGELOG-CREATION-COMMUNITY.md, added 2026-11-04 -->
## Character creation: community and Passions

- Check all Passion starting formulas against the uploaded Core p. 23 table. Person-based Passions now stay unresolved when required subject characteristics are missing, rather than displaying a fabricated score.
- Check the four starting-money multipliers and all social-class money modifiers against Core pp. 21 and 24.
- Explain optional Group Luck and its manual tracking on the community page; correct the family-table page reference.
- Document unimplemented social-class and family rolls, shared Group Luck tracking and remaining live checks.

All ten Node suites pass. Subsystem progress remains 0/8; character creation is in progress. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CREATION-BATCH.md, added 2026-11-04 -->
## Character creation audit batch

- Established a stable eight-subsystem verification plan; none are yet complete.
- Checked every printed human hit-location table band and one extension against the uploaded Mythras Core Rulebook, p. 10, and added automated boundary cases.
- Reject fractional characteristic values during validation while preserving existing saved values for correction (Core p. 8).
- Documented remaining character-creation and live verification gaps.

All ten Node suites pass. Signed-in live testing remains open.


---

<!-- merged from CHANGELOG-CORE-RULE-SCOPE.md, added 2026-11-04 -->
## Core rules scope

- Added a working Core audit register, grouped by character creation, skills, equipment, game systems, combat, magic, organisations, creatures and GM procedures.
- Separated intended automation, GM-assisted decisions, reference material and unresolved scope decisions from the actual verification status.
- Recorded the first signed-in character and campaign checks and the campaign reload issue without counting them as book-wide verification.
- No website behavior changed. Review `docs/core-rule-scope.md`; subsequent audits should split its groups into individually testable cases and add evidence as work is completed.


---

<!-- merged from CHANGELOG-CORE-HEIGHT-WEIGHT.md, added 2026-11-04 -->
## Core height and weight

- Human height and weight defaults now use the Core p. 9 table, with the midpoint offered as a starting value and the actual ranges shown in the character builder. Lithe, Medium, and Heavy frames use the correct weight columns.
- Manually entered measurements remain unchanged. Nonhuman figures remain labelled estimates pending a species-specific review.
- Added boundary checks for height and weight, and additional Core attribute and skill-roll boundary checks.
- To test: create a human with SIZ 13, change frames, and enter custom measurements. Save and reopen the character; confirm the chosen values persist. Live signed-in persistence still requires testing.


---

<!-- merged from CHANGELOG-CORE-BATCH-1.md, added 2026-11-04 -->
## Core Batch 1 — awaiting review

### Changed
- MCR-05: CHA Experience Modifier is off by default and applied only when selected for a GM-approved positive award. Existing banked rolls are preserved.
- MCR-06: repeated improvement of a skill can spend additional banked rolls, each against its updated percentage. Legacy usedThisRun data is retained but ignored.
- MCR-09: Serious Wound interruption now says 1d3 turns; Major Wound treatment deadlines are unchanged.
- MCR-10 (minimum): the rest estimate is labelled physical exertion only; blood loss and asphyxiation exceptions are shown. Recovery remains manual.
- MCR-17 (minimum): damage input explicitly requires damage after parry and other reductions, before armour. AP is still subtracted automatically.
- MCR-27/28: removed incorrect Combat Style base warning and corrected the Background Events source comment.
- Skill changes return unavailable allocations to their original pools. Legacy hidden allocations have a visible Return points to pool control. No save-load cleanup silently deletes allocations.
- Updated the homepage regression to accept the existing CSS cache version.

### Sources checked
Uploaded `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`, printed pp.12,18,71,72,79,110. Parsed text was searched first, then rendered pages were checked because the text encoding was garbled. The reports are the development handoff, not rules authority.

### Automated verification
PASS: core-batch-1.cjs, rules-smoke.cjs, combat-turn.cjs, effect-selection.cjs, sitota-homepage.cjs; JavaScript syntax and git diff --check.
FAIL: existing release-23.cjs campaign-loading test throws connection lost. This predates the batch; cloud/auth code is unchanged.

### What to test
1. Award 3 rolls with CHA 13 or 6: checkbox off gives 3, on gives 4 or 2. Reopening the modal leaves it off.
2. Spend two rolls on the same skill and verify the second target includes the first gain. Export/import and reopen the character.
3. Allocate points to a Professional Skill, change it, then redistribute the freed points. Repeat for a speciality, hobby, Quick Skills, and custom career choices. Confirm skills still known through another source retain their bonus points.
4. Open an older save with hidden allocations and use Return points to pool without reselecting its old skill.
5. Check wound wording, Fatigue guidance, damage labels, and the STR+DEX Combat Style percentage.

### Unfinished
Signed-in browser, cloud roundtrip and desktop walkthrough remain to be checked. No database/auth changes. Sorcery and later checklist batches remain pending. No merge or deployment authorized by this changelog.


---

<!-- merged from CHANGELOG-COMBAT-AUDIT-FIXES.md, added 2026-11-04 -->
## Combat audit fixes

- Wound damage, direct HP entry, and quick damage preserve negative HP below the Major Wound threshold (Mythras Core p.110).
- Pin Down can be stacked and Entangle cannot, following the Special Effects Summary (Core p.100).
- Test a 5-HP location with 20 damage after armour: it should show −15. Save and reopen, then check recovery starts at −15. In Special Effects, check that Pin Down can be selected twice when two effects are won and Entangle cannot.
- Signed-in browser persistence remains unverified. Earlier damage already lost to the old cap cannot be reconstructed automatically.


---

<!-- merged from CHANGELOG-COLD-LINKS.md, added 2026-11-04 -->
## Campaign and character links

- Keep the requested page when the app restores a signed-in session, instead of allowing an early menu render to replace the link.
- Check: sign in, open a campaign or saved character, and refresh. The same page should reopen. Also check a signed-out private link and a campaign invitation.
- Automated route tests simulate the authentication race; production browser confirmation remains necessary.


---

<!-- merged from CHANGELOG-CHARACTERISTIC-CASES.md, added 2026-11-04 -->
## Characteristic verification cases

- Checked the human characteristic generation and attribute sections against Core pp. 8–10 and recorded individual cases with their limits.
- Corrected dice and points-build guidance that previously presented a paraphrase as a quotation. Character generation behavior is unchanged.
- Added table boundary checks for damage modifiers and all human height/weight rows and frames. Existing custom measurement overrides remain supported.
- Test: open Characteristics in the builder, check the dice and 80-point guidance, then create a human and verify the Height & Weight card. Live save/reopen of manual measurements remains to be verified.


---

<!-- merged from CHANGELOG-CHARACTERISTIC-ADVANCEMENT.md, added 2026-11-04 -->
## Characteristic advancement

- Improve a characteristic through ongoing training or the GM-approved optional permanent rule (Mythras Core, pp. 72–73). Mundane SIZ increases are excluded.
- Training uses a banked Experience Roll to start each step, then reduces each future award by one roll per maintained step. Stopped steps atrophy on later awards. The current score cannot exceed the species maximum.
- Permanent improvement uses the optional one-time price. Creation scores remain separate; skills and derived values use the current score, including on the party board. Existing character files do not acquire bonuses on load.
- Test in Play Mode → Improve Skills: award rolls, open Improve characteristics, confirm GM approval, train STR and check the skill and derived changes. Award rolls once and check maintenance; stop training, award again and check atrophy. Save/reopen and check the same values. Try the permanent option with enough rolls and check that creation scores and point-build totals remain unchanged.
- Rounding of the training step follows the examples on Core p. 72. Award each allotment once: each positive award triggers maintenance and atrophy. Live signed-in saves and sharing remain to be checked.


---

<!-- merged from CHANGELOG-CHARACTER-BACKUPS.md, added 2026-11-04 -->
## Character backups

Character import is now in a collapsed Advanced / Backup section of My Characters. Each saved character has a collapsed Backup control for downloading a portable copy. Guest library backup controls are available in guest mode.

Test: sign in, open My Characters, expand Advanced / Backup and import a character; confirm it creates a separate copy. Expand Backup on a character card, download its backup, then reimport it and check the character and portrait. Confirm guest library backup controls only appear in guest mode.

Cloud and browser saves still use the existing formats. Test with a real account and browser before release.


---

<!-- merged from CHANGELOG-CAREER-SUBSYSTEM.md, added 2026-11-04 -->
## Career subsystem audit

Source: user-uploaded Mythras Core Rulebook, printed pp. 28–34, checked using rendered pages.

- Record up to seven professional skill options for custom careers; select up to three of those for the character afterwards.
- Support up to seven custom-career Combat Style slots within the seven-standard-skill limit.
- Preserve legacy custom-career choices and allocations; when an older career is edited, seed its option list from the professional skills already selected.
- Make the bonus hobby skill optional, as described on Core p. 34.
- Record remaining speciality, exact-age/category, entry-by-entry and live-verification gaps in `docs/core-career-cases.md`.

All automated Node suites pass; these changes still require a deployed signed-in test.


---

<!-- merged from CHANGELOG-CAREER-ENTRY-CHECKS.md, added 2026-11-04 -->
## Career entry checks

Compared the 24 careers in `js/data.js` with the rendered pages of the user-uploaded Mythras Core Rulebook, printed pp. 29–33. Added independently transcribed regression cases for each career's standard skill names, professional skill names including repetitions, and Combat Style count. One source spelling, “Navigate”, is normalized to Navigation.

All 24 entry checks pass. This is not a complete speciality, style-label, character-creation or live-site verification. The open interpretation of repeated specialised offers and the inconsistent current handling for published and custom careers are recorded in `docs/core-career-cases.md`.


---

<!-- merged from CHANGELOG-CAREER-CHANGE-WARNING.md, added 2026-11-04 -->
## Career change warning

Changing careers now asks before resetting existing career skill choices, named Combat Styles or allocated career points. Cancelling retains them; confirming performs the existing reset. All ten automated Node suites pass. Signed-in live verification remains open.


---

<!-- merged from CHANGELOG-CAMPAIGN-RULES.md, added 2026-11-04 -->
## Campaign setup and rules

- Create Campaign opens a setup page for a name, characteristic-improvement method, and optional book selections. Permanent improvement is preselected and the GM can change it.
- Campaign GMs can edit the rules and books afterward from Campaign rules & books. Linked characters use the GM's improvement setting. Existing campaigns without settings retain both existing choices until their GM configures them; standalone characters keep both choices.
- Book selections are recorded only. They do not yet implement or enable supplement mechanics. Existing ongoing training and saved character values are preserved when a campaign changes methods.
- Test: create a campaign, choose permanent improvement and a book, save, reopen the campaign and check its settings. Link a test character, open Play Mode → Improve Skills, and verify only permanent improvement can be added. Change the GM setting to training, reopen the character's improvement panel and verify training is offered instead. Check an existing campaign still opens and can be configured.
- The campaign settings column is separate from the combat tracker and is protected by the existing GM-only campaign update policy. Automated tests cover local saves, permissions guards, stale settings and failures. Signed-in GM/player browser verification remains outstanding.


---

<!-- merged from CHANGELOG-BUILDER-BUTTONS.md, added 2026-11-04 -->
## New Sit’ota — Character Builder Button Refinement

### Changes
- Removed the heavy, gold-filled fantasy-CTA treatment from Character Creation controls.
- Creation method and archetype switches now use neutral paper tones, slim dividers and a subtle bottom rule for the selected option.
- Species, culture and career choice cards have thin borders, quieter serif titles, and a slender selected-state accent rather than a bronze halo.
- Smaller dice, allocation, magic, equipment and other option buttons use understated outlines; selections remain visibly marked.
- Builder's fixed Back/Next controls are restrained, with Next emphasized using light-gold type and a fine underline rather than a filled button.
- Changed the active step number from a filled bronze disc to a quiet outline.
- Added visible keyboard focus and disabled states.
- Bumped `sitota-interior.css` from v1 to v2 so existing desktop browsers load the update.

### Unchanged
- **Play Mode** remains exactly as before: no Play Mode selectors, JavaScript, or styling altered.
- The homepage's simplified Explore Sit’ota text link remains unchanged.
- The character creation workflow, skill calculations, save format, cloud auth and printable sheet are unchanged.

### Verification
- Scoped CSS source checks for builder-specific control states and Play Mode exclusion.
- Existing `tests/sitota-interior.cjs` updated.
- Full Node regression suite and authenticated live browser walkthrough were not run from this chat.

### Manual checks
1. New Character: Full/Quick, tier, species, culture and career selection shows a clearly visible active state.
2. Roll/points/manual characteristic options, skill adjustments, money, magic and equipment buttons remain usable.
3. Back/Next actions still enable/disable correctly and are visible over the dark footer.
4. Keyboard Tab focus, disabled controls, 1440px desktop, and narrow screen behavior.
5. Play Mode, World Guide and the homepage should be visually unchanged.


---

<!-- merged from CHANGELOG-AGEING-REVIEW.md, added 2026-11-04 -->
## Ageing review

- Correct the creator's misleading description of ageing as optional. For humans age 40 or older, show the applicable current ageing band and test grade; flag Senior and Old characters for review.
- Record a GM review or override with notes. The record is tied to the chosen age, category and species, so changing them prompts a new review. Existing characteristics and saves are not changed.
- Test a human age 44 and then age 50; the displayed grade should change from Easy to Standard, and a previously recorded review should need updating. Save/reopen and confirm the review is preserved.
- Still unfinished: ageing rolls, characteristic reductions and their effects on derived values are not automated. Handle them with the GM; signed-in persistence requires testing.


---

<!-- merged from CHANGELOG-AGEING-OUTCOMES.md, added 2026-11-04 -->
## Ageing outcomes

- Record the two check outcomes and dice results for eligible human ageing bands, with GM confirmation. Failed checks reduce the appropriate characteristic according to Mythras Core pp.70–71; a zero characteristic is flagged for terminal frailty.
- Current values and related skills and attributes recalculate while creation scores remain unchanged. Previous reviews and old saves do not gain automatic losses. A duplicate band is rejected, and the last recorded band can be removed after confirmation.
- Test: on a test character aged at least 40, open the ageing review on the Concept step. Record an Endurance failure with table roll 1 and loss 2; record a Willpower success. Check that current STR and STR-based skills drop by 2, save/reopen, then remove the last record. Confirm that an already-recorded band cannot be recorded again.
- Checks and dice rolls are still made at the table; non-human ageing is GM-managed. Live signed-in persistence and browser validation remain outstanding.


---

<!-- merged from CHANGELOG-AGE-CATEGORY-VALIDATION.md, added 2026-11-04 -->
## Age category validation

Source: user-uploaded Mythras Core Rulebook, printed pp. 33–34.

- Check entered human ages against the selected category's Core dice range and explain mismatches before proceeding.
- Permit a GM to record an exception for the specific age, category and species; changes require a new exception.
- Keep the entered age and skill allocations when changing categories rather than clearing the age.
- Leave non-human age ranges to the GM, as different lifespans need different year ranges.

Automated tests cover category boundaries, exception persistence and invalidation, age changes, allocations and non-human characters. Live verification remains open.


---

<!-- merged from CHANGELOG-ACCOUNT-BACKUPS.md, added 2026-11-04 -->
## Account backups and Sorcery guidance

Character backup import and download controls now live in Account under Advanced / Backup. Load saved characters there before downloading an individual backup. The Characters page no longer displays backup controls.

Sorcery now labels its round-up calculation as requiring GM confirmation beyond the printed 47% example. The roadmap records PR #34 as merged while retaining the rounding and production-test follow-up.

Test: sign in, open Account, expand Advanced / Backup, load characters, download one, then import it as a new copy and check its portrait. Confirm Characters has no backup controls, and a signed-out user cannot see another account's list. Open a Sorcery entry and check the rounding note. Real-account and browser checks are still required.

