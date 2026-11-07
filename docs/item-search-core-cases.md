# Item search and Core Combat Style Traits — source review

**Date:** 2026-11-06 (Los Angeles). **Reviewed main:** `b412bc4334ea56cf24d02d0f4c6b6abb3243e152` after #176/#177. Read HANDOFF first. Documentation only; no application or test files changed, no signed-in/live test claimed. Overall progress remains **5/8**.

**Authoritative source:** the owner's uploaded **Mythras 2e Core Rulebook**, `pdfcoffee.com_mythras-2e-2-pdf-free.pdf`, printed pp.58, 62, 89; p.108 additionally verifies the Skirmishing cap. PDF pages are printed page +1. Parsed text was inspected first, but its font encoding garbles these tables and digits. All three requested pages, and p.108, were rendered and visually checked. No rulebook pages/images are committed to this public repository.

**Scope:** `CORE_AMMO`, `ARMOR_MATERIALS`, `offeredCombatTraits()` in `js/data.js`, plus `pmItemCatalog()` in `js/play.js` where single-location armour cost is actually calculated. This is source/data acceptance, not proof of search/add/save UI behavior.

## Summary

| Area | Result | Required correction |
|---|---|---|
| Ammunition quantities and bundle prices, Core p.62 | **PASS, 5/5** | None. Optional label precision below. |
| Armour AP, per-location ENC and suit-cost ÷7, Core p.58 | **PASS, 8/8** | None. Printed Mail suit-ENC inconsistency below. |
| Offered Core trait names and membership, Core p.89 | **PASS, 26/26** | None missing, duplicated or extra. |
| All 26 trait descriptions, including formation conditions | **PASS for rules meaning** | Not a byte-for-byte transcription: valid citations, a p.108 reminder and paraphrased footnotes are explained below. |

## Ammunition — Core p.62

Prices are **silver pieces per bundle**, not per projectile. Every bundle quantity and price matches the rendered book.

| Case | `CORE_AMMO` label | Quantity | Core / app price (sp) | Result |
|---|---|---:|---:|---|
| IS-AM01 | Arrows (12) | 12 | 4 / 4 | PASS |
| IS-AM02 | Crossbow quarrels (12) | 12 | 3 / 3 | PASS |
| IS-AM03 | Sling bullets (20) | 20 | 1 / 1 | PASS |
| IS-AM04 | Blowgun darts (6) | 6 | 2 / 2 | PASS |
| IS-AM05 | Thrown darts (12) | 12 | 2 / 2 | PASS |

**Optional wording correction IS-N01:** the book specifies **Lead sling bullets**. Renaming the app bundle to **Lead sling bullets (20)** would retain the material qualifier; the present shorter name does not change its correct quantity or price. The crossbow qualifier on quarrels is harmless clarification. No ammunition ENC is supplied by this p.62 list: the catalogue's `ENC: ask your GM` is an app placeholder, not a verified zero-weight rule.

## Armour — Core p.58

The book explicitly supplies **cost per location** as well as full-suit cost. `pmItemCatalog()` uses `encPerLoc` directly for a carried piece and rounds `suitCost / 7` to two decimals for its cost. All eight divisions yield the exact printed integer, so no rounding discrepancy arises. `None` is an app control excluded from item search, not a ninth Core armour construction.

| Case | Construction | AP | Core / app ENC per location | Printed suit cost (sp) | Suit cost ÷7 = printed cost per location (sp) | Result |
|---|---|---:|---:|---:|---:|---|
| IS-AR01 | Natural/Cured | 1 | 2 / 2 | 140 | 20 | PASS |
| IS-AR02 | Padded/Quilted | 2 | 1 / 1 | 560 | 80 | PASS |
| IS-AR03 | Laminated | 3 | 2 / 2 | 1260 | 180 | PASS |
| IS-AR04 | Scaled | 4 | 3 / 3 | 2240 | 320 | PASS |
| IS-AR05 | Half Plate | 5 | 4 / 4 | 3500 | 500 | PASS |
| IS-AR06 | Mail | 6 | 5 / 5 | 6300 | 900 | PASS |
| IS-AR07 | Plated Mail | 7 | 6 / 6 | 9800 | 1400 | PASS |
| IS-AR08 | Articulated Plate | 8 | 7 / 7 | 16800 | 2400 | PASS |

**Source inconsistency IS-N02, not an app transcription failure:** the rendered Mail row prints **5 ENC per location** and **30/6300/7** for suit ENC/cost/penalty. Seven pieces at 5 ENC sum to 35, while the book's full-suit column says30. `ARMOR_MATERIALS` and the inventory search preserve both printed values; the existing regression explicitly expects a full suit at 30 ENC and a piece at 5 ENC. Do not silently change 30 to 35 in a transcription fix. If a single internally consistent suit-ENC convention is desired, Claude should flag that separate rules interpretation for an explicit decision. This does not affect the verified 900sp per-location price. Other suit ENC/cost/penalty strings also match the printed column; Half Plate is **28/3500/6**, not 2/3500/6.

## Combat Style Traits — Core p.89

Evaluating `offeredCombatTraits()` returns exactly the following 26 unique names in the book's order, all with `source === "Mythras"`. The source filter excludes supplement/house entries, including Mounted Skirmisher. The entire offered description of each row was compared visually, not just its name. Categories are app navigation metadata, not headings asserted to come from the book's table.

| Case | Exact Core trait name | Verified rule/condition (brief paraphrase) | Result |
|---|---|---|---|
| IS-CT01 | Assassination | Access to Kill Silently. | PASS |
| IS-CT02 | Batter Aside | DM advantage of at least two steps increases weapon Size for bypassing parries. | PASS |
| IS-CT03 | Beast-back Lancer | Mounted charge avoids its one-step attack penalty. | PASS |
| IS-CT04 | Blind Fighting | Ignores poor-lighting and temporary-blinding penalties. | PASS |
| IS-CT05 | Cautious Fighter | Withdraw with Change Range without a roll. | PASS |
| IS-CT06 | Chariot Fighting | Driver's Drive no longer caps combat rolls. | PASS |
| IS-CT07 | Daredevil | Melee Evade without becoming prone. | PASS |
| IS-CT08 | Defensive Minded | Parrying Size increases one step if no offensive action that round. | PASS |
| IS-CT09 | Do or Die | Dual-weapon Flurry must alternate weapons. | PASS |
| IS-CT10 | Excellent Footwork | Ignores Acrobatics cap on unstable/slippery footing. | PASS |
| IS-CT11 | Formation Fighting | At least three; cannot be outflanked; engaging enemies lose one AP; group training requirement retained. | PASS |
| IS-CT12 | Hidden Weapons | Specified innocuous objects function as weapons without accidental breakage. | PASS |
| IS-CT13 | Intimidating Scream | Psychological resistance imposed on foes is one grade harder. | PASS |
| IS-CT14 | Knockout Blow | Surprise extends Stun Location duration from turns to minutes. | PASS |
| IS-CT15 | Mancatcher | Opposed escape/evasion from entanglement is one grade harder. | PASS |
| IS-CT16 | Mounted Combat | Removes Ride cap on combat rolls. | PASS |
| IS-CT17 | Ranged Marksman | Move a random ranged hit to an adjacent location. | PASS |
| IS-CT18 | Shield Splitter | Clubs/axes roll damage twice, take best, only for Damage Weapon against shields. | PASS |
| IS-CT19 | Shield Wall | At least three shield users; extra passive-block location; Brace-like resistance; group training requirement retained. | PASS |
| IS-CT20 | Siege Warfare | Ignores Athletics cap while assaulting walls/tunnels. | PASS |
| IS-CT21 | Skirmishing | Ranged attacks while running, never sprinting; p.108 Athletics cap preserved. | PASS |
| IS-CT22 | Swashbuckling | Jumping/swinging attacks and evades ignore Athletics cap. | PASS |
| IS-CT23 | Throw Weapons | Melee weapons in style may be thrown without skill penalty, at half damage. | PASS |
| IS-CT24 | Trained Beast | User's AP may defend the animal companion. | PASS |
| IS-CT25 | Unarmed Prowess | Unarmed blocks/parries count as Medium. | PASS |
| IS-CT26 | Water Combat | Removes Swim cap on combat rolls. | PASS |

**Literal-text qualification:** the offered names match exactly; descriptions match the rules, not every character of the table. Blind Fighting adds a Core citation. Formation Fighting and Shield Wall put the shared asterisk requirement into each description: every member must possess the benefit for the coordinated effort to work. Skirmishing appends the Athletics cap from **Firing on the Move, Core p.108**; the rendered paragraph explicitly supports it. These are valid clarifications, not additional Core traits or incorrect restrictions. Punctuation and possessive apostrophes also differ typographically. No description needs a mechanical correction.

## Validation and next action

- Independent read-only data evaluation compared all 5 ammunition prices, all 8 AP/ENC/per-location-cost rows, and the exact ordered26-name list against values read from the rendered source. All pass.
- All **34 existing local `tests/*.cjs` scripts pass**, including `play-inventory-traits.cjs`. No new test files or code were written. `git diff --check` passes.
- Claude: review/merge this docs PR. Optional IS-N01 is a label-precision improvement only. IS-N02 is a printed-source inconsistency, not permission to change armour mechanics. No required price, ENC-per-location or trait correction emerged. Keep progress **5/8**.
