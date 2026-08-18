#!/usr/bin/env python3
"""Incremental daily update of the font catalog.

Diffs google/fonts repo against our dataset, re-harvests changed families,
and refreshes whole-catalog signals (popularity, trending, isPublished, specimens).

    GITHUB_TOKEN=... python3 scripts/harvester/daily_update.py
"""

import json
import os
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
DATASET = os.path.join(ROOT, "src", "data", "fonts.json")
PUBLISHED = os.path.join(HERE, "published.json")
RAW_OUT = os.path.join(HERE, "harvest_output.json")
OG_OUT = os.path.join(HERE, "og_ids.txt")

sys.path.insert(0, HERE)
from to_dataset import (  # noqa: E402
    apply_published_signals,
    apply_specimens,
    to_record,
    write_label_maps,
)


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


TREES_API = "https://api.github.com/repos/google/fonts/git/trees/main?recursive=1"
LICENSE_DIRS = ("ofl", "apache", "ufl")


def list_all_families():
    """Returns {family_dir: license_dir} from the live repo tree."""
    req = urllib.request.Request(TREES_API)
    req.add_header("User-Agent", "font-fridge-harvest")
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        req.add_header("Authorization", f"Bearer {tok}")
    with urllib.request.urlopen(req, timeout=60) as r:
        tree = json.load(r)
    if tree.get("truncated"):
        raise SystemExit("google/fonts tree was truncated, cannot enumerate")
    dirs = {}
    for it in tree.get("tree", []):
        parts = it["path"].split("/")
        if len(parts) == 3 and parts[0] in LICENSE_DIRS and parts[2] == "METADATA.pb":
            dirs[parts[1]] = parts[0]
    return dirs


def compute_changed(dataset, published, all_families):
    """Families to re-harvest: new dirs or newer lastModified."""
    prev_lm = {r["id"]: r.get("lastModifiedApi") for r in dataset}
    lm_by_dir = {}
    name_to_dir = {r["name"].lower(): r["id"] for r in dataset}
    for name_lower, sig in published.items():
        d = name_to_dir.get(name_lower)
        if d:
            lm_by_dir[d] = sig.get("lastModified")

    changed = {}
    for fam_dir, lic in all_families.items():
        if fam_dir not in prev_lm:
            changed[fam_dir] = lic  # brand-new directory
        else:
            lm = lm_by_dir.get(fam_dir)
            if lm and lm != prev_lm.get(fam_dir):
                changed[fam_dir] = lic  # newer lastModified
    return changed


def harvest_subset(changed):
    """Run harvest.py over the changed dirs; returns parsed raw records."""
    entries = "\n".join(f"{lic}\t{d}" for d, lic in sorted(changed.items()))
    proc = subprocess.run(
        [sys.executable, os.path.join(HERE, "harvest.py"), "-"],
        input=entries,
        text=True,
        cwd=HERE,
        capture_output=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f"harvest.py failed (exit {proc.returncode})")
    return load_json(RAW_OUT)


# Fields from backfill_*.py, not from harvest; carry across record replacement.
BACKFILLED_FIELDS = (
    "versionHistory",
    "firstCommitDate",
    "licenseHeader",
    "about",
    "designerProfiles",
    "contrast",
    "glyphCoverage",
    "gfTtfCommitDate",
    "upstreamHeadDate",
    "upstreamAnyDate",
    "upstreamPushedAt",
    "upstreamArchived",
    "upstreamRepoKey",
    "upstreamNewestTag",
)


def carry_backfilled(prev, rec):
    """Copy backfill-only fields from the previous record onto a fresh one."""
    if not prev:
        return
    for field in BACKFILLED_FIELDS:
        if field in prev and field not in rec:
            rec[field] = prev[field]


def main():
    full = "--full" in sys.argv[1:]

    dataset = load_json(DATASET)
    if not os.path.exists(PUBLISHED):
        raise SystemExit(
            "published.json missing, run fetch_published.py first"
        )
    published_raw = load_json(PUBLISHED)
    published = {name.lower(): sig for name, sig in published_raw.items()}

    before = {r["id"]: json.dumps(r, sort_keys=True) for r in dataset}

    all_families = list_all_families()
    changed = dict(all_families) if full else compute_changed(dataset, published, all_families)
    if full:
        print(f"--full: reconciling all {len(changed)} families")
    now_dirs = set(all_families)
    # apiOnly families are absent from repo by design; exempt from removal.
    removed = {
        r["id"]
        for r in dataset
        if r["id"] not in now_dirs and not r.get("apiOnly")
    }

    print(f"to harvest: {len(changed)} | removed dirs: {len(removed)}")

    harvested_ids = set()
    if changed:
        raw = harvest_subset(changed)
        new_records = [to_record(r) for r in raw if r.get("name")]
        harvested_ids = {r["id"] for r in new_records}
        by_id = {r["id"]: r for r in dataset}
        for rec in new_records:
            prev = by_id.get(rec["id"])
            # Carry tags (from backfill_tags.py) so category isn't lost.
            if prev and prev.get("tags") and not rec.get("tags"):
                rec["tags"] = prev["tags"]
            carry_backfilled(prev, rec)
            by_id[rec["id"]] = rec  # replace or insert
        dataset = list(by_id.values())

    apply_published_signals(dataset, published)
    apply_specimens(dataset)
    dataset.sort(key=lambda x: x["name"].lower())

    with open(DATASET, "w", encoding="utf-8") as fh:
        json.dump(dataset, fh, indent=2, ensure_ascii=False)
    write_label_maps(dataset, DATASET)

    changed_ids = sorted(
        r["id"]
        for r in dataset
        if before.get(r["id"]) != json.dumps(r, sort_keys=True)
    )

    with open(OG_OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(sorted(harvested_ids)))

    if not changed_ids and not removed:
        print("no changes")
        return

    print(
        f"wrote {len(dataset)} families; {len(harvested_ids)} re-harvested, "
        f"{len(removed)} unpublished, {len(changed_ids)} records changed"
    )


if __name__ == "__main__":
    main()
