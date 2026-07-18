#!/usr/bin/env python3
"""Supplemental harvester for families served by the Google Fonts API but absent
from the google/fonts GitHub repo main branch (e.g. Google Sans, the newer Edu
Hand fonts).

harvest.py can only see what's in the repo, so these never get harvested. Here we
pull the TTF straight from the API's gstatic URLs and reuse harvest.parse_ttf /
langcov.coverage to emit the SAME raw-record shape, then merge into
stress_output.json. Icon families (Material Icons/Symbols) are excluded, they're
not text faces and Google lists them separately.

Requires GOOGLE_FONTS_API_KEY.

Usage:
    GOOGLE_FONTS_API_KEY=... python3 harvest_api.py [stress_output.json]
"""
import json, os, re, sys, urllib.request

import harvest
import langcov

API = "https://www.googleapis.com/webfonts/v1/webfonts"

# API families that aren't in the repo and that we don't want (icon fonts).
EXCLUDE_PREFIXES = ("Material Icons", "Material Symbols")


def family_dir(name):
    """Synthesize a stable repo-style dir key from a display name."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "font-harvester/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def build_record(item):
    """Build a harvest.py-shaped raw record from one API family item."""
    name = item["family"]
    files = item.get("files", {})
    # Prefer the upright 'regular' file; VF families expose the whole range there.
    primary_url = files.get("regular") or next(iter(files.values()), None)
    if not primary_url:
        return None
    primary_url = primary_url.replace("http://", "https://")

    raw = harvest.fetch(primary_url, binary=True)
    parsed = harvest.parse_ttf(raw)
    cmap_chars = parsed.pop("_cmap_chars", set())

    # Merge italic instances if a separate italic VF exists.
    instances = [{**i, "italic": False} for i in parsed.get("named_instances", [])]
    italic_url = files.get("italic")
    if italic_url:
        try:
            iraw = harvest.fetch(italic_url.replace("http://", "https://"), binary=True)
            iparsed = harvest.parse_ttf(iraw)
            cmap_chars |= iparsed.pop("_cmap_chars", set())
            instances += [{**i, "italic": True} for i in iparsed.get("named_instances", [])]
        except Exception as e:
            print(f"  warn: italic parse failed for {name}: {e}", file=sys.stderr)
    parsed["named_instances"] = instances

    subsets = item.get("subsets", [])
    langs, scripts, cjk = langcov.coverage(cmap_chars, subsets)

    # API category maps straight into to_dataset.primary_class (it upper-cases
    # and substring-matches "SANS"/"HANDWRITING"/etc).
    return {
        "family_dir": family_dir(name),
        "license_dir": None,  # unknown from the API
        "name": name,
        "designer": None,     # API doesn't expose designer
        "category": item.get("category"),
        "license": None,
        "subsets": subsets,
        "date_added": item.get("lastModified"),
        "primary_script": None,
        "fonts": [],          # VF: derive_weights uses the wght axis
        "primary_ttf": None,
        "ttf": parsed,
        "languages": langs,
        "scripts": scripts,
        "cjk_coverage": cjk,
        "_source": "api",
    }


def main():
    api_key = os.environ.get("GOOGLE_FONTS_API_KEY", "")
    if not api_key:
        print("error: set GOOGLE_FONTS_API_KEY", file=sys.stderr)
        sys.exit(1)

    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "stress_output.json"
    )
    existing = json.load(open(out)) if os.path.exists(out) else []
    have_dirs = {r.get("family_dir") for r in existing}
    have_names = {(r.get("name") or "").lower() for r in existing}

    # VF capability so single-file variable families come back whole.
    api = fetch_json(f"{API}?key={api_key}&capability=VF&sort=popularity")

    supplement = []
    for it in api.get("items", []):
        name = it["family"]
        if name.startswith(EXCLUDE_PREFIXES):
            continue
        if name.lower() in have_names or family_dir(name) in have_dirs:
            continue
        supplement.append(it)

    print(f"{len(supplement)} API families to supplement:", file=sys.stderr)
    added = []
    for it in supplement:
        try:
            rec = build_record(it)
            if rec:
                added.append(rec)
                print(f"  ok {it['family']}", file=sys.stderr)
        except Exception as e:
            print(f"  ERR {it['family']}: {e}", file=sys.stderr)

    merged = existing + added
    json.dump(merged, open(out, "w"), indent=2, default=str, ensure_ascii=False)
    print(f"added {len(added)} families; {out} now has {len(merged)}", file=sys.stderr)


if __name__ == "__main__":
    main()
