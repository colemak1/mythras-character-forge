# Visual asset replacement inventory

> **Status:** Repository audit, 2026-11-08. **Not an AI-authorship determination.** This is a replace-later checklist for every committed production raster image, plus code-rendered graphics. No assets were removed or modified.

## What was audited

The recursive `main` Git tree (192 entries at audit time), image references in `index.html`, `sitota-home-16x9.css`, and the main site/experiment CSS and JS. The production repository contains **8 raster files** in `assets/` and `icons/`: **7 visual roles** (the hero has two encodings). No committed standalone SVG files were found. A further **22 PNG/JPEG files under `docs/evidence/`** are test screenshots, **not production art**. No generated-art provenance or prompt metadata was established from the files' names or available source references.

**Provenance labels:** `Unknown—verify with owner` means no evidence that a generative-image model made the file; it must **not** be presented as confirmed AI-generated. `Code-rendered` means the browser draws the asset using SVG, CSS or canvas; it does **not** establish generative-image use. Owner-supplied images should be kept unless the owner explicitly elects to replace them.

## Production image checklist

| ID | Current file(s) / preview | Used where | Origin evidence | Replacement requirements | Status |
| --- | --- | --- | --- | --- | --- |
| VIS-01 | [`assets/sitota-hero.webp`](../assets/sitota-hero.webp) · [AVIF](../assets/sitota-hero.avif) | Home hero background, `sitota-home-16x9.css` (`.st-hero-art`) | **Unknown—verify with owner**; prior owner-directed homepage art should not be assumed AI-made | One owner-approved 16:9 composition, legible beneath hero text; export both WebP and AVIF; preserve crop/focal point and CSS `image-set` references | [ ] Review |
| VIS-02 | [`icons/logo-light.png`](../icons/logo-light.png) | Header logo on `index.html` | **Unknown—verify with owner** | Transparent logo suited to dark header; keep readable at displayed 25 × 56 px or adjust sizing intentionally | [ ] Review |
| VIS-03 | [`icons/logo.png`](../icons/logo.png) | Alternate/logo master in repo; no confirmed current page reference in inspected entrypoints | **Unknown—verify with owner** | Preserve alternate logo treatment if still needed; check usages before deletion | [ ] Review |
| VIS-04 | [`icons/favicon-32.png`](../icons/favicon-32.png) | Browser tab icon via `index.html` | **Unknown—verify with owner** | Clear at 32 × 32; derive from approved logo | [ ] Review |
| VIS-05 | [`icons/favicon-192.png`](../icons/favicon-192.png) | 192 × 192 icon link via `index.html` | **Unknown—verify with owner** | Derive from approved logo; preserve 192 × 192 output | [ ] Review |
| VIS-06 | [`icons/apple-touch-icon.png`](../icons/apple-touch-icon.png) | iOS home-screen icon via `index.html` | **Unknown—verify with owner** | Platform-appropriate square export; test at icon scale | [ ] Review |
| VIS-07 | [`icons/og-image.jpg`](../icons/og-image.jpg) | Social/share image stored in repo; **current `index.html` does not explicitly reference `og:image`** | **Unknown—verify with owner** | Approve share card; confirm whether to wire into Open Graph/Twitter tags in a separate code change | [ ] Review |

**Visual previews:** Click each linked file to inspect it on GitHub. The two hero files are **one design**, not two independent replacement tasks. The three favicon/touch variants may be generated from the same approved logo; don't commission them separately.

## Code-rendered visuals to review (not raster assets)

| ID | Graphic / location | Implementation | Replace or retain? |
| --- | --- | --- | --- |
| CODE-01 | Main navigation and account icons in `index.html`; destination icons in `js/sitota.js` | Inline SVG paths | Review visual style for consistency; if replacing, use a cohesive hand-designed icon set. No AI-image origin evidence |
| CODE-02 | Combat hit-location silhouettes and finishing-wound figure in `experiments/practice-combat.html` | Inline SVG assembled from shape data (`finish-location-figure`, `anatomy-chart`) | Check legibility and anatomy; these are functional diagrams, not commissioned illustrations |
| CODE-03 | Practice-combat dice in `experiments/practice-combat.html` | Canvas / procedural rendering | Preserve gameplay and actual roll values; optional visual redesign is a code task, not a file swap |
| CODE-04 | Noise, corner ornaments and decorative marks in `styles.css` (e.g. `data:image/svg+xml`); gradients across site CSS | Embedded SVG/CSS | Review only if removing programmatically generated decoration; not standalone AI-generated images |
| CODE-05 | The Pits / Play Mode panels and combat UI in `experiments/pits-stone.css`, `play-stone.css`, and `sitota-menus.css` | CSS shapes, borders, textures and layout | Design-system work, not image provenance; avoid replacing functional controls with raster art |

## Excluded from the replacement queue

- **`docs/evidence/**` (22 image files):** screenshots of live acceptance, Play Mode, The Pits and combat checks. They document behavior; replacing them would destroy test evidence.
- **Player character portraits:** `js/sitota.js` reads the character's saved portrait (`state.concept.portrait`); these are user data, not shipped production assets. Never delete or overwrite player images in a visual cleanup.
- **Fonts** loaded from Google Fonts, CSS gradients, and other standard UI primitives: not AI-generated image assets. External/remote artwork and Supabase-stored images, if any, are **not verified** by this Git-tree audit.
- **Historical or unmerged branches:** this audit covers `main` only, not every image that may have existed in prior designs.

## Replacement plan

1. **Owner provenance pass:** mark VIS-01–07 as `Owner-created/supplied`, `AI-generated`, `Third-party/licensed`, or `Unknown`. Only the owner or documented creation history can establish authorship reliably.
2. **Prioritize confirmed AI-generated art** that is visibly used: hero and header branding first; icons/share card second. Leave owner-supplied artwork intact by default.
3. **Prepare replacement masters** outside the public repo; specify intended file, dimensions/crop, transparency, attribution/license and the owner's approval.
4. **Claude implementation:** swap approved files in one production PR, update any paths or sizing and image metadata, run `scripts/stamp-assets.py` when CSS/JS changes, and test at desktop 1280px and phone 390px. No changes to gameplay.
5. **Acceptance:** verify home/header, tab favicon, iOS touch icon and social preview separately; update each row with replacement date, provenance and PR.

### Owner review template

`VIS-xx | provenance: ... | keep/replace: ... | replacement source: ... | approved: yes/no`

**Scope limit:** This is a complete inventory of *committed production raster files on the audited `main` tree*, not a claim to have identified every AI-authored visual or all images stored in user accounts. Do not delete anything solely because it appears in this list.
