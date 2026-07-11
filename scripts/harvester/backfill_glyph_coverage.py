#!/usr/bin/env python3
"""One-shot derivation of per-font Unicode coverage for the Glyphs page.

For every family in src/data/fonts.json, read the primary TTF's cmap from the
local ttf_cache and write the set of Basic-Multilingual-Plane codepoints it
contains to public/glyphs/<id>.json, run-length encoded as ranges:

    {"ranges": [[65, 90], [97, 122], ...]}

The frontend maps these ranges onto Unicode blocks (unicode-blocks.ts) to build
the block list and the per-block grid — so a Latin font lists only Latin blocks
and a CJK font lists CJK Unified Ideographs with its tens of thousands of cps.

Ranges (not a flat list) keep Noto CJK files small: contiguous runs collapse to
one [start, end] pair.

Independent backfill — a full reharvest would drop these files, per the
reharvest-drops-backfills rule; re-run this after any reharvest.

Usage:
    python3 backfill_glyph_coverage.py            # all fonts
    python3 backfill_glyph_coverage.py lato notosanstc   # only these ids
"""
import glob
import json
import os
import sys

from fontTools.ttLib import TTFont

HERE = os.path.dirname(__file__)
CACHE = os.path.join(HERE, "ttf_cache")
FONTS_JSON = os.path.abspath(
    os.path.join(HERE, "..", "..", "src", "data", "fonts.json")
)
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "..", "public", "glyphs"))

BMP_MAX = 0xFFFF


def cache_path(rec):
    """Locate a family's primary TTF in the cache. The cache dir mirrors
    {licenseDir}/{familyDir}/{primaryTtf}; familyDir usually equals the id, but
    fall back to a glob on the filename if it does not."""
    direct = os.path.join(CACHE, rec["licenseDir"], rec["id"], rec["primaryTtf"])
    if os.path.exists(direct):
        return direct
    hits = glob.glob(
        os.path.join(CACHE, rec["licenseDir"], "*", rec["primaryTtf"])
    )
    return hits[0] if hits else None


def bmp_ranges(path):
    """Sorted BMP codepoints of the font's best cmap, run-length encoded."""
    font = TTFont(path, lazy=True)
    try:
        cmap = font.getBestCmap()
    finally:
        font.close()
    cps = sorted(cp for cp in cmap if cp <= BMP_MAX)
    ranges = []
    for cp in cps:
        if ranges and cp == ranges[-1][1] + 1:
            ranges[-1][1] = cp
        else:
            ranges.append([cp, cp])
    return ranges


def main():
    only = set(sys.argv[1:])
    records = json.load(open(FONTS_JSON))
    if only:
        records = [r for r in records if r["id"] in only]

    os.makedirs(OUT_DIR, exist_ok=True)
    written = missing = empty = 0
    for r in records:
        path = cache_path(r)
        if not path:
            missing += 1
            print(f"  MISS cache: {r['id']}", file=sys.stderr)
            continue
        ranges = bmp_ranges(path)
        if not ranges:
            empty += 1
        with open(os.path.join(OUT_DIR, f"{r['id']}.json"), "w") as fh:
            json.dump({"ranges": ranges}, fh, separators=(",", ":"))
        written += 1

    print(
        f"glyph coverage: wrote {written}, missing-cache {missing}, empty {empty}"
        f" -> {OUT_DIR}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
