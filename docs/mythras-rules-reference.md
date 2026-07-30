# Mythras Rules Reference ("Myth")

Standing rules-knowledge base for the Mythras Forge character-builder project. Written for two audiences: a future instance of me (no memory between sessions) acting as "Myth," the project's Mythras rules authority, and any developer-agent that touches `js/data.js` / `js/engine.js` and needs to know *why* a number is what it is before changing it.

Companion file: `docs/mythras-sources-coverage.md` — an honest ledger of what was actually checked in the research pass that produced this doc, what wasn't, and why. Read that one first if you're deciding whether to trust a claim here at face value or go re-verify it.

## 0. How to use this doc

- Treat `js/data.js` as the project's own verified baseline — its inline comments already cite rulebook page numbers, the Character Creation Workbook, and the Mythras Companion, and several comments explicitly flag corrections to earlier bad transcriptions (see §1). Don't silently override it; if something here disagrees with it, that's called out explicitly, not quietly resolved.
- "RAW" = Rules As Written in the core Mythras rulebook. "Optional rule" = an official named optional/variant rule from the book. "House rule" = a third-party (Notes from Pavis, a podcast guest, etc.) addition with no official standing — usable, but the app should never present it as RAW without a flag.
- Citations are given as precisely as the source allows. Where I'm citing my own trained knowledge of the rulebook rather than a page I re-checked this session, I say so.

## 1. The project's own baseline (`js/data.js`)

This file is unusually well-documented for a data module — worth understanding before adding anything new, because it already encodes several hard-won corrections:

- **No STR/DEX weapon minimums.** A comment at the weapons table explicitly notes this was checked and doesn't exist as a Mythras mechanic — an earlier pass had fabricated it, and it's been removed. Don't reintroduce it.
- **Half Plate suit stats are 28 ENC / 3500 cost / -6 armour penalty**, confirmed against the page image after an earlier OCR pass misread it as "2/3500/6". If you see "2/3500/6" cited anywhere else (including possibly in third-party summaries), the repo's number is the corrected one.
- **Cult rank grants no flat skill bonus.** This is called out at length in the comments (lines ~366-378): rank only gates (a) which magic the organisation teaches and (b) a Training Discount (cheaper between-session training, not a stat bump). Advancement past Common rank requires specific cult skills at specific percentages held for a minimum number of years — it's earned through play, not picked freely at chargen. An earlier version of this tool apparently did fold rank into a skill %; that's been corrected.
- **Difficulty Grade table is multiplicative, not additive** (`GRADE_MULT`: veasy ×2, easy ×1.5, standard ×1, hard ×2/3, formidable ×0.5, herculean ×0.1), verified against a page scan. This matters if you're ever tempted to reimplement grade shifting as "+20%/-20%" — that's the pre-Mythras (Legend/RQ6-adjacent BRP houserule) model, not Mythras RAW.
- **Combat Style Traits** (`COMBAT_TRAITS`, ~100 entries) are transcribed directly from the fan-compiled *Mythras Combat Style Traits Encyclopedia v2.3* (Notes from Pavis), used with the compiler's stated permission, mechanical wording preserved as published "typos included." See §6 below — this is the same document the project asked me to review, and it's already fully integrated.
- **Weapons & armour tables** transcribed from the core rulebook Economics & Equipment chapter (pp. 63-66 weapons, p.58 armour), checked against page images rather than OCR text-extraction, which the comments note is a meaningfully different (more trustworthy) verification method than earlier passes used.
- **Careers/Cultures** come from the Character Creation Workbook's Culture/Career Summary sheets, with culture starting money cross-checked against core p.21.
- **Pulp Hero / Paragon tiers** are from the Mythras Companion, "Pyramids, Pulp, & Paragons," pp. 54-55; advantages don't stack (each pickable once). The Companion itself inconsistently labels the Paragon bonus-skill-points line "Heroic characters" — the repo comment flags this as a book quirk being preserved rather than silently fixed, which is the right call: don't "fix" it out from under a future diff against the source.
- **Quick Character** mode mirrors the Workbook's flat 100-point quick-gen box (Standard Skills + 3 Professional + 1 optional Combat Style, 5-15 pts each) as an alternative to the full Culture(100)+Career(100)+Bonus(150) pipeline.

None of the above needed correcting during this pass — I'm recording it so a future session doesn't waste time re-deriving what's already solid.

## 2. Characteristics & skills

Seven characteristics (STR, CON, SIZ, DEX, INT, POW, CHA), STR/CON/DEX/POW/CHA rolled 3D6, INT/SIZ rolled 2D6+6 — matches `CHARS`/`ROLL_3D6`/`ROLL_2D6` in data.js. Standard skills and Professional skills use the base formulas the Workbook lists (e.g. Athletics = STR+DEX, Perception = INT+POW); the `STD`/`PROF` tables match this.

**Difficulty grades**, in order from easiest to hardest: Automatic, Very Easy (×2), Easy (×1.5), Standard (×1), Hard (×2/3), Formidable (×0.5), Herculean (×0.1). Automatic and Hopeless bypass the roll entirely rather than modifying a percentage. This is multiplicative on the *current* skill %, which is why grade-shifting can feel non-intuitive at high skill values compared to a flat modifier — that's correct Mythras behaviour, not a bug.

Notes from Pavis has two mini-chart posts worth knowing about here (both under the "Mythras" and "Rules" categories, [Mini charts for Mythras](https://notesfrompavis.blog/2018/03/07/mini-charts-for-mythras/)): a Difficulty Grade Progression quick-reference and a Fatigue Progression quick-reference, both aimed at removing at-table math rather than changing any rule. There's also a [Mythras Skill Roll Evaluator](https://notesfrompavis.blog/2021/11/26/mythras-skill-success-calculator-has-been-updated/) (an augmentation/difficulty-grade calculator tool) — useful precedent if the Forge ever wants an in-app "will this roll succeed" helper, not a rules source in itself.

## 3. Combat

### 3.1 Core flow and special effects

Standard Mythras opposed-roll combat: both combatants roll simultaneously (or in Strike Rank order for Mythras Imperative-style simplified initiative — see §8, pending), successes are compared, and the higher success *degree* wins and earns Special Effects (extra ones for beating the opponent by more than one success level, or on a Critical). Special Effects are chosen from lists gated by weapon Combat Effects (Bleed, Impale, Bash, Sunder, Stun Location, Entangle, etc. — see the `effects` field on each `WEAPONS` entry) plus a set of universal ones available regardless of weapon.

Notes from Pavis has a genuinely useful decision-support resource here that isn't a rules change at all, just a navigation aid: [Tactics of selecting combat special effects in Mythras — a result-based visualisation](https://notesfrompavis.blog/2020/07/21/tactics-of-selecting-combat-special-effects-in-mythras-a-result-based-visualisation/), later updated as a ["next generation" one-pager version](https://notesfrompavis.blog/2020/12/06/tactics-of-selecting-combat-special-effects-in-mythras-a-result-based-visualisation-next-generation/). It's a mind-map organized by *player intent* ("I hit and they didn't parry — I want to disarm them — what are my options?") rather than by weapon or by effect name. If the Forge ever adds a special-effects picker UI, this intent-first framing is worth stealing over a flat alphabetical list.

**Book of Schemes** (Dan True, third-party but Design-Mechanism-adjacent) adds six new Special Effects the blog flags as worth adopting even outside its home city-campaign context: Appeal to Reason, Force Opening, Glean Information, Nudge Opponent, Slam Location, Win Favour ([It Is Time To Scheme](https://notesfrompavis.blog/2024/07/09/it-is-time-to-scheme-adding-special-effects-from-book-of-schemes/), July 2024). These are **not core-rulebook Special Effects** — flag clearly as a supplement addition if the Forge ever surfaces them.

### 3.2 Weapon reach, size, and narrow spaces (optional rules)

Two related Notes from Pavis rules posts, both explicitly labeled by the author as **not RAW, but a documented optional addition**:

- [Crunch Mode in Mythras — Combat Effects of Weapon/Shield Sizes and Reach](https://notesfrompavis.blog/2018/12/01/crunch-mode-in-mythras-combat-effects-of-weapon-shield-sizes-and-reach/): tables for what happens when a fighter closes inside, or holds outside, an opponent's weapon's effective reach band — the core mechanic (closing inside a longer weapon's reach drops its effective size two steps and halves what it can parry) is RAW, but the compiled lookup tables covering every weapon combination are the blog's own aid.
- [Narrow Spaces and Fighting in Mythras](https://notesfrompavis.blog/2017/07/25/narrow-spaces-and-fighting-in-mythras/): explicitly an optional/house rule, sourced from a rule Matthew Sprange mentioned came up during editing of the *Old Bones: Secrets of the Blood Rock* adventure. In a 2.5-3m corridor, each step of weapon Reach above Medium penalizes the Combat Style by one grade (except pure thrusting/Impale-only use); in a sub-1.5m space, each step above Short does. The post is explicit that this is **not in the Rules As Written** — worth flagging in-app as such if ever implemented (e.g. a dungeon-crawl combat modifier toggle).

### 3.3 Movement in combat, gait, and charging

This is a rules area with real nuance the core book doesn't over-explain, and it's exactly the subject of Inwil's *Mythras Matters* podcast episode 1.76, "Gait, Charging and Movement in Combat" (Dec 2025), where the host interviews "the rules guru, Matt Egar" specifically to unpick movement, gait, and charge interactions. I was not able to retrieve a full transcript this session (see coverage doc) — flagging the episode's existence and topic as a pointer for whoever next needs the detail, rather than claiming to have extracted its content.

Related Notes from Pavis material: [Movement and Swimming Effects chart](https://notesfrompavis.blog/2016/01/24/movement-chart-for-rq6/) (movement rates 1-14, Athletics effect on walk/run/sprint speed, common modifiers for encumbrance/armour/fatigue, and ranged-combat movement effects) and the newer [Fatigue, Encumbrance and Speed Calculator](https://notesfrompavis.blog/2022/05/22/what-is-the-running-speed-of-unladen-swallow-people-warrior-in-chitin-hoplite-armour-with-backpack-full-of-loot-and-rations/), which supersedes it. Both are compiled RAW references, not house rules, as far as the blog post text describes them — I couldn't verify the underlying Google Sheet/PDF contents directly this session (bash/PDF tooling wasn't available; see coverage doc), so treat the specific numbers as needing a page-check before being transcribed into the Forge.

### 3.4 Multiple opponents

*Mythras Matters* episode 1.82, "Six against one is easier than it seems!" (Jun 2026), covers fighting when outnumbered with only 2-3 Action Points, with guests Matt and Peter. Same caveat as above: topic flagged, transcript not retrieved.

### 3.5 Combat Style Traits — see §6 (its own section, given the scope of the source material and its direct use in the repo).

## 4. Damage, hit locations, and healing

Damage Modifier table (`DM_TABLE`) runs from STR+SIZ totals of 5 (-1d8) through 25 (+0) to higher bands (+1d2 at 30, etc.) — verified against a page scan per the repo comment. Hit locations use the standard Mythras 7-location abstraction (Head, Chest, Abdomen, each Arm, each Leg — see `ARMOR_LOCATIONS`), each with its own AP and HP pool.

Notes from Pavis's [Healing Charts Refined for Mythras](https://notesfrompavis.blog/2018/12/02/healing-charts-refined-for-mythras/) (a revamp of an earlier "Healing and Wounds" chart) folds in Healing & Medicine spirit effects and the Cure Malady Runespell, plus an interpretation — sourced from the Design Mechanism forums, not the book itself — of how spirit magic should interact with healing poison. Treat the poison-healing interaction specifically as **community interpretation, not RAW text**, since the book doesn't spell it out explicitly according to the post itself.

## 5. Magic

Mythras has four magic systems: Folk Magic (universal, low-power), Animism/spirit magic (shamanic, binding and channeling spirits), Theism (divine/rune magic via cult devotion), and Sorcery (manipulable, shaping-based). The `MAGIC` skill set in data.js (Binding, Devotion, Exhort, Folk Magic, Invocation, Meditation, Mysticism, Shaping, Trance) matches the Workbook's professional-skill framing of these systems' associated skills.

Sorcery specifically uses a shaping-points model: a caster spends Magic Points on the spell itself plus one point per shaping category used (Duration, Range, Targets, Magnitude, etc.), each additional shaping also costing an extra turn to cast — illustrated concretely in Notes from Pavis's [Sorcery Grimoire for a Traditional Sorcery School](https://notesfrompavis.blog/2020/02/29/sorcery-grimoire-for-a-traditional-sorcery-school-in-mythras/) worked example (a Shapechange-to-Shark spell costing 4 MP total: 1 base + 1 each for Duration/Targets/Magnitude, 4 turns to cast).

*Mythras Matters* episode 1.77, "Casting and Creating Sorcery and Sorcerers" (Jan 2026), covers sorcery casting mechanics and the magnitude-vs-intensity distinction with guest Raleel — again, topic and guest noted, transcript not retrieved this session.

Sorcery/Folk Magic/Theist spell-list indices exist on Notes from Pavis as navigation aids over official spell lists (not new spells themselves): [Folk Magic Spell Lists](https://notesfrompavis.blog/2024/08/10/folk-magic-spell-lists-for-mythras/) (130+ spells indexed), [Sorcery Spell Lists](https://notesfrompavis.blog/2024/08/13/sorcery-spell-lists-for-mythras/) (175+), and a Theist spell list index (500+ spells) referenced from the same 2024/08 batch.

## 6. Combat Style Traits Encyclopedia (v2.3) — status: integrated, not independently re-verified

The user's brief specifically asked me to familiarize myself with this 102-trait PDF. What I found: **this document *is* the Notes from Pavis "Encyclopedia of Mythras Combat Style Traits"** (first posted [Nov 2018](https://notesfrompavis.blog/2018/11/18/encyclopedia-of-mythras-combat-style-traits/), since folded into the larger [Combat Styles Encyclopaedia](https://notesfrompavis.blog/2022/06/11/combat-styles-combine-and-go-encyclopaedic/) — as of mid-2022 that combined document ran to ~1032 pages covering ~720 Combat Styles and ~120 Combat Style Traits; the standalone traits-only PDF the project was given is presumably a snapshot/extract at v2.3, pinned at ~102 traits).

**I could not open the PDF directly this session** — no shell/bash access was available (see coverage doc), and the Google Drive link resolves to a binary download rather than fetchable text. However: `js/data.js`'s `COMBAT_TRAITS` array already contains ~100 traits transcribed from this exact source, with a comment explicitly citing "Mythras Combat Style Traits Encyclopedia V2.3" and noting mechanical wording is preserved "typos included." Cross-referencing what the array contains against the blog's own description of the source (official traits from Mythras Core, Mythic Rome, Adventures in Glorantha, Mythic Constantinople, and Monster Island, plus fan-contributed ones credited to "RangerDan's campaign" and "Raleel's" martial-arts set) — the category taxonomy matches: `Individual`, `Unarmed`, `Ranged`, `Formation (3+ same trait)`, `Siege weapons`, and combined categories like `Individual, Unarmed`.

**What this means practically:** the Forge's combat style maker is already working from the correct source, transcribed carefully (per its own comments) rather than OCR'd wholesale. My "review" of the Encyclopedia for this pass amounts to confirming provenance and taxonomy match, not an independent line-by-line re-check against the source PDF. If the user can get me the actual v2.3 PDF text in a future session, a worthwhile follow-up task is a trait-by-trait diff against `COMBAT_TRAITS` to catch any transcription drift — but there's no evidence of a problem, just an unverified surface.

One thing worth flagging: several traits (e.g. "Chi Push," "Chokehold," "Grappler," "Joint Lock," "Push," "Push Hands," "Sacrifice Throw") are credited in-array to `"raleel campaign"` rather than an official book — these are homebrew/community traits, not from any published Mythras supplement. That's consistent with how the blog describes them too. Worth keeping distinguishable in any UI that lets a user filter to "official only."

## 7. Notes from Pavis — coverage summary

Full crawl details, what was and wasn't reachable, and why, are in `docs/mythras-sources-coverage.md`. Short version: I read the **Rules** category in full (4 posts — all of the site's rules-tagged content: starter GM resources index, the interactive combat-flow chart post, the weapon reach/narrow-spaces crunch posts), the **Mythras** category in full (10 posts, including the master "Mythras Charts and Tables" index — itself a huge annotated link directory into essentially every rules-crunch post/PDF the blog has ever produced), the **Mass Combat** category (1 post — ship combat/naval templates, Glorantha-specific, not core Mythras rules), and a handful of individually high-value posts pointed to from that master index (special effects tactics, Book of Schemes special effects, healing charts, both Combat Style Traits Encyclopedia meta-posts). I did **not** do a full line-by-line crawl of the **171 Uncategorized**, 84 Glorantha, 66 Mythras Encounter Generator, 60 Tools, 48 RQ, 36 Runequest, 34 Cult, or 22 Character Generation category posts — sampling of the homepage/category listings showed these are overwhelmingly Glorantha-setting lore, the author's own encounter-generator/VTT tool release notes, and pregenerated-character announcements, not core system rules-crunch. That's a scoping judgment, not a completeness claim — see the coverage doc for the reasoning and for how to extend the crawl if the user wants the lore/tooling side covered too.

The single most valuable page on the whole site for this project's purposes is the [Mythras Charts and Tables](https://notesfrompavis.blog/2014/02/04/rq6-charts-and-tables/) master index — it's a maintained table of nearly every rules-adjacent chart/tool the author has produced, organized by rules area (Combat, Movement, Magic by tradition, Skills, Cult Template, etc.), each with a link to the underlying post or Google Drive PDF. Treat it as the site's own table of contents; if a future session needs to go deeper on one specific rules area, start there rather than re-crawling categories.

## 8. Mythras Imperative SRD — pending

The user mentioned a supplemental, more streamlined SRD document ("Mythras Imperative") they intend to forward once a sandbox extraction issue on their end is resolved. **Not yet received or reviewed.** Flagging its absence explicitly rather than guessing at its contents — Mythras Imperative is a real, separate, more compact ruleset derived from Mythras, and its specifics (which subsystems it streamlines, what it drops) shouldn't be assumed from the full core rulebook. Follow up once the file arrives.

## 9. Inwil's "Mythras Matters" — status: it's a podcast, not a video series, and full transcripts are paywalled

Correcting the brief's framing here rather than silently reinterpreting it: *Mythras Matters* by "inwils" is primarily an **audio podcast** (81-84 episodes depending on when checked, monthly, running August 2019 to present/July 2026), cross-posted to a YouTube channel rather than being YouTube-native. It is not primarily a rules-explainer clip series; most episodes mix GM craft advice, worldbuilding, and campaign-management chat, with a subset of episodes specifically dedicated to rules-crunch topics, often with a named rules-focused guest.

**What I could retrieve:** episode titles, descriptions, and (for episode 83 only) the first ~10 lines of an auto-generated transcript, via podscan.fm, podbay.fm, and Apple Podcasts — enough to build a topic index for the dozen most recent episodes (78-83) plus a handful of scattered rules-relevant older ones surfaced in search. **What I could not retrieve:** full transcripts for any episode (podscan.fm gates the full transcript behind account registration) or an audio download-and-transcribe pass (no shell access this session — see coverage doc). This falls short of "exhaustive," and I want that limitation stated plainly rather than papered over.

Rules-relevant episodes identified so far (title — topic — notability):

- **1.76, "Gait, Charging and Movement in Combat"** (Dec 2025) — movement/gait/charge rules, with guest "Matt Egar" described as "the rules guru." Highest-value unretrieved episode for this project.
- **1.77, "Casting and Creating Sorcery and Sorcerers"** (Jan 2026) — sorcery casting, magnitude vs. intensity, with guest Raleel (the same Raleel credited for homebrew traits in `COMBAT_TRAITS` — worth noting the overlap between this podcast's guest pool and the Notes from Pavis community).
- **1.79, "It's time to ditch that pesky grid!"** (Mar 2026) — VTT grid limitations, range/distance abstraction — relevant to how the Forge might present ranged combat distances if it ever does a tactical-map feature.
- **1.80, "More than just clashing swords!"** (Apr 2026) — effective combat delivery, with two named combat-focused guests (Matt and Peter).
- **1.82, "Six against one is easier than it seems!"** (Jun 2026) — outnumbered fights, Action Point economy against multiple opponents, same guests as 1.80.
- **1.81, "Tackling AI and learning Mythras the easy way"** (May 2026) — new-player/new-GM advice; not rules-crunch, but its show notes are a useful curated links list (Notes from Pavis, the Mythras Encounter Generator, and a "Mythras Special Effects" reference tool at rpg-time.co.uk/MythrasEffects — a resource I hadn't otherwise surfaced, worth a look in a future session).

Recommended follow-up if the user wants this done properly: either provide direct audio files / a transcript export, or grant shell access so a future session can download and transcribe episodes 1-84 in bulk. Doing this via one-off web fetches per episode, as I did here, does not scale to genuine exhaustiveness.

## 10. Flags — where sources disagree, or the app might diverge

- **Cult rank and skill bonuses** (see §1): the repo's current model (no flat bonus, gated training discount + magic access instead) is the corrected, RAW-accurate one per its own comments. If any external reference (a Notes from Pavis post, a podcast episode, an old character sheet) implies a rank-based skill bonus, that reference is describing a house rule or a misremembering of a superseded draft, not RAW.
- **Weapon reach/narrow-space penalties** (§3.2): genuinely optional, sourced from an adventure's editorial process rather than the core book. Fine to offer as a toggle; wrong to bake in as default behaviour.
- **Poison-healing-via-spirit-magic interaction** (§4): community forum interpretation filling a gap the book doesn't explicitly close. Flag as GM-ruling-territory if it ever surfaces in the Forge's healing UI.
- **Combat Style Traits provenance** (§6): a meaningful fraction of the traits in `COMBAT_TRAITS` are homebrew (credited to specific fan campaigns), not official. Recommend the Forge's combat-style-maker UI keep the `source` field visible/filterable so a player can choose to restrict to official-only traits if they want a "RAW-strict" character.
- **No divergence found** between `js/data.js` and my refreshed core-rules knowledge on: characteristics/rolling method, standard/professional skill formulas, the Difficulty Grade table's multiplicative nature, the Damage Modifier table, or the weapons/armour tables. This is worth stating positively — the baseline is solid.

## 11. Open items for a future session

1. Mythras Imperative SRD — pending the user's file.
2. Encyclopedia v2.3 PDF — provenance confirmed, line-by-line diff against `COMBAT_TRAITS` still not done (no PDF access this session).
3. *Mythras Matters* — topic index only for ~12 episodes; full-series transcript pass needs either provided files or shell/audio-transcription access.
4. Notes from Pavis Uncategorized/Glorantha/RQ/Tools/Cult categories — deliberately out of scope this pass as lore/tooling rather than rules-crunch; revisit if the Forge ever grows Glorantha-specific character content (cult archetypes already partially cover this per `CULT_ARCHETYPES` in data.js).
5. Movement/encumbrance/speed calculator numbers (§3.3) — referenced but not independently verified against the rulebook page this session; worth a page-check before treating as citable RAW.
