#!/usr/bin/env python3
"""Backfill upstream-repo activity (default-branch head date, not pushedAt).

Groups families by repo and queries via GraphQL in batches (~22 calls for the
whole catalog). Uses default-branch head, not pushedAt (inflated by CI/dependabot).

    GITHUB_TOKEN=... python3 backfill_upstream_activity.py [fonts.json] [--ids=a,b,c]
"""
import http.client
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

GRAPHQL = "https://api.github.com/graphql"
BATCH = 50
BRANCH_PAGE = 100
MAX_UNRESOLVED = 0.20

# Handles both github.com and www.github.com (METADATA.pb is inconsistent).
REPO_RE = re.compile(r"https?://(?:www\.)?github\.com/([^/]+)/([^/#?]+)")


def repo_key(url):
    """('owner', 'name') from a github.com URL, or None for other hosts."""
    m = REPO_RE.match((url or "").rstrip("/"))
    if not m:
        return None
    return m.group(1), m.group(2).removesuffix(".git")


def _token():
    tok = os.environ.get("GITHUB_TOKEN")
    if not tok:
        sys.exit("GITHUB_TOKEN is required (the GraphQL API rejects anonymous calls)")
    return tok


def gql(query, tok, retries=4):
    """POST a GraphQL query; returns `data` or None."""
    body = json.dumps({"query": query}).encode()
    for attempt in range(retries):
        req = urllib.request.Request(
            GRAPHQL,
            data=body,
            headers={
                "Authorization": f"Bearer {tok}",
                "Content-Type": "application/json",
                "User-Agent": "font-harvester/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                payload = json.load(r)
            return payload.get("data")
        except urllib.error.HTTPError as e:
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
    return None


def build_query(chunk):
    """One aliased `repository` selection per repo in the chunk."""
    parts = []
    for i, (owner, name) in enumerate(chunk):
        o = owner.replace("\\", "\\\\").replace('"', '\\"')
        n = name.replace("\\", "\\\\").replace('"', '\\"')
        parts.append(
            f'r{i}: repository(owner: "{o}", name: "{n}") {{'
            " nameWithOwner pushedAt isArchived"
            " defaultBranchRef { name target { ... on Commit { committedDate } } }"
            f' branches: refs(refPrefix: "refs/heads/", first: {BRANCH_PAGE},'
            " orderBy: {field: TAG_COMMIT_DATE, direction: DESC})"
            " { nodes { target { ... on Commit { committedDate } } } }"
            ' tags: refs(refPrefix: "refs/tags/", first: 1,'
            " orderBy: {field: TAG_COMMIT_DATE, direction: DESC})"
            " { nodes { target { ... on Commit { committedDate }"
            " ... on Tag { target { ... on Commit { committedDate } } } } } }"
            " }"
        )
    return "query { " + " ".join(parts) + " rateLimit { cost remaining } }"


def _commit_date(node):
    """ISO date from a Commit or annotated Tag node, or None."""
    if not node:
        return None
    t = node.get("target") or {}
    d = t.get("committedDate")
    if not d:
        d = ((t.get("target") or {}).get("committedDate")) if t.get("target") else None
    return d[:10] if d else None


def parse_repo(v):
    """The stored shape for one resolved repository node."""
    default_date = None
    dbr = v.get("defaultBranchRef") or {}
    if dbr.get("target"):
        default_date = (dbr["target"].get("committedDate") or "")[:10] or None

    any_date = default_date
    for node in ((v.get("branches") or {}).get("nodes") or []):
        d = _commit_date(node)
        if d and (any_date is None or d > any_date):
            any_date = d

    tag_date = None
    tags = (v.get("tags") or {}).get("nodes") or []
    if tags:
        tag_date = _commit_date(tags[0])

    return {
        "upstreamRepoKey": v.get("nameWithOwner"),
        "upstreamHeadDate": default_date,
        "upstreamAnyDate": any_date,
        "upstreamPushedAt": (v.get("pushedAt") or "")[:10] or None,
        "upstreamArchived": bool(v.get("isArchived")),
        "upstreamNewestTag": tag_date,
    }


NULL_ROW = {
    "upstreamRepoKey": None,
    "upstreamHeadDate": None,
    "upstreamAnyDate": None,
    "upstreamPushedAt": None,
    "upstreamArchived": None,
    "upstreamNewestTag": None,
}


def sweep(repos, tok):
    """{(owner,name): row} for every repo we could resolve."""
    out = {}
    keys = list(repos)
    cost = 0
    for i in range(0, len(keys), BATCH):
        chunk = keys[i : i + BATCH]
        data = gql(build_query(chunk), tok)
        if data is None:
            print(f"    batch {i // BATCH + 1} failed, skipping", file=sys.stderr)
            continue
        rl = data.get("rateLimit") or {}
        cost += rl.get("cost", 0)
        for j, key in enumerate(chunk):
            v = data.get(f"r{j}")
            if v:
                out[key] = parse_repo(v)
        print(
            f"  {min(i + BATCH, len(keys))}/{len(keys)} repos "
            f"(cost {cost}, remaining {rl.get('remaining', '?')})",
            file=sys.stderr,
        )
    print(f"graphql cost: {cost} points for {len(keys)} repos", file=sys.stderr)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ids = None
    limit = None
    stale_out = None
    changed_out = None
    for a in sys.argv[1:]:
        if a.startswith("--ids="):
            ids = {s for s in a.split("=", 1)[1].split(",") if s}
        elif a.startswith("--limit="):
            limit = int(a.split("=", 1)[1])
        elif a.startswith("--stale-versions-out="):
            stale_out = a.split("=", 1)[1]
        elif a.startswith("--changed-out="):
            changed_out = a.split("=", 1)[1]

    path = args[0] if args else os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "data", "fonts.json"
    )
    path = os.path.abspath(path)

    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)

    if ids is not None:
        targets = [r for r in records if r["id"] in ids]
    else:
        targets = records[:limit] if limit else records

    by_repo = {}
    for r in targets:
        key = repo_key(r.get("repositoryUrl"))
        if key:
            by_repo.setdefault(key, []).append(r)

    print(
        f"{len(targets)} families -> {len(by_repo)} distinct github repos",
        file=sys.stderr,
    )
    if not by_repo:
        print("nothing to sweep", file=sys.stderr)
        return

    resolved = sweep(by_repo, _token())

    unresolved = len(by_repo) - len(resolved)
    ratio = unresolved / len(by_repo)
    if ratio > MAX_UNRESOLVED:
        sys.exit(
            f"ABORT: {unresolved}/{len(by_repo)} repos unresolved "
            f"({ratio:.0%} > {MAX_UNRESOLVED:.0%}); refusing to write. "
            "Likely a bad token or a GitHub outage, not dead repos."
        )

    changed = 0
    stale = []
    for key, fams in by_repo.items():
        row = resolved.get(key, NULL_ROW)
        for r in fams:
            if any(r.get(k) != v for k, v in row.items()):
                changed += 1
            r.update(row)
            vh = r.get("versionHistory") or []
            last_release = max((x["date"] for x in vh), default=None)
            tag = row["upstreamNewestTag"]
            if tag and (last_release is None or tag > last_release):
                stale.append(r["id"])

    for r in targets:
        if not repo_key(r.get("repositoryUrl")):
            if any(r.get(k) != v for k, v in NULL_ROW.items()):
                changed += 1
            r.update(NULL_ROW)

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)

    archived = sum(1 for r in targets if r.get("upstreamArchived"))
    print(
        f"upstream activity updated on {changed}/{len(targets)} records "
        f"({archived} archived, {unresolved} repos unresolved) -> {path}",
        file=sys.stderr,
    )
    print(f"upstream-changed={changed}")

    if stale_out:
        with open(stale_out, "w", encoding="utf-8") as fh:
            fh.write("\n".join(sorted(set(stale))))
        print(f"stale-versions={len(set(stale))}")
    if changed_out:
        with open(changed_out, "w", encoding="utf-8") as fh:
            fh.write(str(changed))


if __name__ == "__main__":
    main()
