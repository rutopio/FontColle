#!/usr/bin/env python3
"""Harvest families in the webfonts v1 API but NOT the google/fonts repo.

Diffs live webfonts catalog against the repo tree — derived, not hardcoded.
  GOOGLE_FONTS_API_KEY=... python3 harvest_api_supplement.py [--dry-run]
"""
import json
import os
import sys

import urllib.parse
import urllib.request

import daily_update
import harvest
import harvest_api
from to_dataset import apply_published_signals, load_published_map, to_record

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(HERE, "..", "..", "src", "data", "fonts.json")
CACHE = os.path.join(HERE, "ttf_cache")
API = harvest_api.API
# Unofficial metadata endpoint (webfonts v1 omits designer/license).
METADATA = "https://fonts.google.com/metadata/fonts"


def fetch_metadata(path=""):
    """GET the metadata endpoint and strip Google's )]}' XSSI prefix."""
    req = urllib.request.Request(
        METADATA + path, headers={"User-Agent": "font-harvester/1.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8")
    return json.loads(raw[raw.index("{"):])


def designer_map():
    """name -> designer string (joined) from the metadata endpoint."""
    d = fetch_metadata()
    out = {}
    for f in d.get("familyMetadataList", []):
        ds = f.get("designers") or []
        if ds:
            out[f["family"]] = ", ".join(ds)
    return out


LICENSE_IDS = {"ofl": "OFL", "apache2": "APACHE2", "ufl": "UFL"}


def family_meta(family):
    """Per-family metadata: (license_id, about, designerProfiles)."""
    try:
        raw = fetch_metadata("/" + urllib.parse.quote(family))
    except Exception as e:  # noqa: BLE001 - best-effort backfill, never fatal
        print(f"WARN: metadata lookup failed for {family}: {e}", file=sys.stderr)
        return None, None, []
    lic = LICENSE_IDS.get((raw.get("license") or "").lower())
    # Prefer `description`, fall back to joined `article` list.
    about = (raw.get("description") or "").strip() or None
    if not about:
        about = "\n".join(p for p in (raw.get("article") or []) if p).strip() or None
    profiles = [
        {
            "name": d.get("name"),
            "bio": d.get("bio") or None,
            "imageUrl": d.get("imageUrl") or None,
        }
        for d in (raw.get("designers") or [])
    ]
    return lic, about, profiles

def seed_cache(rec, item):
    """Mirror a family's primary TTF into ttf_cache."""
    files = item.get("files") or {}
    url = files.get("regular") or next(iter(files.values()), None)
    if not url or not rec.get("license"):
        return
    stem = rec["name"].replace(" ", "")
    axes = ",".join(a["tag"] for a in (rec.get("axes") or []))
    fname = f"{stem}[{axes}].ttf" if axes else f"{stem}-Regular.ttf"
    license_dir = rec["license"].lower()
    path = os.path.join(CACHE, license_dir, rec["id"], fname)
    if not os.path.exists(path):
        data = harvest.fetch(url.replace("http://", "https://"), binary=True)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data)
    rec["licenseDir"] = license_dir
    rec["primaryTtf"] = fname


# Sanity bound: a jump far beyond the ~8 real API-only families means bad tree data.
MAX_SUPPLEMENT = 40


def wanted_families(items):
    """Webfonts catalog minus google/fonts tree. Returns (wanted_items, repo_dirs)."""
    repo_dirs = set(daily_update.list_all_families())
    if not repo_dirs:
        sys.exit("ABORT: google/fonts tree enumeration returned no families")
    out = {}
    for name, it in items.items():
        if name.startswith(harvest_api.EXCLUDE_PREFIXES):
            continue
        if harvest_api.family_dir(name) in repo_dirs:
            continue
        out[name] = it
    return out, repo_dirs


def main():
    dry = "--dry-run" in sys.argv
    key = os.environ.get("GOOGLE_FONTS_API_KEY", "")
    if not key:
        sys.exit("error: set GOOGLE_FONTS_API_KEY")

    api = harvest_api.fetch_json(f"{API}?key={key}&capability=VF&sort=alpha")
    all_items = {it["family"]: it for it in api.get("items", [])}
    items, repo_dirs = wanted_families(all_items)
    print(f"API-only families (webfonts {len(all_items)} minus repo): "
          f"{len(items)} -> {sorted(items)}", file=sys.stderr)
    if len(items) > MAX_SUPPLEMENT:
        sys.exit(f"ABORT: {len(items)} API-only families exceeds the "
                 f"MAX_SUPPLEMENT={MAX_SUPPLEMENT} sanity bound; refusing to "
                 f"harvest off a suspect repo-tree diff")

    raws = []
    for name in sorted(items):
        print(f"  harvesting {name} ...", file=sys.stderr)
        rec = harvest_api.build_record(items[name])
        if rec:
            raws.append(rec)

    finals = [to_record(r) for r in raws if r.get("name")]
    # Apply the same published-signal pass the full pipeline uses.
    apply_published_signals(finals, load_published_map())
    dmap = designer_map()
    for r in finals:
        if not r.get("designer") and r["name"] in dmap:
            r["designer"] = dmap[r["name"]]
        # License/about/profiles from per-family metadata (set unconditionally).
        lic, about, profiles = family_meta(r["name"])
        if not r.get("license") and lic:
            r["license"] = lic
        r["about"] = about
        r["designerProfiles"] = profiles
        # Seed ttf_cache so glyph coverage backfill can find this family.
        if not r.get("primaryTtf"):
            seed_cache(r, items[r["name"]])
        # Exempt from daily "removed" check (absent from repo by design).
        r["apiOnly"] = True
        # Seed missing backfill fields to satisfy FontRecord contract.
        r.setdefault("versionHistory", [])
        r.setdefault("specimen", None)
        r.setdefault("contrast", None)
        r.setdefault("firstCommitDate", None)
        r.setdefault("licenseHeader", None)
    print(f"\n=== {len(finals)} records transformed ===", file=sys.stderr)
    for r in finals:
        print(f"  {r['id']:28} category={r.get('category'):8} "
              f"weights={r.get('weights')} axes={[a.get('tag') for a in (r.get('axes') or [])]} "
              f"upm={r.get('unitsPerEm')} glyphs={r.get('glyphCount')} "
              f"vendor={r.get('vendorId')} subsets={len(r.get('subsets') or [])}", file=sys.stderr)

    if dry:
        print("\n[dry-run] not writing fonts.json", file=sys.stderr)
        return

    with open(DATASET, encoding="utf-8") as fh:
        dataset = json.load(fh)
    dataset = dataset if isinstance(dataset, list) else dataset.get("fonts", [])
    by_id = {r["id"]: r for r in dataset}
    # Detect new or actually-changed records for OG re-render.
    def _norm(rec):
        return json.dumps(rec, sort_keys=True, ensure_ascii=False)
    changed = [
        r["id"] for r in finals
        if r["id"] not in by_id or _norm(by_id[r["id"]]) != _norm(r)
    ]
    added = [r["id"] for r in finals if r["id"] not in by_id]
    for r in finals:
        by_id[r["id"]] = r

    # Clear apiOnly on families that graduated into google/fonts.
    graduated = [
        rec["id"] for rec in by_id.values()
        if rec.get("apiOnly") and rec["id"] in repo_dirs
    ]
    for gid in graduated:
        by_id[gid].pop("apiOnly", None)
    if graduated:
        print(f"graduated into google/fonts, apiOnly cleared: {graduated}",
              file=sys.stderr)
        changed = sorted(set(changed) | set(graduated))

    dataset = sorted(by_id.values(), key=lambda x: x["name"].lower())
    with open(DATASET, "w", encoding="utf-8") as fh:
        json.dump(dataset, fh, indent=2, ensure_ascii=False)

    # Append changed ids to og_ids.txt for OG card rendering.
    og_path = os.path.join(HERE, "og_ids.txt")
    prev = set()
    if os.path.exists(og_path):
        with open(og_path, encoding="utf-8") as fh:
            prev = {l.strip() for l in fh if l.strip()}
    with open(og_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(sorted(prev | set(changed))))

    print(f"\nmerged {len(finals)} ({len(added)} new, {len(changed)} changed); "
          f"fonts.json now {len(dataset)}", file=sys.stderr)
    # Machine-readable last line so the CI step can detect whether to force a
    # deploy (grep for "supplement-changed=").
    print(f"supplement-changed={len(changed)}")


if __name__ == "__main__":
    main()
