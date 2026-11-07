# Play Mode SKILL_INFO accuracy review — Mythras Core

**Scope:** `SKILL_INFO` in `js/data.js` following PR #168, inspected at repository blob **`5798a522eef3c1e96022e4ae8afa065097aec3f7`**. The data has **58 distinct entries**: **22 Standard**, **34 Professional** skills listed on Core printed pp.38–50, plus **Exhort** and **Folk Magic** from their own magic chapters. The PR description’s “56” counts the 22+34 ordinary skill-chapter entries. This is a source-and-code review, **not a signed-in Play Mode test**.

**Authority:** user-uploaded *Mythras 2e Core Rulebook*. Parsed PDF text was consulted first, and ambiguous rules were compared with rendered printed pages. References below are **printed book pages**, not PDF viewer indices; no book text/pages are redistributed. Short own-word corrections only. Prose-only fixes belong to Claude’s separate code PR.

## Corrections for Claude (prioritized)

| Skill | Current problem | Core source | Minimal change |
|---|---|---|---|
| **Brawn** | “lift and carry up to STR in SIZ, or drag double that, without a roll” reads as an unconditional limit. | **p.39**: add **1 SIZ per full 10% Brawn** to the basic lifting/carrying allowance. | “Base no-roll carrying capacity is STR SIZ (drag twice that), increased by 1 SIZ per full 10% Brawn; heavier loads require a Brawn test.” |
| **Courtesy** | “a fumble gives real offence” overstates an outcome that is sometimes only embarrassment. | **p.45**: fumble causes severe embarrassment/humiliation, **possibly** insult; social interaction ends. | “A fumble causes grave embarrassment and may give offence, ending the interaction.” |
| **Literacy** | “reading and writing one language” omits the **Language cap** and non-alphabetic/non-writing recording forms. | **p.47**: literacy depends on a known language, cannot exceed relevant Language and can use signs, knots or other records. | “Understanding and recording information in one known language or notation; cannot exceed its spoken Language skill.” |
| **Exhort** | Source page is empty and “channelling power” is less exact than the theistic skill description. | **pp.178,181**: Exhort enables correct appeal/request and determines success of miracle entreaty. | Reference p.178 (or 181); “Making the ritual appeal to a deity for a miracle; success is tested with Exhort.” |
| **Folk Magic** | Source page is empty even though other skills show citations. | **p.121** begins the tradition and its simple spells; **pp.118–119** discuss learning and casting conventions. | Keep current brief description; add **Core p.121** as its source. |

These are **three materially incomplete/overstated summaries plus two magic-entry citation/precision improvements**. The remaining entries are serviceable short summaries; this review deliberately does not demand their critical/fumble examples or every technical exception be duplicated in a side panel. Source details remain in the book or the appropriate skill/combat procedure.

## Entry-by-entry mapping

### Standard (22)

| SKILL_INFO key | Printed Core page | Result / note |
|---|---:|---|
| Athletics | 38 | **OK** — Climb/jump/run and armour effect checked. |
| Boating | 39 | **OK** — Small waterways and inshore craft vs Seamanship checked. |
| Brawn | 39 | **CHANGE WORDING** — The summary gives STR SIZ as the no-roll ceiling, but Core adds **+1 SIZ per full 10% Brawn** to carrying/lifting capacity; name this modifier (p.39). |
| Conceal | 39 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Customs | 40 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Dance | 40 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Deceit | 40 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Drive | 40 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Endurance | 41 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Evade | 41 | **OK** — Meaning and scope match the Core at this short-summary level. |
| First Aid | 41 | **OK** — Once per distinct injury, including separate injury sites, checked. |
| Influence | 42 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Insight | 42 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Locale | 42 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Native Tongue | 42 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Perception | 42 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Ride | 43 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Sing | 43 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Stealth | 43 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Swim | 43 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Unarmed | 43 | **OK** — Universal cultural Unarmed Combat Style, critical/fumble behavior checked. |
| Willpower | 44 | **OK** — Meaning and scope match the Core at this short-summary level. |

### Professional (34)

| SKILL_INFO key | Printed Core page | Result / note |
|---|---:|---|
| Acrobatics | 44 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Acting | 44 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Art | 44 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Binding | 44 | **OK** — Binding, controlling, summoning/contracting with a known spirit checked. |
| Bureaucracy | 45 | **OK** — Cap by relevant Language or Literacy skill already present. |
| Commerce | 45 | **OK** — Commerce or Willpower opposition checked. |
| Courtesy | 45 | **CHANGE WORDING** — A fumble causes severe embarrassment and *may*, at worst, give insult; it ends the current social interaction. Avoid asserting that it always gives offence (p.45). |
| Craft | 45 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Culture | 45 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Devotion | 45 | **OK** — Miracle magnitude and cult standing checked. |
| Disguise | 45 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Engineering | 46 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Gambling | 46 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Healing | 46 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Invocation | 47 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Language | 47 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Literacy | 47 | **CHANGE WORDING** — Literacy is tied to a specific language, **cannot exceed the relevant Language skill**, and does not always mean conventional writing (e.g. symbolic records). The short “reading and writing one language” line misses these constraints (p.47). |
| Lockpicking | 47 | **OK** — Non-damaging opening of barred/bolted doors and Mechanisms opposition checked. |
| Lore | 47 | **OK** — Critical follow-on relevant skill grade checked. |
| Mechanisms | 48 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Meditation | 48 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Musicianship | 48 | **OK** — One related family of instruments, not all instruments. |
| Mysticism | 48 | **OK** — Separate foundation/tradition of mystical knowledge checked. |
| Navigation | 48 | **OK** — Region/environment-specific; critical shortcut checked. |
| Oratory | 48 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Seamanship | 48 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Seduction | 49 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Shaping | 49 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Sleight | 49 | **OK** — Cheating at games uses Sleight opposed by other gamblers’ Perception or Gambling (p.46); general concealment p.49. |
| Streetwise | 49 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Survival | 49 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Teach | 49 | **OK** — Not directly rolled as a skill test; limits training as Core p.49 states. |
| Track | 49 | **OK** — Meaning and scope match the Core at this short-summary level. |
| Trance | 50 | **OK** — Meaning and scope match the Core at this short-summary level. |

### Magic chapter additions (2)

| SKILL_INFO key | Printed Core page | Result / note |
|---|---:|---|
| Exhort | 178 | **ADD PAGE / CLARIFY** — No page value in SKILL_INFO. Link **p.178** for the definition and **p.181** for the Exhort check; prefer "phrasing ritual requests for a miracle" to generic "channelling power". |
| Folk Magic | 121 | **ADD PAGE** — No page value in SKILL_INFO; cite the Folk Magic chapter **p.121**, which establishes its simple spell tradition, rather than pretending the skill is detailed in pp.38–50. |

## Source and implementation boundaries

- Every Standard/Professional skill in `SKILL_INFO` is represented above; **58 unique entries total** including the two magical additions. This is not an audit of skill formulas or specialised label retrieval; focus is accuracy of the text and cited page numbers.
- **Unarmed** is correctly called a universal Combat Style (Core p.43). **Teach** is correctly described as not rolled against directly (p.49); it limits what a student can be taught, with training exceptions handled in Subsystem 4. **Sleight** cheating against players’ Perception or Gambling is supported by the Core Gambling description (p.46), not an invented use.
- Exhort and Folk Magic are **not detailed in the ordinary skill-description chapter** on pp.38–50. Those two citation blanks are real source omissions, not evidence the skills themselves are non-Core.
- No production code or tests changed. These judgments were made from source and GitHub code; they do not establish the live UI loads each description correctly. Overall progress remains **4/8**, with Combat previously closed and Advancement pending its separate live closeout.