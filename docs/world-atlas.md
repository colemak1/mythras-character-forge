# World Guide atlas and timeline

The World Guide opens on an interactive atlas (`#/world/atlas`), modelled on the Roshar atlas the owner pointed at
(2026-11-20): a map you can drag and zoom, nations and settlements you can choose, search, map layers, and a
timeline under the map whose events light up the places they happened.

Choosing a nation zooms into **the nation's own map**, faded in over the whole map; **‹ Sit’ota** zooms back out.
Choosing a settlement shows **its town map**: the city or village Azgaar generates for it (Watabou's generators),
in the panel and full size (owner, 2026-11-20). The old guide chapters are still there
(`#/world/welcome`, the **Guide** button).

## Files

| What | Where | Who edits |
|---|---|---|
| Map picture (stand-in) | `assets/atlas/sitota-map.webp` | replaced when the final map arrives |
| Borders, settlements, rivers, roads | `assets/atlas/atlas-data.json` | built by `scripts/build-atlas-data.py` |
| Nation maps (stand-in: the plates cropped to their map) | `assets/atlas/nations/<nation id>.webp`, placed by `data.details` | built by `scripts/build-atlas-plates.py`; replaced when the detailed maps are drawn |
| Town maps | links in `atlas-data.json` (`settlement.map`) | built with the data, the same as Azgaar's burg preview |
| Descriptions, lore names, eras, events | `js/atlas-lore.js` (`ATLAS_LORE`) | owner content; Claude types it in |
| The page | `js/atlas.js`, `sitota-atlas.css` | Claude |
| Tests | `tests/atlas.cjs` | Claude |

Links: `#/world/atlas/n-valeshar` (a nation), `#/world/atlas/s-golshehr` (a settlement), `#/world/atlas/e-<id>` (an event).

## Adding lore and events

Everything players read comes from `js/atlas-lore.js`, never from the map file. Send Claude the text; it goes in as:

```js
nations: { valeshar: { summary: 'One line.', body: '<p>Longer text.</p>' } },
places:  { golshehr: { name: 'Shamur', summary: 'The capital of Valeshar.' } },  // name replaces the map file's name
calendar: { year: 1200, era: 'Example Era', eraShort: 'EE' },                 // the present day (an example); null shows none
eras:    [ { id: 'pe', name: 'Persterbu Era', short: 'PE' } ],
events:  [ { id: 'treaty-of-shamur', year: 300, era: 'pe', title: 'The Treaty of Shamur',
             summary: 'One or two sentences.', nations: ['valeshar'], places: ['golshehr'] } ],
```

Ids are the ones in the map data: nation ids are the names in lower case with hyphens (`the-hix`, `vishka`, `lzar`,
`ba-riggelby`); settlement ids are their map names the same way (search the atlas, the link shows the id).
`tests/atlas.cjs` fails if an event names a place or era that does not exist.

## Replacing the stand-in maps

The vector layer and the picture share Azgaar's canvas (1024 × 768 units). The stand-in picture
(`Sitota_Full_Reference_Map.png`, 1536 × 1152) was drawn over the same canvas, so they line up at 1.5 px per unit.

1. **A new picture of the same Azgaar map:** export it at 4:3 covering the whole canvas (bigger is sharper when
   zoomed: 4096 × 3072 would stay sharp to the deepest zoom), save as `assets/atlas/sitota-map.webp`, run
   `python3 scripts/stamp-assets.py`. Nothing else changes.
2. **An edited Azgaar map:** export "Full JSON" and run
   `python3 -I scripts/build-atlas-data.py "<export>.json"`, then the stamp script and `node tests/atlas.cjs`.
   The script renames Rove → Zhalin, Orsava → Marett and Nazu → Joda, as the owner's overview map does
   (`RENAME` in the script); drop those once the map file uses the real names.
3. **A hand-drawn map not traced from Azgaar:** the borders and dots will not line up. Claude needs either the
   Azgaar export it was traced from, or a few matching points to fit a transform.

## The detailed nation maps

Each nation's map is one picture plus the rectangle it covers in the whole map's units, in `atlas-data.json`:
`details.<nation id> = {src, x, y, w, h, px:[width, height], labels}` (`labels: true` when the picture names its own
towns, so the atlas hides its own names there). For a drawn map, Claude needs the picture and where it sits on the
whole map: easiest is to draw it over an Azgaar export of that area, or to mark three towns on it.

`scripts/build-atlas-plates.py` made the stand-ins: it crops each plate to its map frame and finds the plate's scale
from the nation's border (Katalli's from four towns, since its border was corrected after the plate was drawn).

## Border corrections

`CLAIM` in `scripts/build-atlas-data.py` gives unclaimed land to a nation. Katalli holds the whole peninsula
(owner, 2026-11-20): 346 unclaimed cells and the 26 settlements on its south-western arm. Fixing it in Azgaar and
re-exporting makes the override unnecessary (it then claims nothing).

## Known limits (stand-in maps)

- The picture is 1536 px wide, so it is soft at the deeper zooms (the zoom stops at 6×).
- Settlement names, areas and borders come from the generated Azgaar map. The only lore name so far is Shamur
  (Golshehr on the map file); the panel says when a name differs.
- The stand-in nation maps print the map file's names, so a lore name (Shamur) sits next to the printed Golshehr.
- Town maps come live from watabou.github.io; if that site changes its generator, a town can change. The panel
  (Enlarge) links to the generator, so a map you like can be saved (its PNG or SVG export) and sent in to replace it.
- The timeline is empty until events are written, and shows no present day until one is set (845 PE in the map
  file is Azgaar's placeholder).

## Checked

Headless Chromium at 1280 × 800 and 390 × 844, light and dark: the whole map, a nation (Valeshar), a settlement
(Shamur), and three sample events with rivers and roads on. No page errors. Not checked on a real phone (pinch zoom).
2026-11-20, second batch: clicking Valeshar on the map opens its map; Katalli and Khor maps; Shamur's town map in the
panel (desktop and phone).
