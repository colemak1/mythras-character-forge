#!/usr/bin/env python3
"""Set every local `?v=` asset parameter in the site's HTML pages to a short
hash of that file's contents, so browsers fetch a fresh copy whenever a file
changes and keep the cached one otherwise.

Run after changing any JS or CSS file that an HTML page loads with ?v=:
    python3 scripts/stamp-assets.py
tests/asset-versions.cjs fails if a stamp no longer matches its file."""
import hashlib, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "experiments/practice-combat.html", "experiments/pits-choreography.html", "experiments/pits-exchange-study.html", "experiments/pits-fight-study.html", "experiments/pits-collide-compare.html"]
REF = re.compile(r'((?:src|href)=")([^"?#]+)\?v=[^"]*(")')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]

# Scripts that load assets themselves: (script, pattern, folder the matched
# path is relative to). Stamped before the pages, since this changes the
# script's own hash.
SCRIPT_REFS = [
    ("js/atlas.js", re.compile(r"(')(assets/atlas/[^'?]+)\?v=[^']*(')"), ""),
]

changed = 0
for script, pattern, base in SCRIPT_REFS:
    p = root / script
    src = p.read_text(encoding="utf-8")
    def stamp_ref(m):
        target = root / base / m.group(2)
        if not target.is_file():
            sys.exit(f"{script}: {base}/{m.group(2)} does not exist")
        return f"{m.group(1)}{m.group(2)}?v={digest(target)}{m.group(3)}"
    new = pattern.sub(stamp_ref, src)
    if new != src:
        p.write_text(new, encoding="utf-8"); changed += 1

for page in PAGES:
    p = root / page
    html = p.read_text(encoding="utf-8")
    def stamp(m):
        target = (p.parent / m.group(2)).resolve()
        if not target.is_file():
            sys.exit(f"{page}: {m.group(2)} does not exist")
        return f"{m.group(1)}{m.group(2)}?v={digest(target)}{m.group(3)}"
    new = REF.sub(stamp, html)
    if new != html:
        p.write_text(new, encoding="utf-8"); changed += 1
print(f"Stamped asset versions in {changed} file(s).")
