#!/usr/bin/env python3
"""One-shot re-derivation of the `specimen` field on src/data/fonts.json.

The previous specimen picked the highest-population language per script, which
gave every Traditional-Chinese (Hant) font the Wu-Chinese UDHR text instead of
the canonical zh_Hant / yue_Hant. This recomputes specimens with the corrected
CJK-subset-based logic (see langcov.SUBSET_TO_SPECIMEN_LANG) without a full
reharvest.

Usage:
    python3 backfill_specimens.py [path/to/fonts.json]
"""
import json
import os
import sys

import langcov


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    by_script = langcov.specimen_by_script()
    by_lang = {
        subset: langcov.specimen_for_lang(lang)
        for subset, lang in langcov.SUBSET_TO_SPECIMEN_LANG.items()
    }

    records = json.load(open(path))
    changed = 0
    for r in records:
        subsets = r.get("subsets") or []
        text = next((by_lang[s] for s in subsets if by_lang.get(s)), None)
        if text is None:
            script = r.get("primaryScript")
            text = by_script.get(script) if script and script != "Latn" else None
        if r.get("specimen") != text:
            changed += 1
        r["specimen"] = text

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"specimens updated on {changed}/{len(records)} records -> {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
