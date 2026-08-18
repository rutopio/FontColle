#!/usr/bin/env python3
"""Transform raw harvest output into src/data/fonts.json."""
import json
import os
import sys

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

# Name whitelist (not heuristic) for emoji/symbol/icon/barcode faces.
GRAPHICS_FAMILIES = {
    "Noto Color Emoji", "Noto Color Emoji Compat Test", "Noto Emoji",
    "Noto Sans Symbols", "Noto Sans Symbols 2", "Noto Music",
    "Datatype", "Allkin", "Libre Barcode 39 Extended",
    "Linefont", "Wavefont",
    "Yarndings 20", "Yarndings 20 Charted",
    "Yarndings 12", "Yarndings 12 Charted",
}

def primary_class(cat, name=None):
    # Letterform only; spacing handled separately by fontSpacing().
    if name in GRAPHICS_FAMILIES: return "Graphics"
    c = (cat or "").upper()
    if "SERIF" in c and "SANS" not in c: return "Serif"
    if "SANS" in c: return "Sans"
    if "DISPLAY" in c: return "Display"
    if "HANDWRITING" in c or "SCRIPT" in c: return "Script"
    return "Sans"

WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900]


def snap_weight(w):
    """Snap an arbitrary usWeightClass to the nearest standard 100 step."""
    if w is None:
        return None
    return min(WEIGHT_STEPS, key=lambda s: abs(s - w))


def derive_weights(r, ttf, axes):
    """Standard weight steps this family offers."""
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


def to_record(r: dict) -> dict:
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
        "category": primary_class(r.get("category"), r.get("name")),
        "apiCategory": r.get("category"),
        "license": r.get("license"),
        "licenseDir": r.get("license_dir"),
        "isVariable": bool(ttf.get("is_variable")),
        "subsets": subsets,
        "primaryTtf": r.get("primary_ttf"),
        "repositoryUrl": r.get("repository_url"),
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
        "colorTables": [t.strip() for t in ttf.get("color_tables", [])],
        "primaryScript": r.get("primary_script"),
        "panose": ",".join(str(x) for x in panose) if panose else None,
        # Raw font units; ratios derived at the UI layer.
        "xHeight": ttf.get("x_height"),
        "capHeight": ttf.get("cap_height"),
        "italicAngle": ttf.get("italic_angle"),
        "hheaAscender": ttf.get("hhea_ascender"),
        "hheaDescender": ttf.get("hhea_descender"),
        "hheaLineGap": ttf.get("hhea_line_gap"),
        "typoAscender": ttf.get("typo_ascender"),
        "typoDescender": ttf.get("typo_descender"),
        "typoLineGap": ttf.get("typo_line_gap"),
        "winAscent": ttf.get("win_ascent"),
        "winDescent": ttf.get("win_descent"),
        "useTypoMetrics": ttf.get("use_typo_metrics"),
        "avgCharWidth": ttf.get("avg_char_width"),
        "isMonospace": ttf.get("is_monospace"),
        # outlineFormat not emitted (100% glyf across google/fonts).
        "hasHinting": ttf.get("has_hinting"),
        "vendorId": ttf.get("vendor_id"),
        "fileSize": ttf.get("file_size"),
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
        "languages": r.get("languages", []) or [],
        "scripts": r.get("scripts", []) or [],
        "cjkCoverage": r.get("cjk_coverage", {}) or {},
        # Populated by backfill_tags.py post-harvest.
        "tags": r.get("tags", {}) or {},
    }

def write_label_maps(records, out):
    """Emit scripts.json / languages.json for frontend label rendering."""
    import langcov

    used_scripts = {s for r in records for s in r.get("scripts", [])}
    used_langs = {l for r in records for l in r.get("languages", [])}
    smap = langcov.script_label_map()
    lmap = langcov.language_label_map()
    scripts_out = {c: smap.get(c, c) for c in sorted(used_scripts)}
    langs_out = {l: lmap[l] for l in sorted(used_langs) if l in lmap}
    d = os.path.dirname(out) or "."
    for name, payload in (("scripts.json", scripts_out),
                          ("languages.json", langs_out)):
        with open(os.path.join(d, name), "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    print(f"wrote {len(scripts_out)} scripts, {len(langs_out)} languages to {d}")


def load_published_map():
    """Returns {name.lower(): signals} or None if published.json is absent."""
    path = os.path.join(os.path.dirname(__file__), "published.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    return {name.lower(): sig for name, sig in raw.items()}


# Google Fonts-matching sample strings for symbol/emoji faces.
GRAPHICS_SPECIMENS = {
    "Noto Sans Symbols": "⛾⛿☯☸ ⛩⛰⛱⛴⛷⛸⛹ ♸⚥☊☍☓☤ 🄰🄱🆈🆉 ⚖♇♪♬",
    "Noto Sans Symbols 2": "🌍✄✎ 🏔🏕🏌🏍🎭🎮 🯅🯆🯇🯉 🡢🡭🡱🡼 🯱🯲🯳🯴🯵🯶 🂮🂱🂲🂳",
    "Noto Music": "𝄆 𝄙𝆏 𝄞𝄟𝄢 𝄾𝄿𝄎 𝄴 𝄶𝅁 𝄭𝄰 𝇛𝇜 𝄊 𝄇",
    "Datatype": "{l:Server Errors {b:20,25,52,36,67} Body Weight {l:42,21,53,67} 38% signed {p:38}",
    "Allkin": "",
}


def apply_specimens(records):
    """Set specimen text in the font's own script. Latin fonts get None."""
    import langcov

    by_script = langcov.specimen_by_script()
    by_lang = {
        subset: langcov.specimen_for_lang(lang)
        for subset, lang in langcov.SUBSET_TO_SPECIMEN_LANG.items()
    }
    tiers_by_script = langcov.tiers_by_script()
    tiers_by_lang = {
        subset: langcov.tiers_for_lang(lang)
        for subset, lang in langcov.SUBSET_TO_SPECIMEN_LANG.items()
    }
    filled = 0
    for r in records:
        subsets = r.get("subsets") or []
        if r.get("name") in GRAPHICS_SPECIMENS:
            r["specimen"] = GRAPHICS_SPECIMENS[r["name"]]
            r["specimenTiers"] = None
            filled += 1
            continue
        non_menu = [s for s in subsets if s != "menu"]
        if non_menu == ["emoji"]:
            r["specimen"] = langcov.EMOJI_SAMPLE
            r["specimenTiers"] = None
            filled += 1
            continue
        # CJK: key off subset, not script (Hant is ambiguous).
        text = next(
            (by_lang[s] for s in subsets if by_lang.get(s)),
            None,
        )
        tiers = next(
            (tiers_by_lang[s] for s in subsets if tiers_by_lang.get(s)),
            None,
        )
        if text is None:
            script = r.get("primaryScript")
            text = by_script.get(script) if script and script != "Latn" else None
        if tiers is None:
            script = r.get("primaryScript")
            tiers = (
                tiers_by_script.get(script) if script and script != "Latn" else None
            )
        r["specimen"] = text
        r["specimenTiers"] = tiers
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
            r["isNoto"] = None
            r["isBrandFont"] = None
            r["isOpenSource"] = None
        print("no published.json found, all families marked as published, no ranks")
        return

    pub_count = 0
    unmatched = []
    for r in records:
        sig = published.get(r["name"].lower())
        r["isPublished"] = sig is not None
        r["displayName"] = sig.get("displayName") if sig else None
        r["popularityRank"] = sig.get("popularity") if sig else None
        r["trendingRank"] = sig.get("trending") if sig else None
        r["lastModifiedApi"] = sig.get("lastModified") if sig else None
        r["isNoto"] = sig.get("isNoto") if sig else None
        r["isBrandFont"] = sig.get("isBrandFont") if sig else None
        r["isOpenSource"] = sig.get("isOpenSource") if sig else None
        if sig is not None:
            pub_count += 1
        else:
            unmatched.append(r["id"])
    print(f"published whitelist: {pub_count}/{len(records)} families marked as published")
    if unmatched:
        print(
            f"published join: {len(unmatched)} families matched no API entry "
            f"(expected for merged/retired families; review if a rename): "
            f"{', '.join(sorted(unmatched))}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "harvest_output.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "fonts.json"
    with open(src, encoding="utf-8") as fh:
        raw = json.load(fh)
    records = [to_record(r) for r in raw if r.get("name")]

    apply_published_signals(records, load_published_map())
    apply_specimens(records)

    records.sort(key=lambda x: x["name"].lower())
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)
    print(f"wrote {len(records)} records to {out}")
    write_label_maps(records, out)
