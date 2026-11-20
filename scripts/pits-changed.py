#!/usr/bin/env python3
"""Did this change touch The Pits? Used by the Tests workflow to skip the Pits
browser bouts on changes that cannot affect them (owner, 2026-11-20).

    git diff --name-only BASE HEAD | python3 scripts/pits-changed.py
    prints "true" or "false"

The Pits is experiments/practice-combat.html and every local file it loads,
plus anything under experiments/, the browser tests themselves and the Tests
workflow. Unit tests (tests/*.cjs) always run regardless."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "experiments/practice-combat.html"

def pits_files():
    files = set()
    for m in re.finditer(r'(?:src|href)="([^"?#:]+)', PAGE.read_text(encoding="utf-8")):
        target = (PAGE.parent / m.group(1)).resolve()
        if target.is_file() and ROOT in target.parents:
            files.add(target.relative_to(ROOT).as_posix())
    return files

PREFIXES = ("experiments/", "tests/visual/", "scripts/pits-changed.py", ".github/workflows/tests.yml")

def touches_pits(changed):
    own = pits_files()
    return any(f in own or f.startswith(PREFIXES) for f in changed)

if __name__ == "__main__":
    changed = [l.strip() for l in sys.stdin if l.strip()]
    print("true" if touches_pits(changed) else "false")
