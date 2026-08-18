#!/usr/bin/env python3
"""Fetch published-family signals (popularity, trending, lastModified) from the GF API.

    GOOGLE_FONTS_API_KEY=... python3 fetch_published.py [out.json]
"""
import json
import os
import sys
import urllib.request

API = "https://www.googleapis.com/webfonts/v1/webfonts"
METADATA = "https://fonts.google.com/metadata/fonts"


def fetch_sorted(api_key, sort):
    """Return the API's family list for a given sort, in order."""
    url = f"{API}?key={api_key}&sort={sort}"
    req = urllib.request.Request(url, headers={"User-Agent": "font-harvester/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data.get("items", [])


def fetch_family_metadata():
    """Unofficial endpoint: displayName + boolean flags not in the Developer API."""
    req = urllib.request.Request(METADATA, headers={"User-Agent": "font-harvester/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    return {f["family"]: f for f in data.get("familyMetadataList", []) if f.get("family")}


def main():
    api_key = os.environ.get("GOOGLE_FONTS_API_KEY", "")
    if not api_key:
        print("error: set the GOOGLE_FONTS_API_KEY env var", file=sys.stderr)
        print("  get a free key at https://console.cloud.google.com/", file=sys.stderr)
        sys.exit(1)

    print("fetching published families (popularity)…", file=sys.stderr)
    by_pop = fetch_sorted(api_key, "popularity")
    print("fetching trending order…", file=sys.stderr)
    by_trend = fetch_sorted(api_key, "trending")
    print("fetching family metadata (display names + flags)…", file=sys.stderr)
    fam_meta = fetch_family_metadata()

    pop_rank = {it["family"]: i + 1 for i, it in enumerate(by_pop)}
    trend_rank = {it["family"]: i + 1 for i, it in enumerate(by_trend)}

    out_map = {}
    for it in by_pop:
        name = it["family"]
        meta = fam_meta.get(name, {})
        dn = meta.get("displayName")
        out_map[name] = {
            "popularity": pop_rank.get(name),
            "trending": trend_rank.get(name),
            "lastModified": it.get("lastModified"),
            "category": it.get("category"),
            "variants": len(it.get("variants", [])),
            "displayName": dn if dn and dn != name else None,
            "isNoto": meta.get("isNoto"),
            "isBrandFont": meta.get("isBrandFont"),
            "isOpenSource": meta.get("isOpenSource"),
            "colorCapabilities": meta.get("colorCapabilities"),
        }

    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "published.json"
    )
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(out_map, fh, indent=2, ensure_ascii=False)

    print(f"saved {len(out_map)} published families → {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
