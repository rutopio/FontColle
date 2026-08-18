#!/usr/bin/env python3
"""Harvest API-only families (not in the repo) via gstatic URLs.

    GOOGLE_FONTS_API_KEY=... python3 harvest_api.py [harvest_output.json]
"""
import json
import os
import re
import sys
import urllib.request

import harvest
import langcov

API = "https://www.googleapis.com/webfonts/v1/webfonts"

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
    primary_url = files.get("regular") or next(iter(files.values()), None)
    if not primary_url:
        return None
    primary_url = primary_url.replace("http://", "https://")

    raw = harvest.fetch(primary_url, binary=True)
    parsed = harvest.parse_ttf(raw)
    cmap_chars = parsed.pop("_cmap_chars", set())

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

    return {
        "family_dir": family_dir(name),
        "license_dir": None,  # unknown from the API
        "name": name,
        "designer": None,
        "category": item.get("category"),
        "license": None,
        "subsets": subsets,
        "date_added": None,  # falls back to firstCommitDate in to_dataset
        "primary_script": None,
        "fonts": [],
        "primary_ttf": None,
        "ttf": parsed,
        "languages": langs,
        "scripts": scripts,
        "cjk_coverage": cjk,
        "_source": "api",
    }


