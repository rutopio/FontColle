"""Shared utilities for harvester scripts.

Eliminates boilerplate JSON load/save, path resolution, and arg parsing
that was duplicated across 14+ scripts.
"""

import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FONTS_JSON = os.path.join(_HERE, "..", "..", "src", "data", "fonts.json")


def resolve_dataset_path(argv=None):
    """Return the absolute path to fonts.json from CLI args or the default."""
    args = argv if argv is not None else sys.argv[1:]
    positional = [a for a in args if not a.startswith("--")]
    path = positional[0] if positional else DEFAULT_FONTS_JSON
    return os.path.abspath(path)


def load_dataset(path=None):
    """Load and return (records, path)."""
    if path is None:
        path = resolve_dataset_path()
    with open(path, encoding="utf-8") as fh:
        return json.load(fh), path


def save_dataset(records, path):
    """Write records back to the dataset file."""
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)


def parse_harvester_args(argv=None):
    """Parse common --ids=, --limit=, --force flags.

    Returns a dict: {path, ids: set|None, limit: int|None, force: bool}.
    """
    args = argv if argv is not None else sys.argv[1:]
    positional = [a for a in args if not a.startswith("--")]

    path = positional[0] if positional else DEFAULT_FONTS_JSON
    path = os.path.abspath(path)

    ids = None
    limit = None
    force = False

    for a in args:
        if a.startswith("--ids="):
            ids = {s for s in a.split("=", 1)[1].split(",") if s}
        elif a.startswith("--limit"):
            if "=" in a:
                limit = int(a.split("=", 1)[1])
            else:
                idx = args.index(a)
                limit = int(args[idx + 1]) if idx + 1 < len(args) else None
        elif a == "--force":
            force = True

    return {"path": path, "ids": ids, "limit": limit, "force": force}
