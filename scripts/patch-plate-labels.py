#!/usr/bin/env python3
"""Erase a stand-in plate's own label for a settlement the lore renames, so
the atlas can show the lore name as the one persistent label (Atlas UX spec,
docs/ux/atlas-20261121.md: "Shamur" over the plate's "Golshehr").

    python3 -I scripts/patch-plate-labels.py      (once, after build-atlas-plates.py)

Each entry is a box of plate pixels holding the old name; pixels that keep
the map (river blue, the settlement dots) are left alone and the rest are
filled in from the surrounding paper. The plate's ?v= stamp in
atlas-data.json is updated. When the detailed maps replace the plates,
this list goes."""
import hashlib, json, pathlib
import numpy as np
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "assets/atlas/atlas-data.json"
# settlement id: (nation id, x0, y0, x1, y1, dots, river) in plate pixels:
# the box holds the old name; dots [(x, y, r)] are kept; river [(x, y), ...]
# redraws a river the label hid. tests/atlas.cjs checks every renamed
# settlement on a labelled plate is here.
ERASE = {"golshehr": ("valeshar", 947, 505, 1068, 540, [(957, 505, 9), (975, 539, 7)], [(957, 505), (966, 522), (975, 538)])}
RIVER, RIVER_EDGE = (88, 118, 122), (205, 218, 192)

def inpaint(a, mask, steps=400):
    a = a.astype(float); known = ~mask
    a[mask] = a[known].mean(0)
    for _ in range(steps):  # diffuse the surrounding colour into the hole
        s = (np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 4
        a[mask] = s[mask]
    return a

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_nation = {}
    for sid, (nid, *box) in ERASE.items():
        by_nation.setdefault(nid, []).append(box)
    for nid, boxes in by_nation.items():
        f = ROOT / "assets/atlas/nations" / f"{nid}.webp"
        img = np.asarray(Image.open(f).convert("RGB")).copy()
        for x0, y0, x1, y1, dots, river in boxes:
            pad = 6
            sub = img[y0 - pad:y1 + pad, x0 - pad:x1 + pad].astype(int)
            h, w, _ = sub.shape
            yy, xx = np.mgrid[0:h, 0:w]
            mask = np.zeros((h, w), bool); mask[pad:h - pad, pad:w - pad] = True
            r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
            mask &= ~((b > r + 15) & (b > 90))  # the river stays
            for dx, dy, rad in dots:
                mask &= (xx - (dx - x0 + pad)) ** 2 + (yy - (dy - y0 + pad)) ** 2 > rad ** 2
            out = np.clip(inpaint(sub, mask), 0, 255).astype(np.uint8)
            if river:
                pts = [(x - x0 + pad, y - y0 + pad) for x, y in river]
                for colour, width in ((RIVER_EDGE, 11), (RIVER, 7)):
                    line = Image.new("L", (w, h)); ImageDraw.Draw(line).line(pts, fill=255, width=width, joint="curve")
                    out[mask & (np.asarray(line) > 127)] = colour
            img[y0 - pad:y1 + pad, x0 - pad:x1 + pad] = out
        Image.fromarray(img).save(f, quality=80, method=6)
        v = hashlib.sha256(f.read_bytes()).hexdigest()[:10]
        data["details"][nid]["src"] = f"assets/atlas/nations/{nid}.webp?v={v}"
        print(f"{nid}: {len(boxes)} label(s) erased, v={v}")
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

if __name__ == "__main__":
    main()
