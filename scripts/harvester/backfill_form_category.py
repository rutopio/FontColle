#!/usr/bin/env python3
"""Derive the primary Category class from Google's classification tags.

to_dataset.primary_class() maps the Developer API's single `category` field
(SANS_SERIF / SERIF / DISPLAY / HANDWRITING / MONOSPACE) onto our Category
cards. That field is coarser than the classification Google's own site browses
by: the google/fonts tags CSV scores every family against a tree of form tags
(/Sans/Geometric, /Serif/Didone, /Monospace/Monospace, ...), and a family the
API calls DISPLAY is very often tagged /Sans/* or /Serif/* as well.

This recomputes `class` from those tags, keeping the cards mutually exclusive:
a family lands on its single highest-scoring form tag. Ties (24 families, e.g.
Inconsolata scores /Monospace and /Sans both 100) break by FORM_PRIORITY, most
specific first, so a mono face is Mono rather than Sans.

Families with no form tag keep whatever primary_class() derived from `category`.
Absent form tags mean "Google has not scored the letterform", not "this face has
none": Arimo, Darker Grotesque and ~90 other plain sans faces carry only
/Expressive scores, and bucketing those into Display would be plainly wrong.
The API category is the better answer whenever the tag tree is silent.

Graphics is never touched: it comes from a curated name whitelist in
to_dataset.py, not from the tag tree, and some of those families do carry form
tags (Datatype scores /Monospace 100) that would otherwise pull them out. Emoji
faces are part of that whitelist and stay under Graphics.

Run AFTER backfill_tags.py, which is what puts `tags` on each record.
Idempotent.

Usage:
    python3 backfill_form_category.py [path/to/fonts.json]
"""
import json
import os
import sys
from collections import Counter

# Top-level tag-tree groups that describe letterform, in decreasing specificity.
# A tie at the top score resolves to the earliest entry here: Slab beats Serif
# (Bevan), Serif beats Script (Kurale).
#
# /Monospace is deliberately absent. Advance width is not a letterform, and
# Google's own tag tree keeps the two orthogonal: 46 of the 58 families it tags
# /Monospace also carry a /Sans, /Serif, /Slab or /Script tag (Roboto Mono is
# Sans AND mono, Courier Prime is Slab AND mono, Xanh Mono is Serif AND mono).
# Spacing is a facet of its own — see fontSpacing() in src/lib/fonts/filter/
# facets.ts, which the Proportional/Monospaced filter reads.
FORM_PRIORITY = ["Slab", "Serif", "Sans", "Script"]

# Tag-tree group -> the Category class we show. Only the name differs.
CLASS_OF = {
    "Slab": "Slab",
    "Serif": "Serif",
    "Sans": "Sans",
    "Script": "Script",
}

# Decorative tags that place an otherwise unclassifiable face in Display. Only
# consulted for families Google gave no letterform tag at all: a pixel or
# terminal face (VT323, Sixtyfour, Doto) is a display face, whereas a plain
# coding face with no tags (Geist Mono, PT Mono) is closer to Sans.
DISPLAY_THEME_TAGS = ["/Theme/Pixel", "/Theme/Techno"]
DISPLAY_THEME_MIN = 50

# Classes assigned by name whitelist rather than by tags; left as-is.
CURATED = {"Graphics"}

# A tag counts towards its group at any positive score, matching what Google's
# own site lists and the FORM_TAG_THRESHOLD the Style pills now use. (Mood pills
# keep a 50 threshold, but no Mood tag ever decides a Category class.)
MIN_SCORE = 1


def form_class(rec):
    """The Category class from the record's highest-scoring form tag, or None
    when Google scored no form tag for it (caller keeps the existing class)."""
    best = {}
    for path, score in (rec.get("tags") or {}).items():
        parts = path.split("/")
        if len(parts) < 2:
            continue
        group = parts[1]
        if group in CLASS_OF and score >= MIN_SCORE:
            best[group] = max(best.get(group, 0), score)
    if not best:
        return None
    top = max(best.values())
    for group in FORM_PRIORITY:
        if best.get(group) == top:
            return CLASS_OF[group]
    return None


def untagged_mono_class(rec):
    """Where a family Google tagged ONLY /Monospace belongs once Mono is no
    longer a Category class. Decorative pixel/terminal faces read as Display;
    plain coding faces have no letterform signal at all and default to Sans."""
    tags = rec.get("tags") or {}
    if any(tags.get(t, 0) >= DISPLAY_THEME_MIN for t in DISPLAY_THEME_TAGS):
        return "Display"
    return "Sans"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    records = json.load(open(path))
    if not any(r.get("tags") for r in records):
        raise SystemExit("no record carries tags; run backfill_tags.py first")

    moves = Counter()
    changed = 0
    for r in records:
        if r.get("category") in CURATED:
            continue
        want = form_class(r)
        # No form tag: Google has not scored the letterform, so primary_class()'s
        # reading of the raw API category stands — except for a family still
        # sitting on the retired "Mono" class, which has to land somewhere.
        if want is None:
            if r.get("category") != "Mono":
                continue
            want = untagged_mono_class(r)
        if r.get("category") != want:
            moves[f"{r.get('category')} -> {want}"] += 1
            r["category"] = want
            changed += 1

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    counts = Counter(r["category"] for r in records if r.get("isPublished"))
    print(f"reclassified {changed} records", file=sys.stderr)
    for move, n in moves.most_common():
        print(f"  {move}: {n}", file=sys.stderr)
    print("published category counts:", file=sys.stderr)
    for cat, n in counts.most_common():
        print(f"  {cat}: {n}", file=sys.stderr)


if __name__ == "__main__":
    main()
