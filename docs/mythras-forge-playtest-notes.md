# Hands-On Playtest Notes — Sarai Vekh (July 2026)

Built end-to-end in the live app (colemak1.github.io/mythras-character-forge) to stress-test the full creation flow and the new Combat Style maker as an actual user would.

## Character built

**Sarai Vekh** — Nomadic culture, Scout career, Ordinary tier. Horse-clan raised, clan scattered by a slaver raid in her youth; now a caravan guard. Points-Build characteristics (STR10/CON12/SIZ10/DEX17/INT11/POW11/CHA9). Cultural combat style "Kolo Wind-Riders" (sabre, buckler, recurve bow) carried through and further trained at Career via the "same as cultural style" link. Passions: Loyalty to clan-kin (52%), Hate for slavers (52%), Love for her brother Temu (55%). Trance (Ancestor Communion) taken as hobby skill for the animist-flavoured backstory. Combat Style Traits: Skirmisher, Excellent Footwork, Marksmanship, Cross Parry. Final Kolo Wind-Riders 72%, Perception 64%, Stealth 60%, Ride 53%.

Full build completed with no dead ends; every step's validation gate cleared cleanly.

## Findings, ranked by severity

**High**

1. **Overspending silver isn't blocked.** Money & Gear tracks starting silver and lets you deduct a manual "Silver spent on gear" figure, but entering more than you have (tested: 260sp against a 250sp budget) just turns the remaining total red (`-10 sp`) — the step still reports "Step complete" and lets you proceed. Every other resource pool in the app (Culture/Career/Bonus points) hard-enforces an exact or maximum total; money doesn't, so a build can finish in the red unnoticed.

**Medium**

2. **Gear cost isn't auto-calculated.** Every weapon and armor entry already carries accurate price data (visible in the button tooltips, e.g. "150sp," "225sp"), and ENC totals *are* auto-summed as you pick items — but silver cost isn't. The player has to manually add up prices themselves and type a single total into one field. Inconsistent with how the app auto-totals everything else.
3. **Encumbrance penalties are cosmetic, confirmed in play.** The Money & Gear step says outright: "Encumbrance is totted up and flagged against your STR×2 limit, but not enforced — nothing here blocks you from carrying more." That's honest framing, but it also means the Burdened/Overloaded Grade penalties described elsewhere in the app never actually apply to a roll — confirmed this against the roll engine, not just the warning text.

**Low / UX friction**

4. **Combat Style Trait category auto-collapses after every pick.** The intro text explicitly invites picking "as many weapons and Combat Style Traits as fit," and the Individual category alone holds 50 traits — but selecting one trait collapses the whole category, forcing a re-expand for the next pick. Tedious when building a style with several traits.
5. **Chip/button lists reflow on selection, causing mis-clicks.** Weapon and trait pickers wrap to a new layout the instant an earlier item gets marked selected (its chip changes size/color), which shifts every later chip's position. Clicking quickly through a list — exactly what a real user does — can land the next click on the wrong item. Hit this concretely: selecting Buckler right after Sabre landed on "Whip" instead because Sabre's selection had already reflowed the row.
6. **"+ add passion" occasionally needs a second click to register**, no visible cause — same click position, no error, just no new row until clicked again.

**Minor / opportunity, not a bug**

7. **Height & Weight is still a manual lookup** even though the Concept step already collects Body Frame and Characteristics already has SIZ — the app tells you to "read it off the table... record in the notes if you wish" rather than computing it, despite already holding both inputs it needs.

## What worked well

Worth noting since the ask was a genuine critical pass, not a complaint list:

- Live side-panel recalculation of characteristics/attributes/hit points/points-pool totals on every single step, with no lag or stale values observed.
- Culture (100pt, 5–15/skill), Career (100pt, 0–15/skill), and Bonus (150pt +tier bonus, tier-capped) pools are all tightly and correctly gated — couldn't advance a step over/under budget.
- The "same as cultural style" Career combat-style link is an elegant, rules-faithful touch — lets a character's guard-work training visibly build on the same horse-archer style from childhood instead of forcing an arbitrary second style.
- Weapon/armor tooltips carry full accurate stat blocks (damage/reach/effects/ENC/AP-HP/cost) straight from the verified data tables.
- Play Mode's dice roller correctly implements the crit/success/failure/fumble bands, including fumble-only-on-00 above 100%, with manual override buttons for opposed rolls (Critical/Success/Failure/Fumble) — matches the rules exactly.
- Special Effects panel fully reproduces the margin-of-victory table and all 43 effects with weapon-type tags (Cutting/Impaling/Ranged/etc).
- Inventory tab correctly aggregates gear ENC against the unencumbered limit and tracks remaining silver live once entered.
