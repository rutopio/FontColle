#!/usr/bin/env python3
"""One-shot backfill of the `displayName` field onto src/data/fonts.json.

Google Fonts' full specimen title (e.g. "Playwrite België Vlaanderen" for the
family "Playwrite BE VLG") only exists in the unofficial metadata batch endpoint
as `displayName`; it is absent from the Developer API, METADATA.pb, and the TTF
name table, so the harvester never captured it. This backfills it in place so
search can match it, without a full reharvest.

Sets displayName only where it differs from the family name; null otherwise.

Usage:
    python3 backfill_display_names.py [path/to/fonts.json]
"""
import json, os, sys, urllib.request

METADATA = "https://fonts.google.com/metadata/fonts"


def fetch_display_names():
    """family name -> displayName, only where displayName differs from the name."""
    req = urllib.request.Request(METADATA, headers={"User-Agent": "font-harvester/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    out = {}
    for f in data.get("familyMetadataList", []):
        fam, dn = f.get("family"), f.get("displayName")
        if fam and dn and dn != fam:
            out[fam] = dn
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    print("fetching display names…", file=sys.stderr)
    names = fetch_display_names()
    print(f"  {len(names)} families have a distinct display name", file=sys.stderr)

    records = json.load(open(path))
    hits = 0
    for r in records:
        dn = names.get(r.get("name"))
        r["displayName"] = dn
        if dn:
            hits += 1

    with open(path, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    print(f"set displayName on {hits}/{len(records)} records → {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
