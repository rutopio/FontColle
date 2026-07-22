#!/usr/bin/env python3
"""Reclassify emoji and slab fonts into their own primary classes.

Two Category classes are carved out of the harvested primaries so each stands
on its own, mutually exclusive with the rest:

  - Emoji: an emoji face (its sole non-"menu" subset is "emoji"), split out of
    "Graphics". Emoji faces have no linguistic sample and behave nothing like
    the other Graphics faces (symbols/icons/barcodes).
  - Slab: a family carrying any /Slab/* classification tag (>= threshold), split
    out of whatever primary it had (mostly Serif, some Display/Mono). Slab is
    treated as a peer of Sans/Serif, not a Serif sub-style, so a slab face is
    ONLY Slab.

Backfill only (edits src/data/fonts.json); harvest.py's classifier is left
unchanged. Idempotent.

Usage:
    python3 backfill_emoji_category.py [path/to/fonts.json]
"""
import json
import os
import sys

SLAB_TAGS = ["/Slab/Humanist", "/Slab/Clarendon", "/Slab/Geometric"]
TAG_THRESHOLD = 50


def is_emoji_font(rec):
    non_menu = [s for s in rec.get("subsets", []) if s != "menu"]
    return non_menu == ["emoji"]


def is_slab_font(rec):
    # Monospace wins over Slab: a slab-tagged typewriter face (Courier Prime,
    # Cutive Mono) is first and foremost a mono face, and Mono is the more
    # useful primary category to browse it under. Without this guard the Slab
    # carve-out below would silently take those families off the Mono card.
    if rec.get("category") == "Mono":
        return False
    tags = rec.get("tags", {})
    return any(tags.get(t, 0) >= TAG_THRESHOLD for t in SLAB_TAGS)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    records = json.load(open(path))
    emoji, slab, restored = [], [], []
    for r in records:
        # Repair records an earlier run moved to Slab before Mono took
        # precedence: the raw API category still says MONOSPACE, so the
        # original category is recoverable.
        if r.get("category") == "Slab" and "MONO" in (r.get("apiCategory") or "").upper():
            r["category"] = "Mono"
            restored.append(r.get("name"))
        # Emoji takes precedence (an emoji font won't also be slab-tagged).
        if is_emoji_font(r):
            if r.get("category") != "Emoji":
                r["category"] = "Emoji"
                emoji.append(r.get("name"))
        elif is_slab_font(r):
            if r.get("category") != "Slab":
                r["category"] = "Slab"
                slab.append(r.get("name"))

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"reclassified {len(emoji)} -> Emoji: {emoji}", file=sys.stderr)
    print(f"reclassified {len(slab)} -> Slab ({len(slab)} families)",
          file=sys.stderr)
    print(f"restored {len(restored)} Mono from Slab: {restored}", file=sys.stderr)


if __name__ == "__main__":
    main()
