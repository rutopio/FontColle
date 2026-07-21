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

import urllib.request

import harvest_api
from to_dataset import to_record

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(HERE, "..", "..", "src", "data", "fonts.json")
API = harvest_api.API
# The webfonts v1 API omits designer; the unofficial metadata endpoint carries it
# (designers[]). Use it to fill the one field build_record can't.
METADATA = "https://fonts.google.com/metadata/fonts"


def designer_map():
    """name -> designer string (joined) from the metadata endpoint."""
    req = urllib.request.Request(METADATA, headers={"User-Agent": "font-harvester/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8")
    raw = raw[raw.index("{"):]  # strip the )]}' XSSI prefix
    d = json.loads(raw)
    out = {}
    for f in d.get("familyMetadataList", []):
        ds = f.get("designers") or []
        if ds:
            out[f["family"]] = ", ".join(ds)
    return out

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
    # Fill designer from the metadata endpoint (webfonts v1 omits it).
    dmap = designer_map()
    for r in finals:
        if not r.get("designer") and r["name"] in dmap:
            r["designer"] = dmap[r["name"]]
        # Mark these as API-sourced so the daily repo diff (daily_update.py)
        # doesn't treat them as "removed" for being absent from the repo tree.
        r["apiOnly"] = True
        # The repo-only backfills (version_history, about, specimens, license,
        # contrast) never run for these families, so the fields they add are
        # absent. FontRecord declares versionHistory/designerProfiles as
        # non-null arrays and the rest as nullable — the detail page iterates
        # versionHistory and reads .length, so a missing value throws
        # ("history is not iterable"). Seed every backfill field to its
        # type-correct empty value so the record satisfies the FontRecord
        # contract exactly like a repo family before its backfills run.
        r.setdefault("versionHistory", [])
        r.setdefault("designerProfiles", [])
        r.setdefault("specimen", None)
        r.setdefault("contrast", None)
        r.setdefault("firstCommitDate", None)
        r.setdefault("about", None)
        r.setdefault("licenseHeader", None)
    print(f"\n=== {len(finals)} records transformed ===", file=sys.stderr)
    for r in finals:
        print(f"  {r['id']:28} class={r.get('class'):8} "
              f"weights={r.get('weights')} axes={[a.get('tag') for a in (r.get('axes') or [])]} "
              f"upm={r.get('unitsPerEm')} glyphs={r.get('glyphCount')} "
              f"vendor={r.get('vendorId')} subsets={len(r.get('subsets') or [])}", file=sys.stderr)

    if dry:
        print("\n[dry-run] not writing fonts.json", file=sys.stderr)
        return

    dataset = json.load(open(DATASET))
    dataset = dataset if isinstance(dataset, list) else dataset.get("fonts", [])
    by_id = {r["id"]: r for r in dataset}
    added = [r["id"] for r in finals if r["id"] not in by_id]
    for r in finals:
        by_id[r["id"]] = r
    dataset = sorted(by_id.values(), key=lambda x: x["name"].lower())
    json.dump(dataset, open(DATASET, "w"), indent=2, ensure_ascii=False)
    print(f"\nmerged {len(finals)} ({len(added)} new); fonts.json now {len(dataset)}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
