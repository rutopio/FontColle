#!/usr/bin/env python3
"""Backfill `versionHistory` onto src/data/fonts.json from google/fonts git log.

Google Fonts exposes no version API. The authoritative record of when each
version shipped is the google/fonts repo commit history: version-bump commits
name the version in their message ("Roboto 3.015 update", "Version 3.011",
"v3.000 added"). We list the commits touching a family's directory, pull the
version out of each message, and keep the earliest commit date per version as
its release date.

A family can MOVE between license dirs over its life (e.g. Roboto went
apache/roboto -> ofl/roboto in 2023-12), and the GitHub commits API does NOT
follow renames. So for each family we probe every plausible dir (ofl, apache,
ufl) and merge the results.

Output per family:
    versionHistory: [{ "version": "3.011", "date": "2025-03-12" }, ...]
ascending by date; [] when nothing extractable.

Rate limit: 60 req/hr unauthenticated, 5000 with a token. Set GITHUB_TOKEN for
anything beyond a handful of families. Idempotent and resumable: families that
already have a non-empty versionHistory are skipped unless --force.

Usage:
    export $(grep GITHUB_TOKEN ../../.env)   # optional but recommended
    python3 backfill_version_history.py [path/to/fonts.json] [--only NAME] [--force]
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
# Dirs a family may live in now or historically. Order doesn't matter; results
# are merged and deduped by version.
LICENSE_DIRS = ("ofl", "apache", "ufl")
# "Version 3.011" / "v3.000" / bare "3.015" preceded by the family name.
VERSION_RE = re.compile(r"[vV]ersion\s*(\d+\.\d{1,3})|v(\d+\.\d{1,3})")


# Stop and checkpoint when the token's remaining core-API quota drops to this,
# leaving a safety margin so we never trip GitHub's abuse detection / lockout.
RATE_FLOOR = 50


class RateLimited(Exception):
    """Raised to unwind cleanly to the checkpoint-and-exit path."""


# Remaining core quota, refreshed from each response's X-RateLimit-Remaining
# header (starts as None = unknown until the first call).
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
    """GET a GitHub API URL as parsed JSON. Updates the remaining-quota counter
    from response headers and raises RateLimited when it hits the floor. Returns
    [] on 404 (dir absent)."""
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
            # 403/429 with no quota left = hard rate limit; checkpoint & exit
            # rather than sleeping through the (up to an hour) reset window.
            if e.code in (403, 429):
                if rem is not None and int(rem) == 0:
                    raise RateLimited()
                wait = int(e.headers.get("Retry-After", "60"))
                print(f"    transient 403, sleeping {wait}s…", file=sys.stderr)
                time.sleep(wait)
                last_exc = e
                continue
            # 401 is usually a transient GitHub auth hiccup mid-run (the token
            # tests valid before/after); back off and retry rather than crash.
            if e.code == 401:
                back = 2 ** attempt
                print(f"    401 auth hiccup, retry in {back}s…", file=sys.stderr)
                time.sleep(back)
                last_exc = e
                continue
            # 5xx are GitHub-side hiccups (502/503/504); back off and retry
            # instead of crashing the whole run.
            if 500 <= e.code < 600:
                back = 2 ** attempt
                print(f"    server {e.code}, retry in {back}s…", file=sys.stderr)
                time.sleep(back)
                last_exc = e
                continue
            raise
        except urllib.error.URLError as e:
            # Transient network error (timeout, DNS, reset): back off and retry.
            back = 2 ** attempt
            print(f"    network error ({e.reason}), retry in {back}s…",
                  file=sys.stderr)
            time.sleep(back)
            last_exc = e
            continue
    # Exhausted retries; surface the last error so the caller can checkpoint.
    if last_exc:
        raise last_exc
    return []


def commits_for_dir(license_dir, family_dir):
    """All commits touching one license_dir/family_dir path (up to 100)."""
    path = f"{license_dir}/{family_dir}"
    url = f"{API}?path={urllib.parse.quote(path)}&per_page=100"
    return _request(url)


def harvest_for(family_dir, license_dirs=LICENSE_DIRS):
    """Merge commits across candidate dirs. Returns (timeline, first_commit_date).

    timeline: ascending [{version,date}] from version-bearing commit messages.
    first_commit_date: earliest commit date across ALL commits touching the
    family (its true repo debut, more reliable than METADATA date_added)."""
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
    # Positional args are anything not a flag and not the --only value.
    skip = set()
    if only is not None:
        skip.add(only)
    args = [a for a in argv if not a.startswith("--") and a not in skip]

    path = args[0] if args else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    records = json.load(open(path))
    # A family is "done" once it has a firstCommitDate KEY (even null: no repo
    # commits found). --force reprocesses everything; otherwise resume by
    # skipping done families, so a rate-limit stop is safely re-runnable.
    targets = []
    for r in records:
        if only and r.get("name") != only:
            continue
        if "firstCommitDate" in r and not force:
            continue
        if not r.get("id"):
            continue
        targets.append(r)

    print(f"backfilling git history for {len(targets)}/{len(records)} families…",
          file=sys.stderr)
    if not os.environ.get("GITHUB_TOKEN"):
        print("  WARNING: no GITHUB_TOKEN — 60 req/hr limit, fine for a few only.",
              file=sys.stderr)

    def save():
        with open(path, "w") as fh:
            json.dump(records, fh, indent=2, ensure_ascii=False)

    hits = 0
    done = 0
    try:
        for i, r in enumerate(targets, 1):
            family_dir = r["id"]
            # Probe the family's own licenseDir first, then the others to catch
            # historical moves (e.g. Roboto apache -> ofl).
            own = r.get("licenseDir")
            dirs = ([own] if own in LICENSE_DIRS else []) + [
                d for d in LICENSE_DIRS if d != own
            ]
            tl, first = harvest_for(family_dir, dirs)
            r["versionHistory"] = tl
            r["firstCommitDate"] = first
            done += 1
            if tl:
                hits += 1
            print(
                f"  [{i}/{len(targets)}] {r.get('name')}: "
                f"{len(tl)} versions, debut {first} (quota {_remaining})",
                file=sys.stderr,
            )
            # Periodic checkpoint so a crash mid-run still persists progress.
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
        # Any other failure (retries exhausted, etc.): persist progress so a
        # re-run resumes rather than repeating everything, then re-raise.
        save()
        print(f"\nStopped on error after {done} families: {e}. "
              f"Progress saved; re-run to resume.", file=sys.stderr)
        return

    save()
    print(f"done: {done} processed, {hits} with versions -> {path}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
