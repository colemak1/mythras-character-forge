# Folk Magic catalogue: data format for ChatGPT

The owner has permission to use the Mythras Core rulebook text (see `decisions.md`). ChatGPT supplies the spell data from Core pp.123–129 in this format. Claude loads it into `FOLK_MAGIC` in `js/data.js`, and the builder's spell picker and Play Mode cards use it automatically.

## Format

One JSON array, one object per spell, in the book's order:

```json
[
  {
    "n": "Bladesharp",
    "t": ["Touch"],
    "d": "Full spell description as printed.",
    "p": 124
  },
  {
    "n": "Beastcall (X)",
    "t": ["Ranged", "Resist (Willpower)"],
    "d": "Full spell description as printed.",
    "p": 124,
    "spec": "animal type"
  }
]
```

| Field | Required | Meaning |
|---|---|---|
| `n` | yes | Spell name exactly as printed. Variable spells keep `(X)`. |
| `t` | yes | Traits exactly as printed, from: `Concentration`, `Instant`, `Ranged`, `Touch`, `Trigger`, `Special Duration`, `Resist (Endurance)`, `Resist (Willpower)`, `Resist (Evade)`, `Resist (Special)`. Use `[]` if none. Flag any other trait name instead of inventing one. |
| `d` | yes | The spell's description as printed. |
| `p` | yes | Printed page number. |
| `spec` | only for `(X)` spells | What the player names, e.g. `"animal type"`. For Find (X), list the printed variants in `d`. |

## Rules

- All 70 spells, no extras. Find (X) is one entry; the player records the variant.
- Copy names and traits exactly. If a trait reads differently from the list above, use the book's wording and say so.
- Use straight quotes, and escape any double quotes inside `d`.
- Save it as `docs/folk-magic-catalogue.json` on a new branch and open a docs-only PR. Don't edit `js/`. Claude checks the JSON, loads it into the app with tests, and merges.
