#!/usr/bin/env python3
"""Backfill upstream-repo activity onto src/data/fonts.json.

Answers "is this font's own repo still maintained", which NOTHING else in the
dataset does:
  - lastModifiedApi is Google's *serving* date. Across 1942 published families
    it takes only 57 distinct values (353 of them share 2025-09-16), because
    Google re-serves families in batches. Sorting by it groups unrelated fonts.
  - modifiedMs is the TTF head-table stamp, i.e. when Google last *compiled*
    the binary, not when anyone touched the source.
  - The newest commit in google/fonts is worse still: 46/60 sampled families
    have a housekeeping commit on top (Google is mid-campaign adding
    upstream_info.md repo-wide), which would date most of the catalog to
    March 2026.

So we ask the family's OWN repository (METADATA.pb `source.repository_url`).

Signal: the DEFAULT BRANCH head commit date, not `pushedAt`.
`pushedAt` counts a push to any ref, including CI and dependabot branches on an
otherwise dead project. Measured over all 1275 repos: median gap to the default
head is 0 days, but 171 repos (13%) are inflated and 95 by over a year --
huertatipografica/Alegreya reports pushedAt 2026-06-10 while its master branch
has not moved since 2020-10-07 (the side branch `at-updates-pipeline` did), and
googlefonts/plex's newest branch is a dependabot postcss bump. Whatever GitHub
reports as the repo's default branch counts, whether it is named master, main,
or anything else.

Written per family (null for the 32 with no GitHub repository_url --
26 have none at all, 6 are on gitlab/sr.ht, which this does not query):
    upstreamHeadDate    ISO date, default-branch head    <- drives sort + filter
    upstreamAnyDate     ISO date, newest across branches <- stored, unused
    upstreamPushedAt    ISO date, raw pushedAt           <- diagnostics
    upstreamArchived    bool, repo is archived           <- Live/Archived facet
    upstreamRepoKey     "owner/name" actually resolved
    upstreamNewestTag   ISO date of the newest tag, or null

Forks count as normal activity (no special handling): a fork that receives
commits is being worked on.

`upstreamNewestTag` exists so the caller can spot families whose versionHistory
lags a new upstream release: when it is newer than the family's last
versionHistory date, that id needs backfill_version_history.py re-run. Written
to --stale-versions-out when given.

Cost: families are grouped by repo (1942 families -> 1275 distinct repos) and
queried through the GraphQL API in batches, so a WHOLE-CATALOG sweep is ~22
queries costing ~22 of the 5000/hr budget. That is why the daily workflow can
run this unconditionally instead of only over freshly harvested ids.

Usage:
    export $(grep GITHUB_TOKEN ../../.env)      # required, GraphQL needs auth
    python3 backfill_upstream_activity.py [path/to/fonts.json] \
        [--ids=a,b,c] [--limit N] [--stale-versions-out FILE] [--changed-out FILE]
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
# Repos per GraphQL query. Cost is 1 regardless (measured at 3, 50 and 60), so
# this only trades request count against response size and blast radius on a
# retry. 50 keeps each response comfortably small.
BATCH = 50
# Branch heads pulled per repo for upstreamAnyDate. Ordered newest-first, so a
# repo with more branches than this still yields the correct maximum.
BRANCH_PAGE = 100
# Refuse to write when more than this fraction of repos fail to resolve: that
# is a token/network fault, not 400 genuinely deleted repos.
MAX_UNRESOLVED = 0.20

# METADATA.pb is inconsistent about the host: 16 families (Inter, Cousine,
# Maven Pro, the Noto Serif CJK set...) write "www.github.com", which a
# bare github.com pattern silently skips, leaving their date null.
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
    """POST a GraphQL query, returning the `data` object (or None)."""
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
            # Partial errors are normal here: a deleted/renamed repo nulls its
            # own alias while the rest of the batch resolves fine.
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
        # A truncated response (IncompleteRead) is an HTTPException, NOT a
        # URLError, so it escaped the clause above and killed a whole sweep
        # mid-run. Retry it like any other transport hiccup.
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
        # GraphQL string literals: escape backslashes and quotes.
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
    """ISO date from a Commit or an annotated Tag node, or None."""
    if not node:
        return None
    t = node.get("target") or {}
    d = t.get("committedDate")
    if not d:
        # Annotated tag: the commit hangs one level deeper.
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

    # Group by repo: sibling families (Playwrite x104, Rubik x26, Plex x11)
    # share one upstream, so this is what turns ~1900 families into ~1275 calls.
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
            # A newer upstream tag than our last recorded release means the
            # version timeline is behind and this id needs a version backfill.
            vh = r.get("versionHistory") or []
            last_release = max((x["date"] for x in vh), default=None)
            tag = row["upstreamNewestTag"]
            if tag and (last_release is None or tag > last_release):
                stale.append(r["id"])

    # Families with no github repo still need the keys present, so the catalog
    # shape is uniform and the frontend can treat null as "unknown".
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
    # Machine-readable change signal for the CI gate.
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
