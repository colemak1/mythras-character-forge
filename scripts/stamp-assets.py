#!/usr/bin/env python3
"""Set every local `?v=` asset parameter in the site's HTML pages to a short
hash of that file's contents, so browsers fetch a fresh copy whenever a file
changes and keep the cached one otherwise.

Run after changing any JS or CSS file that an HTML page loads with ?v=:
    python3 scripts/stamp-assets.py
tests/asset-versions.cjs fails if a stamp no longer matches its file."""
import hashlib, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "experiments/practice-combat.html"]
REF = re.compile(r'((?:src|href)=")([^"?#]+)\?v=[^"]*(")')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]

changed = 0
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
print(f"Stamped asset versions in {changed} page(s).")
