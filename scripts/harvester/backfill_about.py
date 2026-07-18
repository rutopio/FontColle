#!/usr/bin/env python3
"""Backfill the family "about" description and per-designer bios on
src/data/fonts.json, from the Google Fonts metadata endpoint.

Google Fonts serves, per family, an "about" page (/specimen/<Family>/about) whose
prose and designer biographies aren't in the google/fonts repo or the Developer
API. They live at:

    https://fonts.google.com/metadata/fonts/<Family+Name>

The response is JSON guarded by an XSSI prefix `)]}'` on the first line. We take:
  - description         -> about (HTML string | null)
  - designers[].{name,bio,imageUrl} -> designerProfiles (JSON array)

Independent backfill: a full reharvest drops these two fields (they're not in the
repo/TTF), so re-run this after any reharvest. Idempotent, only rewrites the two
fields, safe to resume.

Usage:
    python3 backfill_about.py [path/to/fonts.json] [--limit N]
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

META = "https://fonts.google.com/metadata/fonts/"
XSSI = ")]}'"


def fetch_meta(name, retries=3):
    """Fetch + parse one family's metadata JSON, or None on hard failure."""
    url = META + urllib.parse.quote(name.replace(" ", "+"), safe="+")
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "font-harvester"})
            with urllib.request.urlopen(req, timeout=30) as r:
                if r.status == 404:
                    return None
                text = r.read().decode("utf-8")
            if text.startswith(XSSI):
                text = text[len(XSSI):]
            return json.loads(text)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            last = e
        except Exception as e:
            last = e
        time.sleep(1.0 * (attempt + 1))
    print(f"  ERR {name}: {last}", file=sys.stderr)
    return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    limit = None
    for a in sys.argv[1:]:
        if a.startswith("--limit"):
            limit = int(a.split("=", 1)[1]) if "=" in a else int(sys.argv[sys.argv.index(a) + 1])

    path = args[0] if args else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    records = json.load(open(path))
    targets = records[:limit] if limit else records

    changed = 0
    for i, r in enumerate(targets):
        name = r.get("name")
        if not name:
            continue
        meta = fetch_meta(name)
        if meta is None:
            about = None
            profiles = []
        else:
            about = meta.get("description") or None
            profiles = [
                {
                    "name": d.get("name"),
                    "bio": d.get("bio") or None,
                    "imageUrl": d.get("imageUrl") or None,
                }
                for d in (meta.get("designers") or [])
            ]
        if r.get("about") != about or r.get("designerProfiles") != profiles:
            changed += 1
        r["about"] = about
        r["designerProfiles"] = profiles
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(targets)} …", file=sys.stderr)
        time.sleep(0.15)  # gentle throttle

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"about/profiles updated on {changed}/{len(targets)} records -> {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
