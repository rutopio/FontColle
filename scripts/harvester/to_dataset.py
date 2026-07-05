#!/usr/bin/env python3
"""Transform raw harvest output into the frontend dataset shape.

Reads stress_output.json / harvest_output.json (list of raw records) and emits
public/fonts.json: a compact array the MVP frontend reads directly. Also derives
the §12 facets (variable, has-italic, axis facets, feature facets, script coverage).
"""
import json, sys

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
            {"name": i.get("name"), "coords": i.get("coords", {})}
            for i in instances
        ],
        "features": sorted(gsub | set(ttf.get("gpos_features", []))),
        "facets": sorted(set(facets)),
    }

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "stress_output.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "fonts.json"
    raw = json.load(open(src))
    records = [to_record(r) for r in raw if r.get("name")]
    records.sort(key=lambda x: x["name"].lower())
    json.dump(records, open(out, "w"), indent=2, ensure_ascii=False)
    print(f"wrote {len(records)} records to {out}")
