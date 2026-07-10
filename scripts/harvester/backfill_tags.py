#!/usr/bin/env python3
"""One-shot backfill of the `tags` field onto src/data/fonts.json.

Google Fonts classifies each family along several axes (Serif/Didone,
Sans/Geometric, Expressive/..., Quality/...) via human/ML rating, published in
the google/fonts repo as a CSV, not exposed by the Developer API. This
backfills `tags: {"<full tag path>": score}` per family (0-100 scores) so
upcoming classification filters can use it, without a full reharvest.

Families absent from the CSV get `{}` (no ratings collected yet, e.g. very
recent additions).

Usage:
    python3 backfill_tags.py [path/to/fonts.json]
"""
import csv
import io
import json
import os
import sys
import urllib.request

TAGS_CSV = "https://raw.githubusercontent.com/google/fonts/main/tags/all/families.csv"


def fetch_tags():
    """family name -> {tag_path: score}, from the google/fonts tags CSV.

    Rows are `Family,,/Group/Tag,score` (the second column is always empty).
    """
    req = urllib.request.Request(TAGS_CSV, headers={"User-Agent": "font-harvester/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read().decode("utf-8")

    out = {}
    for row in csv.reader(io.StringIO(data)):
        if len(row) < 4:
            continue
        family, _blank, tag, score = row[0], row[1], row[2], row[3]
        if not family or not tag:
            continue
        val = float(score)
        out.setdefault(family, {})[tag] = int(val) if val.is_integer() else val
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    print("fetching google/fonts tags…", file=sys.stderr)
    by_family = fetch_tags()
    print(f"  {len(by_family)} families have tags", file=sys.stderr)

    records = json.load(open(path))
    hits = 0
    for r in records:
        tags = by_family.get(r.get("name"), {})
        r["tags"] = tags
        if tags:
            hits += 1

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"set tags on {hits}/{len(records)} records -> {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
