#!/usr/bin/env python3
"""The open sea round the atlas picture: a seamless parchment tile cut from an
empty stretch of the picture's own sea (owner, 2026-11-22: "remove the border
on the map and extend the ocean a bit so when fully zoomed out we can see the
whole continent"). js/atlas.js lays it under and round the picture, whose
framed edge is faded out (sitota-atlas.css), so the sea runs on past it.

    python3 -I scripts/build-atlas-sea.py      (then python3 scripts/stamp-assets.py)

Rerun it when the picture is replaced, with PATCH moved to an empty stretch."""
import pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "assets/atlas/sitota-map.webp", ROOT / "assets/atlas/sea-tile.webp"
PATCH = (1048, 40, 200)  # x, y, size in picture pixels: open sea north of The Hix (the cleanest stretch)

def main():
    x, y, n = PATCH
    p = np.asarray(Image.open(SRC).convert("RGB"))[y:y + n, x:x + n].astype(float)
    # Seamless: cross-fade the patch with itself shifted by half, weighted so
    # each edge is all shifted copy (whose edges meet its opposite side).
    r = np.roll(np.roll(p, n // 2, 0), n // 2, 1)
    t = np.abs(np.linspace(-1, 1, n))
    w = np.clip(1 - np.maximum.outer(t, t) * 1.0, 0, 1) ** .7  # 1 in the middle, 0 at the edges
    tile = p * w[..., None] + r * (1 - w[..., None])
    Image.fromarray(tile.round().astype(np.uint8)).save(OUT, quality=82, method=6)
    print(f"{OUT}: {n} x {n}, {OUT.stat().st_size // 1024} KB")

if __name__ == "__main__":
    main()
