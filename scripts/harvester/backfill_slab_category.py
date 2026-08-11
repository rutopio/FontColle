#!/usr/bin/env python3
"""Carve Slab out of the harvested primaries as its own Category class.

A family carrying any /Slab/* classification tag (>= threshold) is split out of
whatever primary it had (mostly Serif, some Display/Mono). Slab is treated as a
peer of Sans/Serif, not a Serif sub-style, so a slab face is ONLY Slab.

Emoji is deliberately NOT carved out: emoji faces stay under "Graphics" with the
other non-linguistic faces (symbols/icons/barcodes). They are still separable
downstream by their subsets ("emoji" as the sole non-"menu" subset), which is a
Writing System concern rather than a letterform class.

Backfill only (edits src/data/fonts.json); harvest.py's classifier is left
unchanged. Idempotent.

Usage:
    python3 backfill_slab_category.py [path/to/fonts.json]
"""
import json
import os
import sys

SLAB_TAGS = ["/Slab/Humanist", "/Slab/Clarendon", "/Slab/Geometric"]
TAG_THRESHOLD = 50


def is_slab_font(rec):
    # A slab-tagged typewriter face (Courier Prime, Cutive Mono) is a slab AND
    # monospaced. It used to be held back on the Mono card by a guard here;
    # Mono is no longer a Category class, so the slab letterform wins and the
    # spacing is carried by the Spacing filter instead.
    tags = rec.get("tags", {})
    return any(tags.get(t, 0) >= TAG_THRESHOLD for t in SLAB_TAGS)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    records = json.load(open(path))
    slab, unemoji = [], []
    for r in records:
        # Fold back any record an older run of this script left on a class that
        # has since been retired: "Emoji" (now part of Graphics) and "Mono" (now
        # the Spacing filter, with the letterform decided by the tag tree).
        if r.get("category") == "Emoji":
            r["category"] = "Graphics"
            unemoji.append(r.get("name"))
        if is_slab_font(r):
            if r.get("category") != "Slab":
                r["category"] = "Slab"
                slab.append(r.get("name"))

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"reclassified {len(slab)} -> Slab ({len(slab)} families)",
          file=sys.stderr)
    print(f"folded {len(unemoji)} Emoji -> Graphics: {unemoji}", file=sys.stderr)


if __name__ == "__main__":
    main()
