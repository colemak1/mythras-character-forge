# Career audit: initial cases

Source: user-uploaded `pdfcoffee.com_mythras-2e-2-pdf-free(20261021-212124).pdf`, Mythras Core Rulebook, printed pp. 29–33. Career tables were checked against rendered pages because the parsed PDF contains column and table errors. This is a partial audit, not a complete verification of career creation or every entry.

| Case | Source and expected behavior | Evidence and status |
|---|---|---|
| CR-02: career lists | Printed pp. 29–33: published career skill offers. | Visual comparison with `js/data.js`; names, skill offers and style slots were reviewed. Navigation is normalized from the book's “Navigate”. Further automated entry-by-entry and workflow verification remains open. |
| CR-01a: custom career setup | Printed p. 33: a custom career is agreed with the GM and has up to seven standard skills, counting each Combat Style as a standard skill. | The editor now stays open while a name is entered; it permits confirmation only at seven or fewer combined skills and styles. `tests/core-batch-1.cjs` covers the boundary, editing, and validation of an over-limit saved state. Existing over-limit selections are retained for correction. Not yet tested on the live site. |
| CR-01b: custom professional offers | Printed p. 33: a custom profession has up to seven professional skill options. | The current builder selects up to three professional skills directly; it does not separately record a seven-option list. The interface now says so and directs the player to agree options with the GM. Implementation and live verification remain open. |
| CR-01c: custom Combat Style slots | Printed p. 33: Combat Styles count toward the seven standard skills. | The builder currently exposes at most two Combat Style slots. Whether additional slots are required for a particular GM-approved career remains open; the current interface does not support more. |

The automated check is not a signed-in workflow, a complete data audit, or a live deployment check. See `core-rule-scope.md` for the broader inventory and separate evidence categories.
