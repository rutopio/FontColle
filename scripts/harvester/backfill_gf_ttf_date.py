#!/usr/bin/env python3
"""Backfill `gfTtfCommitDate`: newest commit touching .ttf/.otf in google/fonts.

Scoped to font files (not directory-wide) to skip metadata housekeeping commits.
Resumable with periodic checkpoints; --shard=i/n for daily rotation.

    GITHUB_TOKEN=... python3 backfill_gf_ttf_date.py [fonts.json] [--shard=i/n]
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
MAX_UNRESOLVED = 0.20
SLEEP = 0.05
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
        except http.client.HTTPException as e:
            print(
                f"    truncated response ({type(e).__name__}), retrying…",
                file=sys.stderr,
            )
            time.sleep(2**attempt)
    return None, 0


def font_files(directory, tok):
    """(names, ok). 404 = ([], True), not a failure."""
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
    """Stable shard assignment (md5, not hash() which is salted)."""
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

    flush()

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
    print(f"gfttf-changed={changed}")

    if changed_out:
        with open(changed_out, "w", encoding="utf-8") as fh:
            fh.write(str(changed))

    if interrupted:
        sys.exit(130)


if __name__ == "__main__":
    main()
