#!/usr/bin/env python3
"""Stand-in nation maps for the atlas: crop each national plate to its map
frame, find where the plate put the nation, and record that placement in
assets/atlas/atlas-data.json ("details"), so the atlas can zoom from the
whole map straight into the nation's own map with every settlement in place.

    python3 -I scripts/build-atlas-plates.py path/to/Nation_Atlas
    (run after scripts/build-atlas-data.py, which keeps "details")

The plates (Sitota_Atlas_Pack, 2026-11-20) draw each nation centred in a
2400 x 1800 frame at its own scale, with its border in one brown. The border's
bounding box against the nation's box in the data gives the scale; the centres
give the offset. Final detailed maps replace these: one image per nation and
its rectangle in map units (x, y, w, h) is all the atlas needs."""
import glob, hashlib, json, os, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "assets/atlas/atlas-data.json"
OUT = ROOT / "assets/atlas/nations"
FRAME_LINE, BORDER = (98, 73, 50), (106, 63, 39)
LINE_W = 8  # the plate border's width in pixels: half of it lies outside the nation
FILE_ID = {"vish-ka": "vishka", "l-zar": "lzar"}
# Where the border fit fails (Katalli's border was corrected after its plate
# was drawn), the plate pixel of a few settlement dots, read off the plate.
ANCHORS = {"katalli": {"phais": (1152, 697), "stymphos": (1733, 589), "doreos": (948, 828), "onion": (832, 646)}}

def main(src):
    data = json.loads(DATA.read_text(encoding="utf-8"))
    nations = {n["id"]: n for n in data["nations"]}
    OUT.mkdir(parents=True, exist_ok=True)
    details = {}
    for f in sorted(glob.glob(os.path.join(src, "*.png"))):
        nid = os.path.basename(f)[3:-4]; nid = FILE_ID.get(nid, nid)
        n = nations[nid]
        img = Image.open(f).convert("RGB"); a = np.asarray(img).astype(int)
        H, W, _ = a.shape
        dark = np.abs(a - FRAME_LINE).sum(2) < 20
        xs, ys = np.where(dark[H // 2])[0], np.where(dark[:, W // 2])[0]
        L = xs[(xs > 60) & (xs < 200)].max() + 3; R = xs[(xs > W - 200) & (xs < W - 60)].min() - 3
        T = ys[(ys > 200) & (ys < 320)].max() + 3; B = ys[(ys > H - 400) & (ys < H - 200)].min() - 3
        m = np.abs(a - BORDER).sum(2) < 12
        m[:T] = m[B:] = False; m[:, :L] = m[:, R:] = False
        yy, xx = np.where(m)
        x0, x1 = np.percentile(xx, [0.05, 99.95]); y0, y1 = np.percentile(yy, [0.05, 99.95])
        b = n["box"]
        if nid in ANCHORS:  # least squares: plate = (map - corner) * s
            pts = [(next(p for p in data["settlements"] if p["id"] == k), v) for k, v in ANCHORS[nid].items()]
            M = np.array([[p["x"], p["y"]] for p, _ in pts]); P = np.array([v for _, v in pts], float) - [L, T]
            mc, pc = M.mean(0), P.mean(0)
            s = float(((M - mc) * (P - pc)).sum() / ((M - mc) ** 2).sum())
            mx, my = mc - pc / s
        else:
            s = ((x1 - x0 - LINE_W) / (b[2] - b[0]) + (y1 - y0 - LINE_W) / (b[3] - b[1])) / 2
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            # map units of the crop's top-left corner
            mx, my = cx - ((x0 + x1) / 2 - L) / s, cy - ((y0 + y1) / 2 - T) / s
        crop = img.crop((L, T, R, B)); out = OUT / f"{nid}.webp"
        crop.save(out, quality=80, method=6)
        v = hashlib.sha256(out.read_bytes()).hexdigest()[:10]
        details[nid] = {"src": f"assets/atlas/nations/{nid}.webp?v={v}", "x": round(float(mx), 2), "y": round(float(my), 2),
                        "w": round(crop.width / s, 2), "h": round(crop.height / s, 2), "px": [crop.width, crop.height],
                        "labels": True}
        print(f"{nid:12} scale {s:6.2f} px/unit  {out.stat().st_size // 1024} KB")
    data["details"] = details
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

if __name__ == "__main__":
    main(sys.argv[1])
