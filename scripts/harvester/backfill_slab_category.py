#!/usr/bin/env python3
"""Reclassify families with /Slab/* tags as Slab (idempotent).

    python3 backfill_slab_category.py [path/to/fonts.json]
"""
import json
import os
import sys

SLAB_TAGS = ["/Slab/Humanist", "/Slab/Clarendon", "/Slab/Geometric"]
TAG_THRESHOLD = 50


def is_slab_font(rec):
    tags = rec.get("tags", {})
    return any(tags.get(t, 0) >= TAG_THRESHOLD for t in SLAB_TAGS)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    slab, folded_emoji = [], []
    for r in records:
        if r.get("category") == "Emoji":
            r["category"] = "Graphics"
            folded_emoji.append(r.get("name"))
        if is_slab_font(r):
            if r.get("category") != "Slab":
                r["category"] = "Slab"
                slab.append(r.get("name"))

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"reclassified {len(slab)} -> Slab ({len(slab)} families)",
          file=sys.stderr)
    print(f"folded {len(folded_emoji)} Emoji -> Graphics: {folded_emoji}", file=sys.stderr)


if __name__ == "__main__":
    main()
