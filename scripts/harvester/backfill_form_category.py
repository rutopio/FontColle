#!/usr/bin/env python3
"""Derive Category from Google's classification tags (run after backfill_tags.py).

Picks the highest-scoring form tag per family; ties break by FORM_PRIORITY.
Families with no form tag keep the API-derived category. Graphics is never touched.

    python3 backfill_form_category.py [path/to/fonts.json]
"""
import json
import os
import sys
from collections import Counter

# Letterform groups in tie-break order. /Monospace excluded (spacing is orthogonal).
FORM_PRIORITY = ["Slab", "Serif", "Sans", "Script"]

CLASS_OF = {
    "Slab": "Slab",
    "Serif": "Serif",
    "Sans": "Sans",
    "Script": "Script",
}

DISPLAY_THEME_TAGS = ["/Theme/Pixel", "/Theme/Techno"]
DISPLAY_THEME_MIN = 50

MONOSPACE_TAG = "/Monospace/Monospace"
CURATED = {"Graphics"}
MIN_SCORE = 1


def form_class(rec):
    """Highest-scoring form tag -> class, or None."""
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


def is_mono_only(rec):
    """Tagged /Monospace with no letterform tag."""
    tags = rec.get("tags") or {}
    return tags.get(MONOSPACE_TAG, 0) >= MIN_SCORE and form_class(rec) is None


def untagged_mono_class(rec):
    """Pixel/terminal -> Display; otherwise -> Sans."""
    tags = rec.get("tags") or {}
    if any(tags.get(t, 0) >= DISPLAY_THEME_MIN for t in DISPLAY_THEME_TAGS):
        return "Display"
    return "Sans"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    if not any(r.get("tags") for r in records):
        raise SystemExit("no record carries tags; run backfill_tags.py first")

    moves = Counter()
    changed = 0
    for r in records:
        if r.get("category") in CURATED:
            continue
        want = form_class(r)
        if want is None:
            if not is_mono_only(r):
                continue
            want = untagged_mono_class(r)
        if r.get("category") != want:
            moves[f"{r.get('category')} -> {want}"] += 1
            r["category"] = want
            changed += 1

    with open(path, "w", encoding="utf-8") as fh:
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
