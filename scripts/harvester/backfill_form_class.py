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

Graphics and Emoji are never touched: they come from a curated name whitelist
in to_dataset.py, not from the tag tree, and some of them do carry form tags
(Datatype scores /Monospace 100) that would otherwise pull them out.

Run AFTER backfill_tags.py, which is what puts `tags` on each record.
Idempotent.

Usage:
    python3 backfill_form_class.py [path/to/fonts.json]
"""
import json
import os
import sys
from collections import Counter

# Top-level tag-tree groups that describe letterform, in decreasing specificity.
# A tie at the top score resolves to the earliest entry here: Monospace beats
# Sans (Inconsolata), Slab beats Serif (Bevan), Serif beats Script (Kurale).
FORM_PRIORITY = ["Monospace", "Slab", "Serif", "Sans", "Script"]

# Tag-tree group -> the Category class we show. Only the name differs.
CLASS_OF = {
    "Monospace": "Mono",
    "Slab": "Slab",
    "Serif": "Serif",
    "Sans": "Sans",
    "Script": "Script",
}

# Classes assigned by name whitelist rather than by tags; left as-is.
CURATED = {"Graphics", "Emoji"}

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
        if r.get("class") in CURATED:
            continue
        want = form_class(r)
        # No form tag: Google has not scored the letterform, so primary_class()'s
        # reading of `category` stands.
        if want is None:
            continue
        if r.get("class") != want:
            moves[f"{r.get('class')} -> {want}"] += 1
            r["class"] = want
            changed += 1

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    counts = Counter(r["class"] for r in records if r.get("isPublished"))
    print(f"reclassified {changed} records", file=sys.stderr)
    for move, n in moves.most_common():
        print(f"  {move}: {n}", file=sys.stderr)
    print("published class counts:", file=sys.stderr)
    for cls, n in counts.most_common():
        print(f"  {cls}: {n}", file=sys.stderr)


if __name__ == "__main__":
    main()
