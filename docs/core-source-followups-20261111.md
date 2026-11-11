# Mythras Core — outstanding source-based magic specs (2026-11-11)

**Source:** Owner's uploaded *Mythras 2e Core Rulebook*, printed pp.119, 131, 137–138, 157 and 218. I checked the rendered page images, especially the two tables on pp.131 and 138; the PDF's extracted text is partially garbled. All descriptions below are paraphrases, not reproduced book prose.

**Scope:** These are code-needed follow-ups for AN-F06–F07 and SO-C02, plus two source dispositions. They do **not** reopen the Subsystem 6 or 8 closes: under `AGENTS.md`, the affected portions remain GM-handled until implemented and accepted. Do not duplicate the existing AN-F01–F05 workflow or D-5 wound/domination interruption handling.

**Status (Claude, 2026-11-11):** AN-F06, AN-F07 and SO-C02 built, `tests/spirit-combat.cjs`; live check pending. Policy D-9 in `decisions.md`.

## AN-F06 — Spirit Combat (Core pp.131, 137–138)

- In a Spirit Combat exchange, an animist uses **Binding**; a spirit uses **Spectral Combat**. A mortal without the relevant spirit-fighting training falls back to **Willpower**. Use differential attack/parry outcomes and Spirit Combat effects, not the physical Combat Special Effects catalogue.
- A successful *unparried* psychic hit removes **Magic Points**, not physical hit-location HP. Look up the attacker's relevant skill percentage using the p.131 Spirit Damage progression:

| Attacking skill % | Psychic damage dice |
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
| Above 300 | Continue the printed +20%-per-step progression (for example 301–320 → 3d10 + 1d2) |

- Preserve participant identity, MP, and AP. On zero MP the defeated participant becomes helpless; expose the **GM's** selected consequence. Do not silently select Possession, Binding, Exorcism or any other defeat outcome. Do not incorporate the p.139 optional Tenacity / physical-damage variants in the default mode.
- Tests: both sides of the 20/21, 100/101 and 300/301 boundaries; animist versus spirit skill selection; unparried hit drains MP without reducing location HP; parried or failed hit does not drain MP; zero-MP ending retains the GM's choice and saved state.

## AN-F07 — Effect selection and eligibility (Core p.138)

The p.138 table specifies whether an effect is obtainable from an **offensive** or **defensive** result, and any extra gate. **Off = offensive; Def = defensive.** These are selection gates; effects with substantial supernatural consequences stay GM-confirmed unless their own code case is written.

| Effect | Allowed result | Additional gate | Brief outcome for the selection UI |
|---|---|---|---|
| Bleed Essence | Off / Def | Critical result | Psychic wound leaks 1 MP per cycle until combat ends |
| Compel Bargain | Off | None specified | Opposed Willpower contest to compel a deed, ending combat if successful |
| Drive Off | Off | Mortal actor only | Target spirit resists with Willpower or withdraws from combat |
| Leech Strength | Off | Critical result | Attacker gains the MP inflicted by that attack |
| Obscure | Def | Critical result | Attacker loses track of defender until making another attack |
| Possess | Off | Spirit actor only; spirit must be capable of possession | Opponent resists against spirit attack using Willpower; GM resolves possession |
| Psychic Stun | Off / Def | None specified | Opponent loses its next Turn |
| Restrain | Off / Def | Mortal actor only | Stops a spirit fleeing or engaging other participants |
| Spirit Lance | Off | None specified | Roll psychic damage twice and use the better result |
| Sunder Binding | Off / Def | Spirit fumbles | Breaks the fetter that confines the spirit |
| Suppress Ability | Off / Def | Mortal actor only | Switches off one spirit ability currently active |
| Turn Back | Def | None specified | Attack is turned upon its maker using the attacker's Spirit Damage |
| Withdraw | Def | None specified | Defender ends their participation and returns to their appropriate place/body |

- The **Spirit Fumbles** condition on Sunder Binding is distinct from merely achieving a critical or any normal success. Restrict the species-role gates to the actor named by the table; do not infer that every spirit effect is available to an untrained mortal.
- Tests: every effect appears only in its printed Off/Def column(s); critical-only gates, Spirit Fumbles, mortal-only, spirit-only and possession-capability gates each have positive and negative cases; no physical Special Effect appears in this selector; GM-confirmed supernatural outcomes are not applied automatically.

## SO-C02 — actions during a multi-turn Invocation (Core p.119)

**Code-needed guard:** While the cast is in progress, the caster can **walk at most at ordinary walking speed** and take **Free or Reactive Actions**. Incompatible ordinary actions include attacking an opponent, attempting another skill/task, making another spellcasting attempt, and moving faster than walking. Do not offer those actions as compatible with continuing the current Invocation. The ongoing cast itself is the activity being undertaken; a queued cast surviving save/reload is already implemented and must be preserved.

- Reactive parry/evade is permitted; the **GM may** increase the final casting difficulty to reflect disruption. This is discretion, not an automatic interruption.
- The page also states casting prerequisites for mental focus, an available gesturing hand, vocalisation and sensing a target when needed; losing a prerequisite may make the magic roll harder. Keep that separate from the general incompatible-action guard.
- D-5 already specifies wounds and mental domination. **Do not duplicate those controls**, and do not deduct final casting MP merely because another turn elapsed.
- Tests: walking and Free/Reactive actions allowed; attack, other skill, second spell and faster movement disallowed while pending; parry/evade followed by a GM-chosen modifier; cancel/reload neither duplicates costs nor allows prohibited actions to resume the same cast.

## MY-C03 / D-6 source disposition (Core p.157)

**No direct contradiction identified.** Page 157 says each Augment Intensity improves effective difficulty by one grade, allowing it to cancel adverse grades and reach no better than **Very Easy**. Applying the offset to Encumbrance/Fatigue grades is consistent with this. The rule does not independently prescribe how the application's **Automatic/Hopeless** endpoints behave; leaving those unmoved remains a labelled **app/GM policy**, not a claimed quotation from the book. No code change needed for D-6 on this reading.

## Creature Vulnerable source disposition (Core p.218)

The Vulnerable trait explicitly disables **natural and magical** protection against the specified source; it does **not** list worn equipment armour. Therefore the existing #230 interpretation (worn armour still counts unless another rule overrides it) is consistent with p.218. This resolves the previously missing **source-page check**, not the unperformed live worn-armour check. No new production-code request based solely on this paragraph.
