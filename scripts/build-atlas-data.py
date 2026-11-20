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
owner's overview map renames are applied here (RENAME), and so are the
owner's border corrections (CLAIM).

Each settlement also gets the link to its town map, built exactly as Azgaar
1.158 builds its burg preview (src/model/political/burgs-generator.ts,
createWatabouCityLinks / createWatabouVillageLinks), so the atlas shows the
same generated city or village as Azgaar does."""
import json, math, re, sys, unicodedata, pathlib
from urllib.parse import urlencode

RENAME = {"Rove": "Zhalin", "Orsava": "Marett", "Nazu": "Joda"}
# Unclaimed land a nation should hold (owner, 2026-11-20: "Katalli should cover
# the whole peninsula", as its national plate shows). Neutral land cells joined
# to the nation inside the box [x0, y0, x1, y1] (map units) become the nation's.
CLAIM = {"Katalli": [0, 480, 120, 640]}
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

def js_round(v, d=0):
    m = 10 ** d
    return math.floor(v * m + 0.5) / m

def js_num(v):
    """A number as JavaScript's toString() writes it (for URL parameters)."""
    return str(int(v)) if float(v).is_integer() else repr(float(v))

def claim(cells, states):
    by_name = {s["name"]: i for i, s in states.items()}
    for name, (x0, y0, x1, y1) in CLAIM.items():
        sid = by_name[name]
        frontier = [c["i"] for c in cells if c.get("state") == sid]
        taken = 0
        while frontier:
            nxt = []
            for ci in frontier:
                for n in cells[ci]["c"]:
                    c = cells[n]; x, y = c["p"]
                    if c["h"] >= 20 and c.get("state", 0) == 0 and x0 <= x <= x1 and y0 <= y <= y1:
                        c["state"] = sid; nxt.append(n); taken += 1
            frontier = nxt
        print(f"claim: {taken} unclaimed cells given to {name}")

def town_map(d, b, group_preview):
    """Azgaar's burg preview link (Watabou city or village generator), or None."""
    p, opts = d["pack"], d["settings"]["options"]["map"]
    cells, routes = p["cells"], {r["i"]: r for r in p["routes"]}
    seed = str(opts["seed"]); pop_u = opts["units"]["population"]
    c = cells[b["cell"]]; kind = group_preview.get(b.get("group"))
    burg_seed = seed + str(b["i"]).zfill(4)
    conns = c.get("routes") or {}
    pop = js_round(b["population"] * pop_u["scale"] * pop_u["urbanization"]["rate"])
    if kind == "watabou-city":
        size = min(max(math.ceil(2.13 * ((b["population"] * pop_u["scale"]) / pop_u["urbanization"]["density"]) ** 0.385), 6), 100)
        coast = int(bool(b.get("port") and c.get("haven")))
        sea = None
        if coast:
            (x1, y1), (x2, y2) = c["p"], cells[c["haven"]]["p"]
            deg = math.degrees(math.atan2(y2 - y1, x2 - x1))
            norm = lambda v: min(max(v / 180, 0), 1)
            sea = js_round(norm(abs(deg)), 2) if deg <= 0 else js_round(2 - norm(deg), 2)
        farms = int(c["biome"] in ([1, 2, 3, 4, 5, 6, 7, 8] if c.get("r") else [5, 6, 7, 8]))
        citadel = int(b.get("citadel") or 0)
        roads = [r for r in conns.values() if routes.get(r, {}).get("group") == "roads"]
        hub = int(len(conns) > 3 or len(roads) > 2)
        plaza = int(b.get("plaza") or 0)
        q = {"name": b["name"], "population": js_num(pop), "size": str(size), "seed": burg_seed,
             "river": str(int(bool(c.get("r")))), "coast": str(coast), "farms": str(farms),
             "citadel": str(citadel), "urban_castle": str(int(bool(citadel and b["i"] % 2 == 0))),
             "hub": str(hub), "plaza": str(plaza), "greens": "1" if plaza else "0",
             "temple": str(int(b.get("temple") or 0)), "walls": str(int(b.get("walls") or 0)),
             "shantytown": str(int(b.get("shanty") or 0)), "style": "natural"}
        url = "https://watabou.github.io/city-generator/?" + urlencode(q)
        if sea: url += "&" + urlencode({"sea": js_num(sea)})
        return url
    if kind == "watabou-village":
        tags = []
        feat = next((f for f in p["features"] if isinstance(f, dict) and f.get("i") == c["f"]), {})
        if c.get("r") and c.get("haven"): tags.append("estuary")
        elif c.get("haven") and feat.get("cells") == 1: tags.append("island,district")
        elif b.get("port") and c.get("haven"): tags.append("coast")
        elif c.get("conf"): tags.append("confluence")
        elif c.get("r"): tags.append("river")
        elif pop < 200 and b["cell"] % 4 == 0: tags.append("pond")
        rate = 0.8 + sum({"roads": .2, "trails": .1, "searoutes": .2}.get(routes[r]["group"], .1) for r in conns.values() if r in routes) if conns else 0
        tags.append("highway" if rate > 1 else "dead end" if rate == 1 else "isolated")
        biome = c["biome"]
        if biome not in ([1, 2, 3, 4, 5, 6, 7, 8] if c.get("r") else [5, 6, 7, 8]): tags.append("uncultivated")
        elif b["cell"] % 6 == 0: tags.append("farmland")
        temp = d["grid"]["cells"][c["g"]]["temp"]
        if temp <= 0 or temp > 28 or (temp > 25 and b["cell"] % 3 == 0): tags.append("no orchards")
        if not b.get("plaza"): tags.append("no square")
        if b.get("walls"): tags.append("palisade")
        if pop < 100: tags.append("sparse")
        elif pop > 300: tags.append("dense")
        width = 1600 if pop > 1500 else 1400 if pop > 1000 else 1000 if pop > 500 else 800 if pop > 200 else 600 if pop > 100 else 400
        style = "sand" if biome in (1, 2) else "snow" if temp <= 5 or biome in (9, 10, 11) else "default"
        q = {"pop": js_num(pop), "name": b["name"], "seed": burg_seed, "width": str(width),
             "height": js_num(js_round(width / 2.05)), "style": style, "tags": ",".join(tags)}
        return "https://watabou.github.io/village-generator/?" + urlencode(q)
    return None

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
    claim(cells, states)
    group_preview = {g["name"]: g.get("preview") for g in d["settings"]["options"]["map"]["burgs"]["groups"]}

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
            "nation": nation_id.get(b.get("state") or cells[b["cell"]].get("state")), "capital": bool(b.get("capital")),
            "group": b.get("group") or "town", "port": bool(b.get("port")),
            "size": round(b.get("population", 0), 1),
            "map": town_map(d, b, group_preview),
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
    if OUT.exists():  # the nation maps placed by build-atlas-plates.py
        old = json.loads(OUT.read_text(encoding="utf-8"))
        if "details" in old: out["details"] = old["details"]
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{OUT}: {OUT.stat().st_size // 1024} KB, {len(nations)} nations, {len(settlements)} settlements, "
          f"{len(rivers)} rivers, {len(routes)} routes")

if __name__ == "__main__":
    main(sys.argv[1])
