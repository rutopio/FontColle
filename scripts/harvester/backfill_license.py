#!/usr/bin/env python3
"""Backfill OFL copyright headers (Apache/UFL are pure boilerplate -> null).

    python3 backfill_license.py [path/to/fonts.json] [--ids=a,b,c]
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

RAW = "https://raw.githubusercontent.com/google/fonts/main"
OFL_MARKER = "This Font Software is licensed"


def fetch_text(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "font-harvester"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
        except Exception as e:
            print(f"  warn: {url} attempt {attempt+1} failed: {e}", file=sys.stderr)
        time.sleep(1.0 * (attempt + 1))
    return None


def ofl_header(text):
    """The per-family copyright paragraph of an OFL file, or None."""
    i = text.find(OFL_MARKER)
    if i <= 0:
        return None
    header = text[:i].lstrip("﻿").strip()
    return header or None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    limit = None
    for a in sys.argv[1:]:
        if a.startswith("--limit"):
            limit = (
                int(a.split("=", 1)[1])
                if "=" in a
                else int(sys.argv[sys.argv.index(a) + 1])
            )

    ids = None
    for a in sys.argv[1:]:
        if a.startswith("--ids="):
            ids = {s for s in a.split("=", 1)[1].split(",") if s}

    path = args[0] if args else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    if ids is not None:
        targets = [r for r in records if r["id"] in ids]
    else:
        targets = records[:limit] if limit else records

    changed = 0
    for i, r in enumerate(targets):
        header = None
        if r.get("licenseDir") == "ofl":
            url = f"{RAW}/ofl/{r['id']}/OFL.txt"
            text = fetch_text(url)
            if text:
                header = ofl_header(text)
        if r.get("licenseHeader") != header:
            changed += 1
        r["licenseHeader"] = header
        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{len(targets)} …", file=sys.stderr)
        time.sleep(0.1)

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(
        f"license headers updated on {changed}/{len(targets)} records -> {path}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
