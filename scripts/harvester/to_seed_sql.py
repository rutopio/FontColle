#!/usr/bin/env python3
"""Emit idempotent SQL to seed/refresh D1 from the frontend dataset.

Reads a records file (same shape as public/fonts.json) and writes SQL that:
  - upserts each family by family_dir (stable key)
  - replaces that family's axes / features / instances

Run: python3 to_seed_sql.py ../../src/data/fonts.json ../../src/lib/db/seed.sql
Apply: wrangler d1 execute font-finder-d1 --local --file src/lib/db/seed.sql
"""
import json, sys, time

GPOS_TAGS = {"kern", "mark", "mkmk", "cpsp", "size", "palt", "vhal"}


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def emit(records, out):
    now = int(time.time() * 1000)
    lines = ["PRAGMA foreign_keys=ON;", "BEGIN TRANSACTION;"]
    for r in records:
        fam = r["id"]
        # Upsert family; content_hash is a cheap stable digest of the record.
        chash = str(abs(hash(json.dumps(r, sort_keys=True))) % (10**12))
        subsets = json.dumps(r.get("subsets", []), ensure_ascii=False)
        lines.append(
            "INSERT INTO family "
            "(family_dir,name,designer,category,primary_class,license,"
            "is_variable,subsets,primary_ttf,content_hash,updated_at) VALUES ("
            f"{q(fam)},{q(r['name'])},{q(r.get('designer'))},{q(r.get('category'))},"
            f"{q(r.get('class','Sans'))},{q(r.get('license'))},"
            f"{q(bool(r.get('isVariable')))},{q(subsets)},{q(r.get('primary_ttf'))},"
            f"{q(chash)},{now}) "
            "ON CONFLICT(family_dir) DO UPDATE SET "
            "name=excluded.name,designer=excluded.designer,category=excluded.category,"
            "primary_class=excluded.primary_class,license=excluded.license,"
            "is_variable=excluded.is_variable,subsets=excluded.subsets,"
            "primary_ttf=excluded.primary_ttf,content_hash=excluded.content_hash,"
            "updated_at=excluded.updated_at;"
        )
        # Clear + re-insert child rows for this family (idempotent refresh).
        fid = f"(SELECT id FROM family WHERE family_dir={q(fam)})"
        lines.append(f"DELETE FROM family_axis WHERE family_id={fid};")
        lines.append(f"DELETE FROM family_feature WHERE family_id={fid};")
        lines.append(f"DELETE FROM family_instance WHERE family_id={fid};")
        for a in r.get("axes", []):
            lines.append(
                "INSERT INTO family_axis "
                "(family_id,axis_tag,axis_name,min_value,default_value,max_value) VALUES ("
                f"{fid},{q(a['tag'])},{q(a.get('name'))},{q(a.get('min'))},"
                f"{q(a.get('default'))},{q(a.get('max'))});"
            )
        for feat in r.get("features", []):
            kind = "GPOS" if feat in GPOS_TAGS else "GSUB"
            lines.append(
                "INSERT INTO family_feature (family_id,feature_tag,table_kind) VALUES ("
                f"{fid},{q(feat)},{q(kind)});"
            )
        for inst in r.get("instances", []):
            coords = json.dumps(inst.get("coords", {}))
            lines.append(
                "INSERT INTO family_instance (family_id,name,coords) VALUES ("
                f"{fid},{q(inst.get('name'))},{q(coords)});"
            )
    lines.append("COMMIT;")
    with open(out, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"wrote {len(records)} families -> {out} ({len(lines)} statements)")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "../../src/data/fonts.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "../../src/lib/db/seed.sql"
    emit(json.load(open(src)), out)
