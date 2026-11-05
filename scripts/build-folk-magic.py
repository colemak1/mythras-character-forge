#!/usr/bin/env python3
"""Copy docs/folk-magic-catalogue.json (ChatGPT's Core pp.123-129 data) into
the FOLK_MAGIC constant in js/data.js. Run after editing the JSON:
    python3 scripts/build-folk-magic.py
tests/magic-folk-catalogue.cjs fails if the two drift apart."""
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
spells = json.loads((root / "docs/folk-magic-catalogue.json").read_text(encoding="utf-8"))
body = ",\n".join(" " + json.dumps(s, ensure_ascii=False) for s in spells)
block = ("// Core pp.123-129, all 70 spells. Generated from docs/folk-magic-catalogue.json\n"
         "// by scripts/build-folk-magic.py; edit the JSON, then rerun the script.\n"
         "const FOLK_MAGIC=[\n" + body + "\n];")
data = root / "js/data.js"
src = data.read_text(encoding="utf-8")
pattern = re.compile(r"(?:// Core pp\.123-129.*\n// by scripts/build-folk-magic\.py.*\n)?const FOLK_MAGIC=\[[\s\S]*?\];(?: //[^\n]*)?")
assert len(pattern.findall(src)) == 1, "FOLK_MAGIC block not found exactly once"
data.write_text(pattern.sub(lambda m: block, src, count=1), encoding="utf-8")
print(f"FOLK_MAGIC: {len(spells)} spells written to js/data.js")
