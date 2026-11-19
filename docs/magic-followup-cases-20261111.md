# Magic follow-up cases and milestone decisions — 2026-11-11

Source: owner's uploaded `pdfcoffee.com_mythras-2e-2-pdf-free.pdf` (Mythras 2e Core), printed pp.119, 131, 137–138, 157, 218; PDF pages are printed + 1. Parsed text was garbled, so every cited page and both tables were checked in locally rendered page images. Paraphrases below; no book pages committed. Read AGENTS.md and HANDOFF.md first.

## One milestone decision per close

- **Subsystem 6: accept the close under the current AGENTS.md rule.** Main deployed workflows are evidenced by #278 (Animism), #280 (Mysticism), #282 (learning), and #286 (Organisations); Folk Magic's retained pass stands. #284's Severity 1 is fixed by #285 and the deployed recheck passed. #287's successful Tests run [43052302199](https://github.com/colemak1/mythras-character-forge/actions/runs/43052302199) is CI evidence at head `982904188a2398a9271f984436dfe05ef9e17093`. Accept #286's correction-history disposition: only the actual current membership's Joined entry remains; the mistaken pick leaves neither a Former record nor its own log. No new Severity 1 found. Keep Spirit Combat and SO-C02 GM-handled until implemented; legacy acquisition label and old creation draft limits stay scoped, not live passes.
- **Subsystem 8: accept the close under the same rule.** Main campaign/permission/gift/stale-save/export/restore workflows have deployed evidence; D-S5 accepts CI permission tests for direct access. The recovery remainder in [#270](https://github.com/colemak1/mythras-character-forge/pull/270) records normal app-created PC/NPC/creature tracker restore, unchanged B originals and B's restored-campaign join; #273's `session-zero-live-273-20261110.md` independently records restored NPC/creature cards drawing. #270 remains open: cite its evidence as branch evidence, not merged. No new Severity 1 found. Keep independent-account races, second player owner, profiles, phone route matrix and case mapping as limits. Owner item 11 remains outstanding; actual data loss reopens 8. Manual campaign exports remain the recovery procedure; they do not promise whole-service recovery.
- **Small status wording cleanup for Claude, not a new gate:** subsystem-plan item 8 still says restored GM Tools was never opened; #273 supplies that pass. session-zero's “Later features: All of Subsystem 6” is stale after #287. Update those authoritative entries in the next batch; this file does not establish a third status tracker.

## AN-F06: Spirit Combat implementation inputs

Core pp.131, 137–138. Keep this separate from physical combat and optional Tenacity/physical damage variants. Animists attack/parry using Binding; spirits use Spectral Combat; uninitiated mortals use Willpower (p.137). Use differential attack/parry results for Spirit Combat effects. A successful un-parried psychic attack rolls Spirit Damage against **MP**, not location HP. Zero MP means helpless/defeated; consequences remain GM-selected and ability-dependent. Preserve participants, AP, MP and unresolved choices across reload; no automatic possession or binding.

### Spirit Damage lookup (p.131)

Use the participant's applicable combat skill above; p.131 explicitly names Binding and Spectral Combat as the table inputs. Willpower fallback comes from p.137. Retain this attribution rather than implying Willpower is printed in the table.

| Skill % | Damage dice |
|---|---|
| 1–20 | 1d2 |
| 21–40 | 1d4 |
| 41–60 | 1d6 |
| 61–80 | 1d8 |
| 81–100 | 1d10 |
| 101–120 | 2d6 |
| 121–140 | 1d8 + 1d6 |
| 141–160 | 2d8 |
| 161–180 | 1d10 + 1d8 |
| 181–200 | 2d10 |
| 201–220 | 2d10 + 1d2 |
| 221–240 | 2d10 + 1d4 |
| 241–260 | 2d10 + 1d6 |
| 261–280 | 2d10 + 1d8 |
| 281–300 | 3d10 |

Above 300, continue the same progression for each further 20 skill points. The source table begins at 1; do not invent a 0%-skill damage row. Test both ends of each listed band and the 300/301 extension. The Average Roll column is a reference, not fixed damage.

### AN-F07: effect eligibility (p.138)

Offensive/defensive means the role of the party selecting the effect. “Mortal” and “spirit” restrictions concern that selector; Sunder Binding instead depends on the opposing spirit's fumble. These gates apply in addition to earning the required differential success/effect choice.

| Effect | Role | Extra prerequisite |
|---|---|---|
| Bleed Essence | Offensive or defensive | Selector's critical |
| Compel Bargain | Offensive | No extra roll/type gate |
| Drive Off | Offensive | Mortal selector |
| Leech Strength | Offensive | Selector's critical |
| Obscure | Defensive | Selector's critical |
| Possess | Offensive | Spirit selector; capable of possession |
| Psychic Stun | Offensive or defensive | No extra roll/type gate |
| Restrain | Offensive or defensive | Mortal selector |
| Spirit Lance | Offensive | No extra roll/type gate |
| Sunder Binding | Offensive or defensive | Opposing spirit fumbles; a binding/fetish exists to break |
| Suppress Ability | Offensive or defensive | Mortal selector; spirit has an ability currently operating |
| Turn Back | Defensive | No extra roll/type gate |
| Withdraw | Defensive | No extra roll/type gate |

Minimal outcomes to support: Bleed Essence drains 1 MP per cycle through combat end; Leech Strength transfers the attack's MP damage to the attacker; Psychic Stun costs the opponent its next Turn; Spirit Lance rolls damage twice and uses the better result; Turn Back applies the attacker's own Spirit Damage roll to the attacker. Compel Bargain adds Influence versus defender Willpower; Drive Off and Possess require the defender's Willpower against the attack roll. Obscure hides the defender until they attack again; Restrain prevents escape or engaging others; Suppress Ability stops one operating spirit ability; Withdraw allows the defender to leave for body/fetish/Spirit Plane as appropriate. Binding/possession/bargain details remain GM-resolved. Test every role and prerequisite refusal, including critical versus ordinary success and spirit-fumble versus mortal-fumble.

## D-6 — Core p.157

**No contradiction found:** Augment can offset situational difficulty penalties, including Encumbrance/Fatigue; p.157 caps the effective grade at Very Easy and preserves excess against later penalties, but does not explicitly define Automatic/Hopeless handling, so leaving those unmoved remains an app policy.

## SO-C02 — Core p.119

While a multi-turn Invocation is pending, only movement up to walking pace and Free/Reactive Actions are allowed alongside casting. Incompatible ordinary actions include attacking, running/sprinting, starting another spell or other proactive action, and unrelated skill tasks. Implement a guard/clear choice to abandon casting before those actions, rather than silently allowing both; this is an implementation proposal, not a book-prescribed UI or MP charge.

Do not cancel merely because the caster parries or evades: reactions consuming AP delay completion; the GM may also apply a casting difficulty penalty. Walking and legitimate Free Actions remain available. Do not reject every skill roll indiscriminately: allowed reactions can require skill rolls. D-5 already handles injury/domination. Test pending cast + attack/run/unrelated skill refusal, allowed walking/free action, and reaction delaying rather than deleting the pending cast; retain pending state/no premature MP charge across reload.

## Vulnerable — Core p.218

Confirmed: a listed source bypasses the creature's **natural and magical** protection. The trait does not say to ignore worn armour or multiply damage; keep worn armour unless the individual entry specifies otherwise. Existing #230 reading needs no new code on this page. This settles the source-check limit, without claiming any new live test.

## Additional source correction for Claude

**AN-F02 spec error (p.137):** ordinary successful summoning arrival is **1d6 minutes**, not the earlier spec's 1d4; critical remains 1d3 rounds. Correct the old spec and inspect the app/test expectation in the next batch. This review has not inspected that implementation, so it is not a confirmed app bug. If the app follows 1d4, treat as Severity 2 (rare timing rule, GM-workable) and fix with boundary/outcome tests. Neither close is reopened.

No new live testing performed. Production code untouched. Next: Claude implements SO-C02 and AN-F06–F07 from these verified inputs, checks AN-F02, and makes the small status wording corrections; retain all scoped passes and limits.
