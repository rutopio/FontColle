#!/usr/bin/env python3
"""One-off / on-demand supplement: harvest the 8 families that live in the
webfonts v1 API but NOT in the google/fonts repo (Google Sans, Google Sans Flex,
Edu Hand batch), transform them with the same to_record() the full pipeline uses,
and merge by id into src/data/fonts.json.

Repo stays the primary source (harvest.py); this only fills the repo-absent gap.
See tasks/todo.md + the gf-website-repo-lag memory. Needs GOOGLE_FONTS_API_KEY.

  GOOGLE_FONTS_API_KEY=... python3 harvest_api_supplement.py [--dry-run]
"""
import json, os, sys

import urllib.parse
import urllib.request

import harvest
import harvest_api
from to_dataset import apply_published_signals, load_published_map, to_record

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(HERE, "..", "..", "src", "data", "fonts.json")
# Where the repo harvester keeps primary TTFs; the backfills read from here.
CACHE = os.path.join(HERE, "ttf_cache")
API = harvest_api.API
# The webfonts v1 API omits designer and license; the unofficial metadata
# endpoint carries both. The catalog-wide list has designers[] but no license,
# so the license needs the per-family endpoint (one request per family).
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


# The metadata endpoint spells licenses lowercase ("ofl"); the dataset uses the
# repo's uppercase license-directory names, so map rather than upper().
LICENSE_IDS = {"ofl": "OFL", "apache2": "APACHE2", "ufl": "UFL"}


def family_meta(family):
    """Per-family metadata: (license_id, about, designerProfiles).

    The webfonts v1 API omits all three; the unofficial metadata endpoint carries
    them (verified 2026-07-22). Returned together so the record is self-complete
    from ONE fetch — critical for the daily loop: about/designerProfiles are
    regenerated on every run, so a re-run can't wipe them the way a setdefault
    over a fresh record would ([[reharvest-drops-backfills]]).
    """
    try:
        raw = fetch_metadata("/" + urllib.parse.quote(family))
    except Exception as e:  # noqa: BLE001 - best-effort backfill, never fatal
        print(f"WARN: metadata lookup failed for {family}: {e}", file=sys.stderr)
        return None, None, []
    lic = LICENSE_IDS.get((raw.get("license") or "").lower())
    # Brand / newer families (Google Sans, Edu Hand) carry an empty
    # `description` but a full `article` list; classic families use
    # `description`. Prefer `description`, fall back to the joined `article`.
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
    """Mirror a family's primary TTF into ttf_cache under the repo layout
    ({licenseDir}/{id}/{primaryTtf}) and set the two fields that address it.

    gstatic serves hash-named files, so synthesize a repo-style filename from
    the family name and its axes. Nothing parses this name, it only has to be
    stable so re-runs hit the same path."""
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
        # harvest.fetch is URL-cached, so this is usually a local copy, not a
        # second download of the file build_record already pulled.
        data = harvest.fetch(url.replace("http://", "https://"), binary=True)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data)
    rec["licenseDir"] = license_dir
    rec["primaryTtf"] = fname


# The families we want that the repo lacks. Kept explicit so we never pull the
# whole webfonts catalog by accident.
WANT = {
    "Edu NSW ACT Cursive", "Edu NSW ACT Hand Pre", "Edu QLD Hand", "Edu SA Hand",
    "Edu VIC WA NT Hand", "Edu VIC WA NT Hand Pre", "Google Sans", "Google Sans Flex",
}


def main():
    dry = "--dry-run" in sys.argv
    key = os.environ.get("GOOGLE_FONTS_API_KEY", "")
    if not key:
        sys.exit("error: set GOOGLE_FONTS_API_KEY")

    api = harvest_api.fetch_json(f"{API}?key={key}&capability=VF&sort=alpha")
    items = {it["family"]: it for it in api.get("items", []) if it["family"] in WANT}
    missing = WANT - set(items)
    if missing:
        print("WARN: not in API:", sorted(missing), file=sys.stderr)

    raws = []
    for name in sorted(items):
        print(f"  harvesting {name} ...", file=sys.stderr)
        rec = harvest_api.build_record(items[name])
        if rec:
            raws.append(rec)

    finals = [to_record(r) for r in raws if r.get("name")]
    # to_record() alone omits the published-signal fields (isPublished,
    # displayName, popularity/trending ranks, isNoto/isBrandFont/isOpenSource);
    # the full pipeline adds them in a second pass over the whole catalog. Run
    # that same pass here so these records carry every key a repo record does.
    apply_published_signals(finals, load_published_map())
    # Fill designer from the catalog-wide metadata list (webfonts v1 omits it).
    dmap = designer_map()
    for r in finals:
        if not r.get("designer") and r["name"] in dmap:
            r["designer"] = dmap[r["name"]]
        # License, about and designerProfiles all come from the per-family
        # metadata endpoint (webfonts v1 omits them). Fetch once and set all
        # three unconditionally: doing so keeps the record self-complete so a
        # daily re-run regenerates the SAME values instead of wiping them — the
        # setdefault-over-a-fresh-record trap that would null out about every
        # day. See [[reharvest-drops-backfills]].
        lic, about, profiles = family_meta(r["name"])
        if not r.get("license") and lic:
            r["license"] = lic
        r["about"] = about
        r["designerProfiles"] = profiles
        # Mirror the primary TTF into ttf_cache under the repo layout so the
        # cache-reading backfills (glyph coverage in particular) can find it;
        # without licenseDir/primaryTtf they skip these families and the Glyphs
        # page shows "No glyph coverage."
        if not r.get("primaryTtf"):
            seed_cache(r, items[r["name"]])
        # Mark these as API-sourced so the daily repo diff (daily_update.py)
        # doesn't treat them as "removed" for being absent from the repo tree.
        r["apiOnly"] = True
        # The remaining repo-only backfills (version_history, specimens,
        # contrast) never run for these families, so the fields they add are
        # absent. FontRecord declares versionHistory as a non-null array and the
        # rest as nullable — the detail page iterates versionHistory and reads
        # .length, so a missing value throws ("history is not iterable"). Seed
        # every still-missing backfill field to its type-correct empty value so
        # the record satisfies the FontRecord contract exactly like a repo
        # family. about/designerProfiles are set above, not seeded here.
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

    dataset = json.load(open(DATASET))
    dataset = dataset if isinstance(dataset, list) else dataset.get("fonts", [])
    by_id = {r["id"]: r for r in dataset}
    # A family "changed" when it's new OR its rebuilt record differs from the one
    # on disk (a version bump on Google Sans etc.). Only these need a fresh OG
    # card + a downstream deploy; a no-op run must leave the pipeline idle.
    def _norm(rec):
        return json.dumps(rec, sort_keys=True, ensure_ascii=False)
    changed = [
        r["id"] for r in finals
        if r["id"] not in by_id or _norm(by_id[r["id"]]) != _norm(r)
    ]
    added = [r["id"] for r in finals if r["id"] not in by_id]
    for r in finals:
        by_id[r["id"]] = r
    dataset = sorted(by_id.values(), key=lambda x: x["name"].lower())
    json.dump(dataset, open(DATASET, "w"), indent=2, ensure_ascii=False)

    # Append changed ids to og_ids.txt so the daily workflow renders their OG
    # cards. daily_update.py writes the repo-side ids there first (or an empty
    # file), so we append and de-dupe rather than overwrite.
    og_path = os.path.join(HERE, "og_ids.txt")
    prev = set()
    if os.path.exists(og_path):
        prev = {l.strip() for l in open(og_path) if l.strip()}
    with open(og_path, "w") as fh:
        fh.write("\n".join(sorted(prev | set(changed))))

    print(f"\nmerged {len(finals)} ({len(added)} new, {len(changed)} changed); "
          f"fonts.json now {len(dataset)}", file=sys.stderr)
    # Machine-readable last line so the CI step can detect whether to force a
    # deploy (grep for "supplement-changed=").
    print(f"supplement-changed={len(changed)}")


if __name__ == "__main__":
    main()
