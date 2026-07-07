#!/usr/bin/env python3
"""Transform raw harvest output into the frontend dataset shape.

Reads stress_output.json / harvest_output.json (list of raw records) and emits
public/fonts.json: a compact array the MVP frontend reads directly. Also derives
the §12 facets (variable, has-italic, axis facets, feature facets, script coverage).
"""
import json, os, sys

# Human-friendly feature labels for the ones we surface as facets
FEATURE_FACETS = {
    "smcp": "small-caps", "c2sc": "small-caps",
    "dlig": "discretionary-ligatures", "hlig": "historical-ligatures",
    "liga": "ligatures", "frac": "fractions", "tnum": "tabular-figures",
    "onum": "oldstyle-figures", "zero": "slashed-zero", "case": "case-sensitive",
    "salt": "stylistic-alternates", "titl": "titling",
}
AXIS_FACETS = {
    "wght": "weight-axis", "wdth": "width-axis", "opsz": "optical-size-axis",
    "slnt": "slant-axis", "ital": "italic-axis", "GRAD": "grade-axis",
}

def primary_class(cat):
    c = (cat or "").upper()
    if "SERIF" in c and "SANS" not in c: return "Serif"
    if "SANS" in c: return "Sans"
    if "MONO" in c: return "Mono"
    if "DISPLAY" in c: return "Display"
    if "HANDWRITING" in c or "SCRIPT" in c: return "Script"
    return "Sans"

# Standard weight steps we expose as filter pills. A variable wght axis "covers"
# every step inside [min, max]; a static family contributes its distinct
# per-file weights snapped to the nearest step.
WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900]


def snap_weight(w):
    """Snap an arbitrary usWeightClass to the nearest standard 100 step."""
    if w is None:
        return None
    return min(WEIGHT_STEPS, key=lambda s: abs(s - w))


def derive_weights(r, ttf, axes):
    """The set of standard weight steps this family offers.

    Variable: all steps inside the wght axis range. Static: the distinct
    per-file weights from METADATA, snapped. Fallback: the primary weight_class.
    """
    steps = set()
    wght = next((a for a in axes if a["tag"] == "wght"), None)
    if wght and wght.get("min") is not None and wght.get("max") is not None:
        lo, hi = wght["min"], wght["max"]
        steps.update(s for s in WEIGHT_STEPS if lo <= s <= hi)
    for fo in r.get("fonts", []) or []:
        s = snap_weight(fo.get("weight"))
        if s is not None:
            steps.add(s)
    if not steps:
        s = snap_weight(ttf.get("weight_class"))
        if s is not None:
            steps.add(s)
    return sorted(steps)


def to_record(r):
    ttf = r.get("ttf", {}) or {}
    axes = ttf.get("axes", [])
    gsub = set(ttf.get("gsub_features", []))
    instances = ttf.get("named_instances", [])
    subsets = r.get("subsets", []) or []

    facets = []
    facets.append("variable" if ttf.get("is_variable") else "static")
    if any("ital" in (i.get("name", "") or "").lower() for i in instances) \
       or any(a["tag"] in ("ital", "slnt") for a in axes):
        facets.append("has-italic")
    for a in axes:
        f = AXIS_FACETS.get(a["tag"])
        if f and f not in facets:
            facets.append(f)
    for feat in gsub:
        f = FEATURE_FACETS.get(feat)
        if f and f not in facets:
            facets.append(f)
    # script coverage from subsets
    if "latin" in subsets: facets.append("latin")
    if any(s.startswith("chinese") or s in ("japanese", "korean") for s in subsets):
        facets.append("cjk")
    for s in ("arabic", "cyrillic", "greek", "hebrew", "thai", "devanagari"):
        if s in subsets:
            facets.append(s)

    panose = ttf.get("panose")
    return {
        "id": r["family_dir"],
        "name": r.get("name") or r["family_dir"],
        "designer": r.get("designer"),
        "class": primary_class(r.get("category")),
        "category": r.get("category"),
        "license": r.get("license"),
        "licenseDir": r.get("license_dir"),
        "isVariable": bool(ttf.get("is_variable")),
        "subsets": subsets,
        "primaryTtf": r.get("primary_ttf"),
        # archival metadata (flat)
        "version": ttf.get("version"),
        "versionString": ttf.get("version_string"),
        "createdMs": ttf.get("created_ms"),
        "modifiedMs": ttf.get("modified_ms"),
        "dateAdded": r.get("date_added"),
        "weightClass": ttf.get("weight_class"),
        "widthClass": ttf.get("width_class"),
        "weights": derive_weights(r, ttf, axes),
        "fsType": ttf.get("fs_type"),
        "glyphCount": ttf.get("glyph_count"),
        "charCount": ttf.get("char_count"),
        "unitsPerEm": ttf.get("units_per_em"),
        "hasStat": bool(ttf.get("has_stat")),
        "primaryScript": r.get("primary_script"),
        "panose": ",".join(str(x) for x in panose) if panose else None,
        "axes": [
            {"tag": a["tag"], "name": a.get("name"),
             "min": a.get("min"), "default": a.get("default"), "max": a.get("max")}
            for a in axes
        ],
        "instances": [
            {"name": i.get("name"), "coords": i.get("coords", {}),
             "italic": bool(i.get("italic"))}
            for i in instances
        ],
        "features": sorted(gsub | set(ttf.get("gpos_features", []))),
        "facets": sorted(set(facets)),
        # Writing-system / language coverage (computed in harvest via gflanguages).
        "languages": r.get("languages", []) or [],
        "scripts": r.get("scripts", []) or [],
        "cjkCoverage": r.get("cjk_coverage", {}) or {},
    }

def write_label_maps(records, out):
    """Emit compact code->human-name maps for the scripts/languages the catalog
    actually uses, so the frontend renders human labels without shipping
    gflanguages. Written next to the dataset (scripts.json / languages.json)."""
    import os

    import langcov

    used_scripts = {s for r in records for s in r.get("scripts", [])}
    used_langs = {l for r in records for l in r.get("languages", [])}
    smap = langcov.script_label_map()
    lmap = langcov.language_label_map()
    scripts_out = {c: smap.get(c, c) for c in sorted(used_scripts)}
    langs_out = {l: lmap[l] for l in sorted(used_langs) if l in lmap}
    d = os.path.dirname(out) or "."
    json.dump(scripts_out, open(os.path.join(d, "scripts.json"), "w"),
              indent=2, ensure_ascii=False)
    json.dump(langs_out, open(os.path.join(d, "languages.json"), "w"),
              indent=2, ensure_ascii=False)
    print(f"wrote {len(scripts_out)} scripts, {len(langs_out)} languages to {d}")


def load_published_map():
    """Load the published-family signals (from fetch_published.py).

    Returns a dict keyed by lowercase display name → {popularity, trending,
    lastModified, ...}, or None if the file doesn't exist (all families treated
    as published, with no ranking signals).
    """
    path = os.path.join(os.path.dirname(__file__), "published.json")
    if not os.path.exists(path):
        return None
    raw = json.load(open(path))
    return {name.lower(): sig for name, sig in raw.items()}


def apply_specimens(records):
    """Set a per-font specimen string in the font's own script, matching how
    Google Fonts previews non-Latin families. Uses gflanguages sample text keyed
    by the font's primary (or first non-Latin) script. Latin-only fonts get None
    so the frontend keeps its English UDHR default."""
    import langcov

    by_script = langcov.specimen_by_script()
    # Cache per-language CJK specimens once.
    by_lang = {
        subset: langcov.specimen_for_lang(lang)
        for subset, lang in langcov.SUBSET_TO_SPECIMEN_LANG.items()
    }
    filled = 0
    for r in records:
        subsets = r.get("subsets") or []
        # Emoji fonts (only non-menu subset is "emoji") preview as emoji, like
        # Google Fonts, not any linguistic sample.
        non_menu = [s for s in subsets if s != "menu"]
        if non_menu == ["emoji"]:
            r["specimen"] = langcov.EMOJI_SAMPLE
            filled += 1
            continue
        # CJK next: the script alone is ambiguous (Hant = Traditional Chinese,
        # Cantonese, Wu, …), so key off the font's CJK subset to get the same
        # canonical text Google Fonts shows (HK -> Cantonese, TC -> zh_Hant).
        text = next(
            (by_lang[s] for s in subsets if by_lang.get(s)),
            None,
        )
        # Otherwise, only non-Latin-primary fonts get a native sample. A missing/
        # Latin primary_script means a Latin font (it may still cover Cyrillic/
        # Greek), which should keep the English default — otherwise a Latin face
        # that merely includes Armenian would wrongly specimen in Armenian.
        if text is None:
            script = r.get("primaryScript")
            text = by_script.get(script) if script and script != "Latn" else None
        r["specimen"] = text
        if text:
            filled += 1
    print(f"specimens: {filled}/{len(records)} fonts given a native-script sample")


def apply_published_signals(records, published):
    """Set is_published + popularity/trending ranks on each record in place."""
    if published is None:
        for r in records:
            r["isPublished"] = True
            r["displayName"] = None
            r["popularityRank"] = None
            r["trendingRank"] = None
            r["lastModifiedApi"] = None
        print("no published.json found — all families marked as published, no ranks")
        return

    pub_count = 0
    for r in records:
        sig = published.get(r["name"].lower())
        r["isPublished"] = sig is not None
        r["displayName"] = sig.get("displayName") if sig else None
        r["popularityRank"] = sig.get("popularity") if sig else None
        r["trendingRank"] = sig.get("trending") if sig else None
        r["lastModifiedApi"] = sig.get("lastModified") if sig else None
        if sig is not None:
            pub_count += 1
    print(f"published whitelist: {pub_count}/{len(records)} families marked as published")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "stress_output.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "fonts.json"
    raw = json.load(open(src))
    records = [to_record(r) for r in raw if r.get("name")]

    apply_published_signals(records, load_published_map())
    apply_specimens(records)

    records.sort(key=lambda x: x["name"].lower())
    json.dump(records, open(out, "w"), indent=2, ensure_ascii=False)
    print(f"wrote {len(records)} records to {out}")
    write_label_maps(records, out)
