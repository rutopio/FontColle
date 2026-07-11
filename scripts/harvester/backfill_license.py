#!/usr/bin/env python3
"""Backfill the per-family license copyright header on src/data/fonts.json.

Google Fonts' /specimen/<Family>/license page shows the family's full license
file (OFL.txt / LICENSE.txt / UFL.txt in google/fonts). Those files are almost
entirely a fixed boilerplate shared across every family under the same license;
the only per-family part is the leading "Copyright ..." paragraph in OFL files.
Apache and UFL files carry no per-family header at all (pure boilerplate).

So we store just the OFL copyright header here, and the frontend prepends it to
the shared boilerplate it ships as a constant. This avoids storing ~4.5 KB of
duplicated license text on all ~2000 families.

  ofl   -> ofl/<dir>/OFL.txt,     header = text before "This Font Software..."
  apache-> apache/<dir>/LICENSE.txt, no header (licenseHeader = null)
  ufl   -> ufl/<dir>/UFL.txt,      no header (licenseHeader = null)

Independent backfill: a full reharvest drops licenseHeader, so re-run after one.

Usage:
    python3 backfill_license.py [path/to/fonts.json] [--limit N]
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
        except Exception:
            pass
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

    path = args[0] if args else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    records = json.load(open(path))
    targets = records[:limit] if limit else records

    changed = 0
    for i, r in enumerate(targets):
        # Only OFL files carry a per-family header; Apache/UFL are pure
        # boilerplate, so leave licenseHeader null for them.
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

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(
        f"license headers updated on {changed}/{len(targets)} records -> {path}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
