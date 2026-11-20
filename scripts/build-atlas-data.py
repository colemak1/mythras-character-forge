#!/usr/bin/env python3
"""Build assets/atlas/atlas-data.json, the vector layer of the World Guide
atlas, from an Azgaar Fantasy Map Generator "Full JSON" export.

    python3 -I scripts/build-atlas-data.py "path/to/Sit'ota Full ....json"

Coordinates stay in Azgaar's canvas space (info.width x info.height, here
1024 x 768). The base picture (assets/atlas/sitota-map.webp) is drawn over the
same canvas, so both line up when scaled to the same box.

Only geography comes from the export: borders, settlements, rivers and
routes. Lore (descriptions, lore names, the timeline) lives in
js/atlas-lore.js and is never generated. The three Azgaar state names the
owner's overview map renames are applied here (RENAME)."""
import json, re, sys, unicodedata, pathlib

RENAME = {"Rove": "Zhalin", "Orsava": "Marett", "Nazu": "Joda"}
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets/atlas/atlas-data.json"

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def dp(pts, tol):
    """Douglas-Peucker simplification of an open polyline."""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = pts[a], pts[b]
        dx, dy = bx - ax, by - ay; L = (dx * dx + dy * dy) ** .5 or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            dist = abs(dy * px - dx * py + bx * ay - by * ax) / L
            if dist > best: best, bi = dist, i
        if best > tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def f1(v): return ("%.1f" % v).rstrip("0").rstrip(".")
def path(pts, close=False):
    return "M" + "L".join(f1(x) + " " + f1(y) for x, y in pts) + ("Z" if close else "")

def rings(edges, V):
    """Chain boundary edges (vertex-id pairs) into closed rings."""
    adj = {}
    for a, b in edges:
        adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    used, out = set(), []
    for a, b in edges:
        if (a, b) in used or (b, a) in used: continue
        ring = [a]; prev, cur = a, b; used.add((a, b))
        while cur != a:
            ring.append(cur)
            nxt = next((n for n in adj[cur] if n != prev and (cur, n) not in used and (n, cur) not in used), None)
            if nxt is None: break
            used.add((cur, nxt)); prev, cur = cur, nxt
        if len(ring) > 2: out.append([tuple(V[i]["p"]) for i in ring])
    return out

def main(src):
    d = json.load(open(src, encoding="utf-8"))
    p = d["pack"]; cells = p["cells"]; V = p["vertices"]
    W, H = d["info"]["width"], d["info"]["height"]
    states = {s["i"]: s for s in p["states"] if isinstance(s, dict) and s.get("i") and not s.get("removed")}
    burgs = [b for b in p["burgs"] if isinstance(b, dict) and b.get("i") and not b.get("removed")]
    nation_id = {i: slug(RENAME.get(s["name"], s["name"])) for i, s in states.items()}

    edge_count = {i: {} for i in states}
    for c in cells:
        s = c.get("state")
        if s not in states or c["h"] < 20: continue
        vs = c["v"]
        for k in range(len(vs)):
            e = tuple(sorted((vs[k], vs[(k + 1) % len(vs)])))
            edge_count[s][e] = edge_count[s].get(e, 0) + 1

    nations = []
    for i, s in states.items():
        edges = [e for e, n in edge_count[i].items() if n == 1]
        parts = []
        xs, ys = [], []
        for r in rings(edges, V):
            if len(r) < 4: continue
            h = len(r) // 2  # a closed ring has no chord; simplify it as two halves
            simp = dp(r[:h + 1], 0.35)[:-1] + dp(r[h:] + [r[0]], 0.35)[:-1]
            if len(simp) < 3: continue
            parts.append(path(simp, True))
            xs += [x for x, _ in r]; ys += [y for _, y in r]
        if not xs: print("no outline:", s["name"], len(edges)); continue
        cap = next((b for b in burgs if b["i"] == s.get("capital")), None)
        nations.append({
            "id": nation_id[i], "name": RENAME.get(s["name"], s["name"]), "sourceName": s["name"],
            "color": s.get("color"), "d": "".join(parts),
            "box": [round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1)],
            "pole": [round(v, 1) for v in (s.get("pole") or [0, 0])],
            "capital": cap and cap["i"], "areaSqMi": round(s.get("area", 0) * d["settings"]["distanceScale"] ** 2),
        })

    seen = {}
    settlements = []
    for b in burgs:
        sid = slug(b["name"]) or "place"
        if sid in seen: sid += "-" + str(b["i"])
        seen[sid] = 1
        settlements.append({
            "id": sid, "i": b["i"], "name": b["name"], "x": round(b["x"], 1), "y": round(b["y"], 1),
            "nation": nation_id.get(b.get("state")), "capital": bool(b.get("capital")),
            "group": b.get("group") or "town", "port": bool(b.get("port")),
            "size": round(b.get("population", 0), 1),
        })

    rivers = []
    for r in p["rivers"]:
        if not isinstance(r, dict) or not r.get("cells"): continue
        pts = [tuple(cells[c]["p"]) for c in r["cells"] if 0 <= c < len(cells)]
        if len(pts) < 2: continue
        rivers.append({"name": r.get("name", ""), "type": r.get("type", "River"),
                       "w": round(r.get("discharge", 0)), "d": path(dp(pts, 0.4))})
    rivers.sort(key=lambda r: r["w"])

    routes = []
    for r in p["routes"]:
        pts = [(q[0], q[1]) for q in r.get("points", [])]
        if len(pts) < 2: continue
        routes.append({"name": r.get("name", ""), "kind": r.get("group", "trails"), "d": path(dp(pts, 0.4))})

    out = {"source": "Azgaar " + d["info"]["version"] + ", exported " + d["info"]["exportedAt"][:10],
           "width": W, "height": H, "mileScale": d["settings"]["distanceScale"],
           "calendar": d["settings"]["options"]["map"]["lore"]["calendar"],
           "nations": sorted(nations, key=lambda n: n["name"]),
           "settlements": settlements, "rivers": rivers, "routes": routes}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{OUT}: {OUT.stat().st_size // 1024} KB, {len(nations)} nations, {len(settlements)} settlements, "
          f"{len(rivers)} rivers, {len(routes)} routes")

if __name__ == "__main__":
    main(sys.argv[1])
