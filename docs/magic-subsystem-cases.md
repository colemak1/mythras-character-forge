# Subsystem 6 verification ledger

This ledger consolidates existing implementation and session evidence. Source ranges come from the repository's Core scope register. Individual spell, Talent, miracle and spirit entries still require child cases. These rows are audit work packages, not verified whole chapters.

| Area | Existing evidence | Remaining before closeout |
|---|---|---|
| General magic, Core pp.112–120 | Starting allowance guidance and MP controls exist | Inventory rituals, learning, recovery, resistance, restrictions and interactions |
| Folk Magic, pp.121–129 | One live failed cast spent 1 MP; card cost corrected | Live success, critical, fumble, insufficient MP and recovery; spell-specific child cases |
| Sorcery, pp.161–177 | Live unshaped failure cost zero; absent Shaping blocks allocation; memorisation warning tested | Live valid shaped cast through reload, cancellation, final roll and cost; Combine grade and budget; individual spells and rounding interpretations |
| Mysticism, pp.154–160 | Live absent-Meditation gate; mocked final-turn, category-cost and reload checks | Live valid paired skills, preparation, cancellation, outcome costs, active ceilings; Talent child cases and rounding |
| Animism, pp.130–153 | Mocked bound-spirit eligibility checks | Live legal/illegal commands and saved status; source inventory for contact, binding, spirit combat, tricks and types |
| Theism, pp.178–191 | Mocked final-turn, pool cap and legacy-entry checks | Live pool/rank, donation, valid miracle preparation and costs; multiple-cult handling; miracle child cases |
| Organizations, pp.192–213 | Joining/promotion and training reference verified live for pp.196–199 | Remaining benefits, duties, restrictions, rank access and organization child cases |

## Next implementation and live batch

Use a dedicated persistent magic audit character, created through the normal builder or import workflow, with the paired skills required for valid Sorcery and Mysticism. Record its starting MP and configuration. The previous single-hobby character cannot exercise both skills simultaneously.

Exercise a valid shaped Sorcery cast and a valid Mysticism preparation through intermediate save/reload, cancellation, completion and outcome costs. Then exercise Animism commands and Theism pool/miracle workflows on suitable fixtures. Capture actual rolls and results; deterministic local cases cover outcomes that random live rolls do not produce.

Complete the source and child-case inventory alongside this work. User-entered names and GM adjudication do not certify individual abilities. Do not mark this subsystem complete from the workflow batch alone.

## Evidence limits

Local workflow tests substitute skill lookups, random rolls and cloud calls. They establish useful behavior under controlled inputs, but do not prove the live skill-selection and save path.

Temporary changes on Creation Audit — Human were removed after each magic walkthrough. Existing test roll histories can remain. No valid multi-turn magic walkthrough has yet been completed live.

## Paired-skill live batch — November 5, 2026

Fixture: Magic Audit — Paired Skills, a dedicated Quick Character created through the normal signed-in builder. Professional selections were changed through Quick Skills between tests. This character is retained for further checks.

- Sorcery: Duration 1, full cost 2 MP, two turns. Turn 1/2 survived reload at 11 MP. Final roll 41 against Invocation 49% succeeded, leaving 9 MP. A second preparation was cancelled at 9 MP using the deployed control.
- Mysticism: Mysticism (Audit Path) with Meditation, Augment category, Intensity 2. Turn 1/2 spent no MP. A normal character reopen preserved preparation. Final roll fumbled and spent the full 2 MP, leaving 7/11. A second preparation was cancelled without another charge. The Talent remained inactive.
- Theism: Exhort and Devotion (Audit Cult), recorded High Priest pool rank, pool 6, one Acolyte instance. Turn 1/2 survived reopening. Final roll succeeded and spent 2 devotional points, leaving 4/6. Cancellation of a second preparation left 4/6.
- Persistence failure: an immediate reload after the first Mysticism preparation lost that step. The preceding UI showed 1/2. Repeating the step and reopening normally preserved it. The cause and recovery path remain unverified. Do not close persistence on the basis of normal reopen alone.
- Remaining: all outcome branches, invalidation after edits, pool limits and donation live cases, Animism, individual ability inventory and broader magic interactions. These live cases do not close the subsystem.

## Recovery and Animism live batch — November 5, 2026

- On the deployed draft-recovery build, began an Acolyte miracle and immediately reloaded. The recovery prompt appeared. Accepting restored CASTING 1/2 with devotional pool 4/6. Cancelling cleared preparation and retained 4/6. This verifies the owner acceptance path. Decline and cross-owner behavior remain covered locally.
- Binding 29% gives a critical range of 3 and a spirit POW ceiling of 9. A GM-confirmed bound POW 10 spirit was rejected before rolling or charging MP.
- Changing the spirit to POW 9 allowed the command roll. The roll failed, the spirit ignored the command, and personal MP fell from 7 to 6. Uploaded Core p.136 was checked visually for the one-MP command and failure outcome.
- Marking that POW 9 spirit unbound blocked another command without charging MP. The fixture retains the unbound Audit Spirit for later work.
- Still open: legal command success/critical/fumble branches, maximum bound spirits by rank and CHA, spirit interaction and combat inventory, complete spell/Talent/miracle child cases, and remaining pool interactions. No subsystem closeout follows from this batch.


## Source-verified rule-case inventory — batch 1 (2026-11-05)

**Source of truth:** user's uploaded *Mythras 2e Core Rulebook*, `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`. All references below are **printed book pages**, not PDF page indices. Checked the book's parsed text, then inspected rendered pages for the cost and rank tables (especially pp. 122, 131, 136, 155–157, 162, 165, and 180–181). These are **source-verified specifications**, not assertions that implementation, automated tests or the current deployment pass. GM-dependent choices are flagged. Keep Core and Sit'ota house rules separate. Avoid copying the book's complete spell/ability descriptions into the public site.

Each row is an independent acceptance case for Claude to convert into a fixture, implementation test, or explicitly GM-assisted workflow. IDs use the corresponding `core-rule-scope.md` families. Do not advance Subsystem 6 until child cases for **every applicable spell, Talent, spirit type, miracle and organization benefit** are added and tested.

### Shared Magic (MG-01; Core pp. 119–120)

| Case | Given → authoritative outcome |
|---|---|
| MG-B01 | **Given** a caster is preparing any type of magic and wants to attack, run or use an unrelated skill → **Core p.119** permits only walking pace and Free/Reactive Actions during casting; the other action is not available without disrupting the casting process. |
| MG-B02 | **Given** a casting requires multiple turns and a defensive reaction consumes available Action Points → **Core p.119** says the final casting turn is delayed; injury or mental interference can instead disrupt the casting. Do not treat every reaction as automatic cancellation. |
| MG-B03 | **Given** incompatible similar-purpose magic effects compete, even across traditions → **Core p.120** disallows stacking; the higher-Intensity effect takes precedence, and if Intensities are equal the newer replaces the older. |
| MG-B04 | **Given** a spell or Talent remains active and uses ongoing Magic Points → **Core p.120** withholds recovery of the committed points until the magic expires or is dismissed. Spending points and allowing them to recover are different states. |
| MG-B05 | **Given** a spell's casting chance is modified by a difficulty grade → **Core p.120** says the grade does not change Intensity (or skill-derived Magnitude); only the roll chance changes. |

### Folk Magic (FM-01; Core pp. 121–123)

| Case | Given → authoritative outcome |
|---|---|
| FM-B01 | **Given** a beginning character has a career specializing in Folk Magic → **Core p.121** permits a starting spell count of one tenth of Folk Magic skill; an ordinary character who gains Folk Magic through a hobby/culture/cult instead uses the chapter's default starting-magic allowance. Keep any rounding choice explicit until checked against the relevant example. |
| FM-B02 | **Given** a character learns a new Folk Magic spell in play → **Core p.121** assigns 3 Experience Rolls and one week of study; access to a teacher remains subject to the setting/GM. |
| FM-B03 | **Given** a learned Folk Magic spell is invoked → **Core p.122** requires one Turn and a test of the character's Folk Magic skill, rather than an independent percentage per spell. |
| FM-B04 | **Given** a Folk Magic roll is a **critical success** → **Core p.122** makes the spell work for **0 MP**. |
| FM-B05 | **Given** a Folk Magic roll is an ordinary **success** or **failure** → **Core p.122** spends **1 MP** in either case, but applies the effect only on success. |
| FM-B06 | **Given** a Folk Magic roll is a **fumble** → **Core p.122** the spell fails and expends **1d3 MP**. |
| FM-B07 | **Given** a Folk Magic spell lacks a specific exception → **Core p.122** gives it base Intensity **1** and Magnitude **1**. |
| FM-B08 | **Given** a learned Folk Magic spell has the **Ranged** trait → **Core p.123** limits its range to the caster's Folk Magic skill value in metres; target-location knowledge is still necessary. |

### Animism (AN-01/AN-02; Core pp. 131, 135–136)

| Case | Given → authoritative outcome |
|---|---|
| AN-B01 | **Given** a Follower, Spirit Worshipper, Shaman or High Shaman observes spirits by Trance → **Core p.131** table gives preparation of **1 hour, 1 minute, 1 round, 1 Action**, respectively. Higher-ranked communication/projection/dragging are separate permissions and preparation times. |
| AN-B02 | **Given** a Trance ritual reaches its activation → **Core p.131** requires a Trance test and **1 MP**; a critical reduces preparation by one time step (minimum one Action), while a fumble prohibits Spirit-Plane entry for a full day. |
| AN-B03 | **Given** Binding is **45%** → **Core p.131** limits a spirit to **POW 15** (three times the skill's critical range of 5); POW 16 must be rejected for coercion/binding/control. Apply the same rule at the observed 29%/POW 9–10 boundary. |
| AN-B04 | **Given** an animist tries to create a spirit binding without first winning Spirit Combat or making an acceptable bargain → **Core p.135** does not allow binding; also require the spirit's POW to be within Binding's limit. This acquisition path is not equivalent to commanding an existing binding. |
| AN-B05 | **Given** a new vessel is made for an Intensity 3 spirit → **Core p.136** assigns **3 Experience Rolls** and normally **one week** to create the binding. An upgrade from Intensity 2 to 3 of the same spirit type costs the **difference** (1 roll). |
| AN-B06 | **Given** a legal bound-spirit command is issued → **Core p.136** requires **one Action**, a **Binding** roll, and ordinarily **1 MP**. On a critical it succeeds for **0 MP**; on success the spirit performs the command. |
| AN-B07 | **Given** a bound-spirit command roll **fails** → **Core p.136** the spirit ignores the request and another attempt cannot be made until the animist's next Turn; the normal 1 MP was spent. |
| AN-B08 | **Given** a bound-spirit command roll **fumbles** → **Core p.136** the binding breaks and the escaped spirit is free, potentially hostile; this must not be rendered as just an ignored command. |
| AN-B09 | **Given** the spirit's POW exceeds the commander's Binding limit or it is no longer bound → **Core p.136** prohibits the bound-spirit command; reject before executing the action/roll/MP payment. |
| AN-B10 | **Given** an animist holds more spirits than the cult-rank cap → **Core p.136** permits at most **¼ CHA** (Follower), **½ CHA** (Spirit Worshipper), **¾ CHA** (Shaman), or **all CHA** (High Shaman); if exceeded, the strongest bound spirit(s) escape. Fractional-count rounding at boundary values should be recorded, not invented. |
| AN-B11 | **Given** a fetish's bound spirit is told to act and later recalled → **Core p.136** allows its initial emergence as a **Free Action**; returning it to the fetish takes one Action Point and **no further MP**, with a Binding check only if neutral or hostile. |

### Mysticism (MY-01; Core pp. 155–157)

| Case | Given → authoritative outcome |
|---|---|
| MY-B01 | **Given** a character attempts to activate a Talent known only as a Path's catalogue entry → **Core pp.155–156** requires the **individual Talent to have been learned**; knowing the Path does not teach every Talent. |
| MY-B02 | **Given** Mysticism (a particular Path) is **34%** → **Core p.155** explicitly allows up to **Intensity 2** for a Talent from that Path; an Intensity 3 attempt is invalid. This printed example matters at a non-multiple-of-20 boundary. |
| MY-B03 | **Given** a mystic has prepared an Intensity 2 Talent → **Core p.156** requires **two Turns** of preparation, forbids other actions during preparation, and makes the Mysticism roll on the **last** turn; do not activate it on turn 1. |
| MY-B04 | **Given** an Augment Skill Talent is set to Intensity 2 → **Core p.156** costs **2 MP** at full cost and shifts the relevant skill by **two difficulty grades**. |
| MY-B05 | **Given** an Invoke Trait Talent is used → **Core p.156** its standard base is **Intensity 1** and its full cost is **2 MP**; an Enhance Attribute Talent instead costs **3 MP per intensity step**. |
| MY-B06 | **Given** the final Mysticism roll is **critical / success / failure / fumble** → **Core p.156** respectively: effect with **half base MP cost** / effect with **full cost** / no effect with **1 MP loss** / no effect with **full cost**. Keep half-point rounding under a separate explicit ruling until source-confirmed. |
| MY-B07 | **Given** total active Talent intensities would exceed **Meditation/10**, or a single Talent exceeds its Path's **Mysticism/20** ceiling → **Core p.157** disallows that activation; enforce both limits independently. |
| MY-B08 | **Given** a mystic actively practices more than **half POW** distinct Talents → **Core p.157** limits the number in regular practice; switching Talents requires the described meditation procedure, not automatic unlimited access. |
| MY-B09 | **Given** Augment Skill would raise a skill above **Very Easy** → **Core p.157** caps the currently effective grade at Very Easy; excess Intensity can still help against subsequent penalties. |
| MY-B10 | **Given** the ongoing task finishes or active Talent concentration is lost → **Core p.157** the Talent ends and its committed MP can begin recovering. A disruptive attack may call for an opposed Willpower roll **for each active Talent**. |

### Sorcery (SO-01; Core pp. 161–163, 165)

| Case | Given → authoritative outcome |
|---|---|
| SO-B01 | **Given** Invocation (named source) is **50%** → **Core p.161** derives default Sorcery **Intensity 5** from Invocation; applying a difficulty grade to the roll must not recompute this value (p.120). |
| SO-B02 | **Given** Shaping is **47%** → **Core pp.161–162** explicitly gives **5 points** to allocate. Across **Combine, Duration, Magnitude, Range, Targets**, the allocated sum may not exceed 5. **Intensity is not Shaping.** |
| SO-B03 | **Given** an unmodified Sorcery spell → **Core p.162** defaults to **Magnitude 1, Range Touch, one target, Duration POW minutes**; Intensity comes from Invocation, not Magnitude shaping. |
| SO-B04 | **Given** one point of Combine is allocated → **Core p.162** allows **two distinct spells** in one casting, not the same spell twice. Conjoined spells must share targets; if sourced from distinct Invocations, use the **lower** skill for the roll. |
| SO-B05 | **Given** a second spell is combined → **Core p.162** adds **1 MP** and **one harder difficulty grade** to the Invocation roll for that extra spell. Other Shaping modifications apply to both spells without separate component fees. |
| SO-B06 | **Given** Duration shaping 1, Magnitude shaping 1 and POW 12 → **Core p.162** gives a **24-minute** duration and **Magnitude 2**; those are two modified components, not two extra Intensity levels. |
| SO-B07 | **Given** Range shaping 1 and caster POW 12 → **Core p.162** gives **12 metres**, rather than a fixed distance unrelated to POW. |
| SO-B08 | **Given** a spell's **Range and Duration components** are modified → **Core p.165** base casting cost is **3 MP** (1 + 1 per modified component), regardless of how many points were assigned within each component. Extra combined spells cost an additional 1 MP each. |
| SO-B09 | **Given** that two-component shaped spell is cast without Combine or the optional Swiftness component → **Core p.165** it takes **3 Turns** (1 + one per modified component), with the Invocation roll occurring only on the final Turn. |
| SO-B10 | **Given** the final Invocation roll is **critical / success / failure / fumble** → **Core p.165** respectively: effect at **half base MP cost** / effect at **full cost** / no effect at **0 MP** / no effect at **full cost**. The book's handling of fractional half-costs remains a separate test/interpretation question. |
| SO-B11 | **Given** a sorcerer maintains multiple ordinary spells but attempts a second simultaneous **Concentration** spell → **Core p.165** permits multiple concurrent spells, but only **one** Concentration spell at a time. |
| SO-B12 | **Given** the alternate Shaping components (Focus, Swift, etc.) or alternate duration table are offered → **Core pp.163,165** presents these as **optional/GM-selected variants**, not additional default Core components. Do not add them to the default five without an explicit campaign choice. |

### Theism (TH-01; Core pp. 178–182)

| Case | Given → authoritative outcome |
|---|---|
| TH-B01 | **Given** Devotion (a specific cult) is **60%** → **Core p.178** uses Devotion to determine the default miracle **Magnitude and Intensity** (one tenth of the skill); **Exhort** is the separate casting skill. |
| TH-B02 | **Given** a new theist starts play → **Core p.179** starts with **one cult**, knowing miracles of the allowed rank up to **one per 20% of Devotion**; later additional cults require campaign permission. |
| TH-B03 | **Given** a Lay Member wants to request a miracle → **Core p.180** gives no devotional pool at that rank. Higher rank pool ceilings are **¼ POW** (Initiate), **½ POW** (Acolyte), **¾ POW** (Priest), and **POW** (High Priest). |
| TH-B04 | **Given** membership in multiple compatible cults → **Core p.180** requires **separate** devotional pools, whose **combined stored MP** must not exceed the character's POW. |
| TH-B05 | **Given** a theist tries to replenish a pool away from an authorized shrine/holy site → **Core p.180** requires the donation/ritual at an appropriate sacred place with the theist **physically present**. The suggested cap using the **largest recent donation** is **recommended**, not a mandatory universal formula. |
| TH-B06 | **Given** a miracle costs more MP than remain in the relevant cult's pool → **Core p.181** says the god cannot be petitioned for that miracle; reject before progressing the preparation. Personal MP and another cult's pool do not substitute automatically. |
| TH-B07 | **Given** an **Initiate / Acolyte / Priest** miracle → **Core p.181** costs **1 / 2 / 3 devotional MP** at full cost and requires **1 / 2 / 3 Turns** of exhortation respectively, with the roll on the **last Turn**. |
| TH-B08 | **Given** two instances of the same Acolyte miracle are requested together → **Core p.181** adds **one Turn** and a **second full 2-MP requirement** to the normal two-Turn, two-MP request. |
| TH-B09 | **Given** the final Exhort roll is **critical / success / failure / fumble** → **Core p.181** respectively: miracle at **0 MP** / miracle at **full cost** / no miracle at **0 MP** / no miracle with **1 MP** lost from the pool. A fumble is **not** full miracle cost. |
| TH-B10 | **Given** a miracle has an extended ongoing duration → **Core p.182** the effective devotional-pool capacity is temporarily reduced by the MP sustaining it until it ends; do not immediately restore unrestricted spending capacity. |

### Cults and brotherhoods (OR-01; Core pp. 196–198)

| Case | Given → authoritative outcome |
|---|---|
| OR-B01 | **Given** a character meets a cult's numeric entry requirements but has not demonstrated worthiness → **Core pp.196–197** treats admission/promotion as an **organization/GM decision**, not automatic from a roll or skill threshold alone. |
| OR-B02 | **Given** a character seeks Dedicated membership → **Core p.197** specifies knowing **at least five cult skills at 50% or better**, subject to the group's additional requirements and approval. |

### Unresolved boundaries / next source passes

- **Numeric rounding:** printed Sorcery Shaping 47% → 5 points (p.162) and Mysticism 34% → Intensity 2 (p.155) are **explicit examples**. Do not silently generalize a rounding method to unrelated skill-derived values, half MP, quarter/three-quarter POW pools, or starting-known ability counts without checking the applicable source/examples and recording the rule.
- **Book-specific children not inventoried yet:** all Folk Magic spell entries (pp.123–129), spirit types/Spirit Combat/tricks and resistances (pp.137–153), Mysticism individual Talents (pp.157–160), Sorcery spells (pp.166–177), Theism miracle entries (pp.182–191), and cult ranks/benefits/training/organization templates (pp.198–213). Each needs its own ID and Core page; this batch cannot close the chapter.
- **Interaction and persistence coverage:** unfamiliar abilities, invalid edits mid-cast, spell resistance, MP exhaustion, concentration and multiple sources/cults need individually scripted failure and save/reload cases. GM-mediated and non-implemented workflows must be labelled, not treated as passes.

## Magic preparation lost on immediate reload — reproduction handoff for Claude

**Classification:** intermittent **persistence/UI defect**, not a new Core interpretation. **Original observation:** signed-in live walkthrough on **2026-11-05**; exact deployed commit SHA and browser logs were **not captured**. Related source rule: a two-Intensity Mystic Talent is prepared across two Turns with the roll on the last turn (Core p.156); an Acolyte miracle likewise needs two Turns (p.181).

**Fixture:** retained signed-in Quick Character **`Magic Audit — Paired Skills`**. Configure its professional skills as **`Mysticism (Audit Path)`** plus **`Meditation`**, with an assigned **Augment** Talent at **Intensity 2** and sufficient MP. Earlier run began at **11 MP**. Reuse this named audit character only; do not modify a player's real character.

**Observed failing sequence:**
1. Sign in to the deployed site; open the fixture's Play Mode Magic view.
2. Begin an **Intensity 2** Mysticism Augment activation and advance its **first** preparation Turn. Verify the UI reads **`CASTING 1/2`** and has not spent activation MP.
3. **Immediately reload the browser tab** (rather than exiting the character and reopening it).
4. **Observed once:** the `1/2` in-progress preparation disappeared after reload. The previous UI had clearly shown `1/2`; whether storage, async save timing, or rehydration caused the loss was **not established**.
5. **Control:** repeat Turn 1, but close/reopen the character normally. In the same walkthrough that preserved the pending `1/2` state. Successful control does not disprove the reload race.

**Later partial recovery evidence, not a full regression pass:** after a draft-recovery change, an **Acolyte miracle** was started and the page reloaded immediately. An **owner recovery prompt** appeared; choosing recovery restored **`CASTING 1/2`** with pool **4/6**, and cancellation left the pool **4/6**. This does **not** prove that the immediate-reload **Mysticism** path is fixed, nor verify decline/cross-owner live handling.

**Suggested deterministic regression and logs:** reproduce signed in on the latest deployed commit, repeating immediate refresh directly after the first Turn of **Mysticism**, then **Sorcery** and **Theism**, and recording exact commit/build, storage/save completion timing, network results, pending-cast UI and MP/pool before and after. Test quick refresh versus normal reopen, accepting versus declining the recovery prompt, cancellation, and opening the character with a different owner (no cross-owner restoration). Where possible, simulate delayed/rejected persistence writes in local tests; this is a **hypothesis to investigate**, not an established cause.

**Expected product behavior:** once the UI confirms preparation **1/2**, immediate reload must either reopen that same owner's in-progress preparation or offer that owner an explicit recovery choice; it must not silently forget progress, duplicate charges, resolve a spell automatically, or reveal another account's pending draft. Cancelling before final resolution should not charge an unmade cast. **Status after Claude PR #110:** Claude traced the failure to a **1.5-second account-save delay** and reports a code fix plus automated tests in PR #110. **Signed-in live verification is still open:** immediate reload for Mysticism, Sorcery and Theism, recovery-accept and recovery-decline, and save integrity. Keep the original intermittent reproduction above as regression evidence.
