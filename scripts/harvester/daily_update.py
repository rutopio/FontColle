#!/usr/bin/env python3
"""Incremental daily update of the font catalog.

Detects which Google Fonts families are new / updated / removed since the last
run and re-harvests ONLY that subset, merging the result back in:
  - new families:     directories present in the google/fonts repo (GitHub
                      trees API) but absent from our dataset;
  - updated families: their Developer API `lastModified` is newer than recorded;
  - removed families: gone from the repo, no harvest; the signal refresh flips
                      their isPublished to false.
Popularity/trending/isPublished/specimens are refreshed for the WHOLE catalog
(those shift without a re-harvest).

Pipeline position (see README + tasks/todo.md):
    fetch_published.py -> published.json      (fresh signals, done by caller)
    daily_update.py    -> merges changes into src/data/fonts.json, and writes
                          og_ids.txt (families whose OG card must be re-rendered)
    gen:og --ids=og_ids.txt           -> OG cards for just those families
    pnpm build (gen-catalog.mjs)      -> the static catalog the site serves
                                         (catalog.json, catalog/<id>.json,
                                         designer-index.json)

Run (from repo root, after fetch_published.py has refreshed published.json):
    GITHUB_TOKEN=... python3 scripts/harvester/daily_update.py

GITHUB_TOKEN is optional but avoids the low unauthenticated GitHub API rate
limit when enumerating the google/fonts tree. (fetch_published.py is what needs
GOOGLE_FONTS_API_KEY.)

Exits 0 with "no changes" when nothing moved (caller can skip commit/deploy).
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
RAW_OUT = os.path.join(HERE, "stress_output.json")
OG_OUT = os.path.join(HERE, "og_ids.txt")  # families whose OG card must refresh

sys.path.insert(0, HERE)
# Reuse the exact transforms the full pipeline uses, merge only adds diffing.
from to_dataset import (  # noqa: E402
    apply_published_signals,
    apply_specimens,
    load_published_map,
    to_record,
    write_label_maps,
)


def load_json(path):
    with open(path) as fh:
        return json.load(fh)


TREES_API = "https://api.github.com/repos/google/fonts/git/trees/main?recursive=1"
LICENSE_DIRS = ("ofl", "apache", "ufl")


def list_all_families():
    """Enumerate every family directory in google/fonts via the GitHub trees API.

    Returns {family_dir: license_dir}. This is the authority on which families
    exist right now, the static all_families.tsv is a stale snapshot and can't
    detect newly added fonts. Harvest keys off family_dir (the repo directory),
    not the API display name, which is why we resolve dirs here.
    """
    req = urllib.request.Request(TREES_API)
    req.add_header("User-Agent", "font-colle-harvest")
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
    """Return {family_dir: license_dir} of families to (re-)harvest.

    A family is changed when its directory is new (not in our dataset) or its
    API lastModified is newer than what we recorded. Removed families (gone from
    the repo, or unpublished) need no harvest, the whole-catalog signal refresh
    flips isPublished on its own.
    """
    prev_lm = {r["id"]: r.get("lastModifiedApi") for r in dataset}
    # Map family_dir -> API lastModified via the display name in published.json.
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
    """Run harvest.py over the changed dirs; returns parsed raw records.

    harvest.py reads "license_dir\tfamily_dir" entries on stdin.
    """
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


# Fields no harvest can derive: each is written by its own backfill_*.py from a
# source outside the font binary (git history, the repo's LICENSE text,
# quant.csv, the GF metadata endpoint). to_record() cannot produce them, so
# replacing a record with a fresh one drops them — and a --full run replaces
# EVERY record. Left unhandled, a monthly full reconcile wiped versionHistory
# catalog-wide, and the re-backfill then ran out of GitHub API quota partway
# through, stranding the tail of the alphabet with no history at all. Carry them
# across the replace; the backfills still update what genuinely changed, since
# both jobs re-run them over the harvested ids. See [[reharvest-drops-backfills]].
BACKFILLED_FIELDS = (
    "versionHistory",
    "firstCommitDate",
    "licenseHeader",
    "about",
    "designerProfiles",
    "contrast",
    "glyphCoverage",
)


def carry_backfilled(prev, rec):
    """Copy backfill-only fields from the previous record onto a fresh one."""
    if not prev:
        return
    for field in BACKFILLED_FIELDS:
        if field in prev and field not in rec:
            rec[field] = prev[field]


def main():
    # --full forces a whole-catalog re-harvest (every family, ignoring the
    # lastModified diff), used monthly to reconcile silent misses: an upstream
    # that changed content without bumping lastModified, or a family the
    # name-based published join dropped, is otherwise never re-fetched. The
    # incremental default is what runs the other ~30 days.
    full = "--full" in sys.argv[1:]

    dataset = load_json(DATASET)
    if not os.path.exists(PUBLISHED):
        raise SystemExit(
            "published.json missing, run fetch_published.py first"
        )
    published_raw = load_json(PUBLISHED)
    published = {name.lower(): sig for name, sig in published_raw.items()}

    # Snapshot every record before touching anything, so we can diff afterwards
    # and tell whether any record's content actually changed (re-harvested
    # families + whatever the whole-catalog signal refresh moved: ranks,
    # isPublished, specimens), a no-op run skips the commit and deploy.
    before = {r["id"]: json.dumps(r, sort_keys=True) for r in dataset}

    all_families = list_all_families()
    # --full: treat every family as changed (whole-catalog reconcile). Otherwise
    # diff lastModified for the incremental subset.
    changed = dict(all_families) if full else compute_changed(dataset, published, all_families)
    if full:
        print(f"--full: reconciling all {len(changed)} families")
    now_dirs = set(all_families)
    # apiOnly families (Google Sans, Edu Hand batch — see harvest_api_supplement.py)
    # live in the webfonts API but NOT the repo tree, so they're absent from
    # now_dirs by design. Exempt them from the "removed" set, or every daily run
    # would flip them to isPublished=false for not being in the repo.
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
            # Carry the google/fonts classification scores across the replace.
            # They come from the tags CSV (backfill_tags.py), not the harvest, so
            # a fresh record has tags={} — and `category` is derived from them,
            # so dropping the scores would silently demote e.g. Inconsolata from
            # Mono back to whatever the API category says. See
            # [[reharvest-drops-backfills]].
            if prev and prev.get("tags") and not rec.get("tags"):
                rec["tags"] = prev["tags"]
            carry_backfilled(prev, rec)
            by_id[rec["id"]] = rec  # replace or insert
        dataset = list(by_id.values())

    # Whole-catalog refresh: isPublished (unpublished families flip to false
    # here), popularity, trending, lastModifiedApi, source flags, specimens.
    apply_published_signals(dataset, published)
    apply_specimens(dataset)
    dataset.sort(key=lambda x: x["name"].lower())

    with open(DATASET, "w") as fh:
        json.dump(dataset, fh, indent=2, ensure_ascii=False)
    write_label_maps(dataset, DATASET)

    # changed_ids = any record whose content changed vs the snapshot (new dirs
    # have no snapshot, so they count as changed too). Tells the caller whether
    # anything moved at all, so it can skip the commit/deploy on a no-op run.
    changed_ids = sorted(
        r["id"]
        for r in dataset
        if before.get(r["id"]) != json.dumps(r, sort_keys=True)
    )

    # OG cards only depend on the family name in its own face, so only newly
    # harvested families need a (re)rendered card, rank/isPublished shifts don't
    # change the image. Removed families keep their card (page just 404s).
    with open(OG_OUT, "w") as fh:
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
