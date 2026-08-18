#!/usr/bin/env python3
"""Backfill `versionHistory` from google/fonts commit messages.

Probes all license dirs (ofl/apache/ufl) per family to follow renames.
Resumable: skips families that already have a firstCommitDate unless --force.

    GITHUB_TOKEN=... python3 backfill_version_history.py [fonts.json] [--ids=a,b,c] [--force]
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.github.com/repos/google/fonts/commits"
LICENSE_DIRS = ("ofl", "apache", "ufl")
VERSION_RE = re.compile(r"[vV]ersion\s*(\d+\.\d{1,3})|v(\d+\.\d{1,3})")


RATE_FLOOR = 50


class RateLimited(Exception):
    pass


_remaining = None


def _headers():
    h = {
        "User-Agent": "font-harvester/1.0",
        "Accept": "application/vnd.github+json",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _request(url):
    """GET a GitHub API URL. Raises RateLimited at quota floor; returns [] on 404."""
    global _remaining
    if _remaining is not None and _remaining <= RATE_FLOOR:
        raise RateLimited()

    last_exc = None
    for attempt in range(4):
        req = urllib.request.Request(url, headers=_headers())
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                rem = r.headers.get("X-RateLimit-Remaining")
                if rem is not None:
                    _remaining = int(rem)
                return json.load(r)
        except urllib.error.HTTPError as e:
            rem = e.headers.get("X-RateLimit-Remaining")
            if rem is not None:
                _remaining = int(rem)
            if e.code == 404:
                return []
            if e.code in (403, 429):
                if rem is not None and int(rem) == 0:
                    raise RateLimited()
                wait = int(e.headers.get("Retry-After", "60"))
                print(f"    transient 403, sleeping {wait}s…", file=sys.stderr)
                time.sleep(wait)
                last_exc = e
                continue
            if e.code == 401:
                back = 2 ** attempt
                print(f"    401 auth hiccup, retry in {back}s…", file=sys.stderr)
                time.sleep(back)
                last_exc = e
                continue
            if 500 <= e.code < 600:
                back = 2 ** attempt
                print(f"    server {e.code}, retry in {back}s…", file=sys.stderr)
                time.sleep(back)
                last_exc = e
                continue
            raise
        except urllib.error.URLError as e:
            back = 2 ** attempt
            print(f"    network error ({e.reason}), retry in {back}s…",
                  file=sys.stderr)
            time.sleep(back)
            last_exc = e
            continue
    if last_exc:
        raise last_exc
    return []


def commits_for_dir(license_dir, family_dir):
    """All commits touching one license_dir/family_dir path (up to 100)."""
    path = f"{license_dir}/{family_dir}"
    url = f"{API}?path={urllib.parse.quote(path)}&per_page=100"
    return _request(url)


def harvest_for(family_dir, license_dirs=LICENSE_DIRS):
    """Returns (timeline, first_commit_date) merged across all license dirs."""
    best = {}  # version -> earliest ISO date
    first = None  # earliest commit date of any kind
    for d in license_dirs:
        for c in commits_for_dir(d, family_dir):
            date = c["commit"]["committer"]["date"][:10]
            if first is None or date < first:
                first = date
            m = VERSION_RE.search(c["commit"]["message"].splitlines()[0])
            if not m:
                continue
            ver = m.group(1) or m.group(2)
            if ver not in best or date < best[ver]:
                best[ver] = date
    timeline = [
        {"version": ver, "date": date}
        for ver, date in sorted(best.items(), key=lambda kv: kv[1])
    ]
    return timeline, first


def main():
    argv = sys.argv[1:]
    only = None
    force = "--force" in argv
    if "--only" in argv:
        only = argv[argv.index("--only") + 1]
    ids = None
    for a in argv:
        if a.startswith("--ids="):
            ids = {s for s in a.split("=", 1)[1].split(",") if s}
    skip = set()
    if only is not None:
        skip.add(only)
    args = [a for a in argv if not a.startswith("--") and a not in skip]

    path = args[0] if args else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    targets = []
    for r in records:
        if only and r.get("name") != only:
            continue
        if ids is not None:
            if r.get("id") in ids and r.get("id"):
                targets.append(r)
            continue
        if "firstCommitDate" in r and not force:
            continue
        if not r.get("id"):
            continue
        targets.append(r)

    print(f"backfilling git history for {len(targets)}/{len(records)} families…",
          file=sys.stderr)
    if not os.environ.get("GITHUB_TOKEN"):
        print("  WARNING: no GITHUB_TOKEN, 60 req/hr limit, fine for a few only.",
              file=sys.stderr)

    def save():
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(records, fh, indent=2, ensure_ascii=False)

    hits = 0
    done = 0
    try:
        for i, r in enumerate(targets, 1):
            family_dir = r["id"]
            own = r.get("licenseDir")
            dirs = ([own] if own in LICENSE_DIRS else []) + [
                d for d in LICENSE_DIRS if d != own
            ]
            tl, first = harvest_for(family_dir, dirs)
            r["versionHistory"] = tl
            r["firstCommitDate"] = first
            if not r.get("dateAdded") and first:
                r["dateAdded"] = first
            done += 1
            if tl:
                hits += 1
            print(
                f"  [{i}/{len(targets)}] {r.get('name')}: "
                f"{len(tl)} versions, debut {first} (quota {_remaining})",
                file=sys.stderr,
            )
            if done % 25 == 0:
                save()
    except RateLimited:
        save()
        print(
            f"\nRATE FLOOR reached ({_remaining} left). Checkpointed {done} "
            f"families ({hits} with versions). Re-run later to resume the rest.",
            file=sys.stderr,
        )
        return
    except Exception as e:
        save()
        print(f"\nStopped on error after {done} families: {e}. "
              f"Progress saved; re-run to resume.", file=sys.stderr)
        return 1

    save()
    print(f"done: {done} processed, {hits} with versions -> {path}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
