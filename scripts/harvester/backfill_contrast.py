#!/usr/bin/env python3
"""One-shot backfill of the `contrast` field onto src/data/fonts.json.

Google Fonts publishes machine-measured stroke widths in the google/fonts repo
as `tags/all/quant.csv` (per family, per weight: /quant/stroke_width_min and
/quant/stroke_width_max in font units). This is NOT exposed by the Developer API
and we don't harvest it from the TTFs.

Contrast ratio = stroke_width_max / stroke_width_min at the regular weight
(wght@400, or the nearest available weight when @400 is absent). It is
weight-independent, so one honest number per family: ~1.0 for monolinear
(sans, mono, brush), rising toward ~3+ for high-contrast Didone/display serifs.

Families absent from quant.csv (or with a zero/absent min) get `contrast: null`.

Usage:
    python3 backfill_contrast.py [path/to/fonts.json]
"""
import csv
import io
import json
import os
import re
import sys
import urllib.request

QUANT_CSV = "https://raw.githubusercontent.com/google/fonts/main/tags/all/quant.csv"

# The row axis-position is like "wght@400"; pull the weight out for @400 pick.
_WGHT = re.compile(r"wght@(\d+)")


def fetch_stroke_widths():
    """family name -> {weight: {"min": float, "max": float}}, from quant.csv.

    Rows are `Family,wght@NNN,/quant/stroke_width_(min|max),value`.
    """
    req = urllib.request.Request(QUANT_CSV, headers={"User-Agent": "font-harvester/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read().decode("utf-8")

    out = {}
    for row in csv.reader(io.StringIO(data)):
        if len(row) < 4:
            continue
        family, pos, metric, value = row[0], row[1], row[2], row[3]
        m = _WGHT.search(pos)
        if not family or not m:
            continue
        if metric == "/quant/stroke_width_min":
            key = "min"
        elif metric == "/quant/stroke_width_max":
            key = "max"
        else:
            continue
        try:
            v = float(value)
        except ValueError:
            continue
        weight = int(m.group(1))
        out.setdefault(family, {}).setdefault(weight, {})[key] = v
    return out


def contrast_for(by_weight):
    """Contrast ratio at the regular weight, or None.

    Prefer wght@400; otherwise the weight nearest 400 that carries both a
    non-zero min and a max.
    """
    usable = {
        w: d
        for w, d in by_weight.items()
        if d.get("min", 0) > 0 and "max" in d
    }
    if not usable:
        return None
    weight = min(usable, key=lambda w: abs(w - 400))
    d = usable[weight]
    return round(d["max"] / d["min"], 2)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    print("fetching google/fonts quant.csv…", file=sys.stderr)
    by_family = fetch_stroke_widths()
    print(f"  {len(by_family)} families have stroke-width data", file=sys.stderr)

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    hits = 0
    for r in records:
        c = contrast_for(by_family.get(r.get("name"), {}))
        r["contrast"] = c
        if c is not None:
            hits += 1

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"set contrast on {hits}/{len(records)} records -> {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
