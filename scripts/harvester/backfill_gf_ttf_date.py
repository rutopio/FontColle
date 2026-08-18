#!/usr/bin/env python3
"""Backfill `gfTtfCommitDate` onto src/data/fonts.json.

Answers "how new is the font file Google actually serves", which is NOT what
`upstreamHeadDate` answers ("is the author still working on it"). The two
diverge in both directions, so neither corrects the other:

    Donegal One   upstream=2026-07-20  gfTtf=2015-03-06  author active, GF stale
    Comfortaa     upstream=2017-11-08  gfTtf=2021-08-26  author gone, GF rebuilt
    Alegreya      upstream=2020-10-07  gfTtf=2021-01-08  genuinely finished

Signal: newest commit touching a .ttf/.otf inside <licenseDir>/<id>/ in
google/fonts. Scoping to the FONT FILES is the whole point -- a directory-wide
query returns Google's metadata housekeeping instead. Alegreya's directory head
is a foundry rename (199711f8c, "Huerta Tipografica" -> "HT Fonts", 4 files, no
font among them), sitting on top of the `upstream_info.md` backfill campaign
that ran repo-wide from 2026-03 through at least 2026-07. Filtering to
Alegreya[wght].ttf skips all of it and lands on 2021-01-08, three months after
the upstream head -- the author-commits-then-Google-packages lag.

Rejected alternative: list the directory's commits and filter by touched files.
The REST commits API does not return per-commit file lists, so that costs an
extra commits/{sha} call per commit inspected. The file-scoped query gets the
same answer in one.

Cost (measured, 12-family sample): ~1.0 font files per family, so ~2 calls each
-- one contents/ listing plus one commits/ per font file. Full catalog ~4100
REST calls against the 5000/hr authenticated budget; a daily --ids increment
over ~14 ids is ~28.

Path key is licenseDir + id. Do NOT derive the directory from the license
field: Open Sans is Apache-licensed but lives in ofl/opensans.

Written per family:
    gfTtfCommitDate   ISO date of the newest .ttf/.otf commit, or null

Null is expected and correct for the 8 apiOnly families (the Edu* set, Google
Sans, Google Sans Flex), which have no google/fonts directory at all. A 404 on
the directory therefore counts as resolved-null, not as a failure -- otherwise a
small --ids run over exactly those families would trip the unresolved guard.

Resumable. A full catalog pass takes ~30 minutes of wall clock, so it commits to
disk every CHECKPOINT families instead of only at the end -- an interrupted run
(Ctrl-C, shutdown, CI timeout) keeps everything it had already resolved. By
default a family that already carries a `gfTtfCommitDate` key is skipped, so
re-running the same command continues from the break. Use --refresh to re-check
families that already have a value.

Keeping the field FRESH needs --shard=i/n, not --ids
----------------------------------------------------
The daily workflow's --ids set comes from the harvest diff, which keys off
`lastModifiedApi`. That misses the case this field exists to show: a new TTF
lands in google/fonts and Google has NOT re-served the family, so
lastModifiedApi never moves and the id never enters the set. Measured over the
catalog, 10 of 2031 families are already in that state, and they do not recover
on a later run -- notosansnandinagari's TTF commit is 681 days old and still
348 days ahead of its re-serve date. (An earlier comment in the daily workflow
claimed this "self-corrects"; it does not, because the trigger never fires.)

A whole-catalog --refresh is ~4100 REST calls, too much to run daily. So the
daily job re-checks one shard per run: --shard=i/n splits the catalog by a hash
of the id (stable, so a family stays in its shard as the catalog grows) and
rotates i by day-of-year. n=14 is ~145 families, ~290 calls, and every family is
re-checked within a fortnight. --shard implies --refresh: the point is to
re-check values that are already present.

Usage:
    export $(grep GITHUB_TOKEN ../../.env)      # REST is 60/hr unauthenticated
    python3 backfill_gf_ttf_date.py [path/to/fonts.json] \
        [--ids=a,b,c] [--shard=i/n] [--limit N] [--changed-out FILE] [--refresh]
"""
import hashlib
import http.client
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.github.com"
REPO = "google/fonts"
FONT_EXTS = (".ttf", ".otf")
# Refuse to write when more than this fraction of families fail outright (a
# network/token fault). Directory 404s are NOT failures -- see module docstring.
MAX_UNRESOLVED = 0.20
# Be polite between calls; the budget is per-hour, not per-second, but a tight
# loop over thousands of requests trips secondary rate limits.
SLEEP = 0.05
# Write fonts.json every N families. A full pass is ~30 minutes, far too long to
# risk losing to an interrupt, and the file is ~21 MB so writing it every family
# would cost more than the API calls do. 50 caps the worst-case loss at ~35
# seconds of work while keeping the writes to ~40 over a full pass.
CHECKPOINT = 50


def _token():
    tok = os.environ.get("GITHUB_TOKEN")
    if not tok:
        sys.exit("GITHUB_TOKEN is required (REST is 60/hr unauthenticated)")
    return tok


def rest(path, tok, retries=4):
    """GET an API path. Returns (payload, status). Payload is None on 404."""
    url = f"{API}{path}"
    for attempt in range(retries):
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {tok}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "font-harvester/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r), 200
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None, 404
            if e.code in (403, 429):
                wait = int(e.headers.get("Retry-After", "60"))
                print(f"    rate limited, sleeping {wait}s…", file=sys.stderr)
                time.sleep(wait)
                continue
            if 500 <= e.code < 600 or e.code == 401:
                time.sleep(2**attempt)
                continue
            raise
        except urllib.error.URLError as e:
            print(f"    network error ({e.reason}), retrying…", file=sys.stderr)
            time.sleep(2**attempt)
        # IncompleteRead is an HTTPException, not a URLError, and killed a whole
        # sweep once before (see 525a669). Retry it like any transport hiccup.
        except http.client.HTTPException as e:
            print(
                f"    truncated response ({type(e).__name__}), retrying…",
                file=sys.stderr,
            )
            time.sleep(2**attempt)
    return None, 0


def font_files(directory, tok):
    """(names, ok) -- the .ttf/.otf files in a family dir. ok=False on failure.

    A 404 returns ([], True): the family genuinely has no directory, which is a
    real answer, not an error.
    """
    quoted = urllib.parse.quote(directory)
    payload, status = rest(f"/repos/{REPO}/contents/{quoted}", tok)
    if status == 404:
        return [], True
    if payload is None or not isinstance(payload, list):
        return [], False
    return [
        e["name"]
        for e in payload
        if e.get("type") == "file" and e.get("name", "").lower().endswith(FONT_EXTS)
    ], True


def newest_commit_date(path, tok):
    """ISO date of the newest commit touching `path`, or None."""
    quoted = urllib.parse.quote(path)
    payload, _ = rest(f"/repos/{REPO}/commits?path={quoted}&per_page=1", tok)
    if not payload:
        return None
    return (payload[0].get("commit", {}).get("committer", {}).get("date") or "")[
        :10
    ] or None


def family_date(record, tok):
    """(iso_date_or_None, ok) for one family."""
    directory = f"{record['licenseDir']}/{record['id']}"
    names, ok = font_files(directory, tok)
    if not ok:
        return None, False
    newest = None
    for name in names:
        time.sleep(SLEEP)
        date = newest_commit_date(f"{directory}/{name}", tok)
        if date and (newest is None or date > newest):
            newest = date
    return newest, True


def shard_of(font_id, total):
    """Which shard a family belongs to. Stable across runs and machines.

    Keyed off a hash of the id, not the catalog position, so a family added or
    removed upstream shifts only itself instead of renumbering everyone after
    it (which would make a family skip or repeat a rotation). md5 because
    Python's hash() is salted per process.
    """
    digest = hashlib.md5(font_id.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % total


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ids = None
    limit = None
    changed_out = None
    refresh = False
    shard = None
    for a in sys.argv[1:]:
        if a.startswith("--ids="):
            ids = {s for s in a.split("=", 1)[1].split(",") if s}
        elif a.startswith("--limit="):
            limit = int(a.split("=", 1)[1])
        elif a.startswith("--changed-out="):
            changed_out = a.split("=", 1)[1]
        elif a == "--refresh":
            refresh = True
        elif a.startswith("--shard="):
            spec = a.split("=", 1)[1]
            try:
                index, total = (int(x) for x in spec.split("/", 1))
            except ValueError:
                sys.exit(f"--shard expects i/n (e.g. --shard=0/14), got {spec!r}")
            if total < 1 or not 0 <= index < total:
                sys.exit(f"--shard index must be in [0,{total}) for i/n, got {spec!r}")
            shard = (index, total)

    path = (
        args[0]
        if args
        else os.path.join(
            os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
        )
    )
    path = os.path.abspath(path)

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)

    if ids is not None:
        targets = [r for r in records if r["id"] in ids]
    elif shard is not None:
        index, total = shard
        targets = [r for r in records if shard_of(r["id"], total) == index]
        print(
            f"shard {index}/{total}: {len(targets)} of {len(records)} families",
            file=sys.stderr,
        )
        if limit:
            targets = targets[:limit]
    else:
        targets = records[:limit] if limit else records

    # Resume: a family that already carries the key was done on an earlier pass.
    # --ids is an explicit request for those families, so it overrides this.
    # So is --shard: a rotation exists to re-check values that are already
    # there, so skipping the resolved ones would make it a no-op forever.
    if not refresh and ids is None and shard is None:
        pending = [r for r in targets if "gfTtfCommitDate" not in r]
        done = len(targets) - len(pending)
        if done:
            print(f"resuming: {done} already done, {len(pending)} to go", file=sys.stderr)
        targets = pending

    print(f"{len(targets)} families to check", file=sys.stderr)
    if not targets:
        print("nothing to do", file=sys.stderr)
        print("gfttf-changed=0")
        return

    def flush():
        """Write the whole catalog back. Called at each checkpoint and at exit."""
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(records, fh, indent=2, ensure_ascii=False)

    tok = _token()
    changed = 0
    failed = 0
    seen = 0
    interrupted = False
    try:
        for i, r in enumerate(targets, 1):
            seen = i
            date, ok = family_date(r, tok)
            if ok:
                if r.get("gfTtfCommitDate") != date:
                    changed += 1
                r["gfTtfCommitDate"] = date
            else:
                failed += 1
            if i % CHECKPOINT == 0 or i == len(targets):
                flush()
                print(
                    f"  {i}/{len(targets)} families ({failed} failed, saved)",
                    file=sys.stderr,
                )
            time.sleep(SLEEP)
    except KeyboardInterrupt:
        interrupted = True
        print("\ninterrupted; saving what resolved so far…", file=sys.stderr)

    # Always persist: an interrupted pass keeps its work, and re-running the
    # same command picks up where it stopped.
    flush()

    # The guard is a sanity check on THIS pass, and only meaningful once the
    # pass is big enough for a ratio to mean anything. It never discards work --
    # the data is already on disk -- it just makes a bad run exit loudly.
    ratio = failed / seen if seen else 0
    if seen >= 20 and ratio > MAX_UNRESOLVED:
        sys.exit(
            f"ABORT: {failed}/{seen} families unresolved "
            f"({ratio:.0%} > {MAX_UNRESOLVED:.0%}). Likely a bad token or a "
            "GitHub outage, not missing directories. Partial results were saved; "
            "re-run to resume."
        )

    remaining = sum(1 for r in records if "gfTtfCommitDate" not in r)
    nulls = sum(
        1 for r in records if r.get("gfTtfCommitDate") is None and "gfTtfCommitDate" in r
    )
    print(
        f"gfTtfCommitDate updated on {changed} records "
        f"({nulls} null, {failed} unresolved, {remaining} still pending) -> {path}",
        file=sys.stderr,
    )
    # Machine-readable change signal for the CI gate.
    print(f"gfttf-changed={changed}")

    if changed_out:
        with open(changed_out, "w", encoding="utf-8") as fh:
            fh.write(str(changed))

    if interrupted:
        sys.exit(130)


if __name__ == "__main__":
    main()
