# Core cultural skill cases

Source: user-uploaded Mythras Core Rulebook, `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`, printed pp. 13–16. Parsed text was garbled; pages were visually inspected. Code checked on top of `c8a3c02` in `js/data.js`, `js/engine.js`, `js/app.js`, and `js/render.js`. These cases cover skill lists and selected creation checks, not the entirety of culture or community.

| ID | Scope and source | Evidence and status |
|---|---|---|
| CU-01a | Customs and Native Tongue receive the static cultural bonus (p. 13). | `entryMap`/`finalPct` implement the bonus; the previously saved live test showed Customs 89 = INT 17×2 + 40 + 15 bonus and Native Tongue 62 = INT 17 + CHA 5 + 40. One live character only; no complete persistence or all-boundary claim. |
| CU-01b | Three offered professional skills, specialities, up to one optional cultural Combat Style, 100 points, standard/professional minimum 5 and maximum 15; style can receive zero (p. 13). | `professionalPicksError`, `cultureReqKeys`, `validate`. Existing tests cover invalid professional offers and style 0–4 with labelled Sit'ota option versus strict Core. Broader specialities, all allocations, and live round trips remain open. |
| CU-02a | Barbarian offers and Boating/Ride choice (p. 14). | Standard/professional lists and choice count compared visually, now asserted in `rules-smoke.cjs`; Navigation is the app's skill name for the book's Navigate label. UI pathways remain to test live. |
| CU-02b | Civilised standard/professional offers (p. 15). | Lists compared visually and asserted. The prior live Civilised Merchant completed the allocation and was saved/reopened; not every option was exercised. |
| CU-02c | Nomadic offers and two travel-related choices (pp. 15–16). | Lists and choice count compared visually and asserted. Added validation rejects duplicate or unavailable choices retained by an inconsistent import; normal selection and persistence require live testing. |
| CU-02d | Primitive offers and one of Athletics, Boating or Swim (p. 16). | Lists and choice count compared visually and asserted. Added validation rejects unavailable choice. Live UI and persistence remain open. |
| CU-02e | Culture-specific example style names and suggested Passions (pp. 14–16). | Not comprehensively tested in this batch; examples are not weapon definitions. |

## Correction

The Culture validation previously checked only how many standard-skill choices were stored. An inconsistent or imported state could use a duplicate or unavailable choice (or attach a choice to Civilised), and the invalid choice could enter the allocation list. Validation now reports the problem without silently modifying saved data. The normal picker already constrains choices. This does not claim ordinary UI users were able to create the invalid state.

All nine local JavaScript suites passed, including exact culture-list and invalid-choice cases. A local test is not a live-site test. Before marking these groups fully verified, check normal UI selection changes, specialities, the house-rule toggle, custom/legacy saves and signed-in save/reopen for all four cultures.
