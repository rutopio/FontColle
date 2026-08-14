#!/usr/bin/env python3
"""One-shot backfill of `repository_url` onto stress_output.json.

METADATA.pb carries `source { repository_url: "..." }`, the upstream GitHub
repo, which the harvester didn't previously capture. This fetches ONLY the
METADATA.pb per family (no TTF re-download) and sets r["repository_url"] on the
matching record in place. A full reharvest via harvest.py would produce the same
field but re-downloads every TTF, so this lightweight backfill is preferred.

Records whose _source == "api" have no repo directory (they're supplemented from
the Developer API, not the google/fonts repo), so they're skipped and keep a
null repository_url. Idempotent; writes stress_output.json back.

Usage:
    python3 backfill_source.py [path/to/stress_output.json] [workers]
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from harvest import parse_metadata_pb

RAW = "https://raw.githubusercontent.com/google/fonts/main"


def fetch_repo_url(license_dir, family_dir):
    """repository_url from a family's METADATA.pb, or None (missing block or
    fetch error, treat both as "no repo known")."""
    url = f"{RAW}/{license_dir}/{urllib.parse.quote(family_dir)}/METADATA.pb"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "font-harvester/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read().decode("utf-8")
    except Exception:
        return None
    return parse_metadata_pb(text).get("repository_url")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "stress_output.json"
    path = os.path.abspath(path)
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 8

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    # Only records with a repo directory can carry a METADATA.pb-sourced url.
    targets = [
        r
        for r in records
        if r.get("_source") != "api"
        and r.get("license_dir")
        and r.get("family_dir")
    ]
    print(f"backfilling repository_url for {len(targets)}/{len(records)} records…",
          file=sys.stderr)

    hits = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {
            ex.submit(fetch_repo_url, r["license_dir"], r["family_dir"]): r
            for r in targets
        }
        for fut in as_completed(futs):
            r = futs[fut]
            url = fut.result()
            r["repository_url"] = url
            if url:
                hits += 1

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, default=str, ensure_ascii=False)

    print(f"set repository_url on {hits}/{len(targets)} records -> {path}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
