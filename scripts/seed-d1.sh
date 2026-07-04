#!/usr/bin/env bash
# Apply all generated seed chunks to D1. Pass --local or --remote.
# Regenerate chunks first: python3 scripts/harvester/to_seed_sql.py \
#   src/data/fonts.json src/lib/db/seed
set -euo pipefail

TARGET="${1:---local}"
shopt -s nullglob
chunks=(src/lib/db/seed.*.sql)

if [ ${#chunks[@]} -eq 0 ]; then
  echo "No seed chunks found. Generate them first (see header)." >&2
  exit 1
fi

for f in "${chunks[@]}"; do
  echo "==> seeding $f ($TARGET)"
  wrangler d1 execute font-finder-d1 "$TARGET" --file "$f"
done
echo "done: ${#chunks[@]} chunks applied to $TARGET"
