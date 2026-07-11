#!/usr/bin/env python3
"""Emit idempotent SQL to seed/refresh D1 from the frontend dataset.

For the full ~2000-family catalog the output is split into chunk files
(seed.000.sql, seed.001.sql, …) so each stays within D1's --file limits.

Run:   python3 to_seed_sql.py ../../src/data/fonts.json ../../src/lib/db/seed
Apply: for f in src/lib/db/seed.*.sql; do \
         wrangler d1 execute font-finder-d1 --remote --file "$f"; done
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


def statements_for(r, now):
    """SQL statements to upsert one family and replace its child rows."""
    lines = []
    fam = r["id"]
    chash = str(abs(hash(json.dumps(r, sort_keys=True))) % (10**12))
    subsets = json.dumps(r.get("subsets", []), ensure_ascii=False)
    weights = json.dumps(r.get("weights", []))
    cjk_cov = json.dumps(r.get("cjkCoverage", {}))
    color_tables = json.dumps(r.get("colorTables", []))
    tags = json.dumps(r.get("tags", {}), ensure_ascii=False)
    version_history = json.dumps(r.get("versionHistory", []), ensure_ascii=False)
    cols = (
        "family_dir,name,display_name,designer,category,primary_class,license,license_dir,"
        "is_variable,subsets,primary_ttf,version,version_string,created_ms,"
        "modified_ms,date_added,first_commit_date,weight_class,width_class,weights,fs_type,glyph_count,"
        "char_count,units_per_em,has_stat,color_tables,primary_script,panose,cjk_coverage,"
        "is_published,popularity_rank,trending_rank,last_modified,version_history,specimen,tags,"
        "x_height,cap_height,italic_angle,hhea_ascender,hhea_descender,hhea_line_gap,"
        "typo_ascender,typo_descender,typo_line_gap,win_ascent,win_descent,"
        "use_typo_metrics,avg_char_width,contrast,is_monospace,has_hinting,vendor_id,file_size,"
        "repository_url,is_noto,is_brand_font,is_open_source,"
        "content_hash,updated_at"
    )
    vals = (
        f"{q(fam)},{q(r['name'])},{q(r.get('displayName'))},{q(r.get('designer'))},{q(r.get('category'))},"
        f"{q(r.get('class','Sans'))},{q(r.get('license'))},{q(r.get('licenseDir'))},"
        f"{q(bool(r.get('isVariable')))},{q(subsets)},{q(r.get('primaryTtf'))},"
        f"{q(r.get('version'))},{q(r.get('versionString'))},{q(r.get('createdMs'))},"
        f"{q(r.get('modifiedMs'))},{q(r.get('dateAdded'))},{q(r.get('firstCommitDate'))},{q(r.get('weightClass'))},"
        f"{q(r.get('widthClass'))},{q(weights)},{q(r.get('fsType'))},{q(r.get('glyphCount'))},"
        f"{q(r.get('charCount'))},{q(r.get('unitsPerEm'))},{q(bool(r.get('hasStat')))},"
        f"{q(color_tables)},"
        f"{q(r.get('primaryScript'))},{q(r.get('panose'))},{q(cjk_cov)},"
        f"{q(bool(r.get('isPublished', True)))},{q(r.get('popularityRank'))},"
        f"{q(r.get('trendingRank'))},{q(r.get('lastModifiedApi'))},{q(version_history)},{q(r.get('specimen'))},"
        f"{q(tags)},"
        f"{q(r.get('xHeight'))},{q(r.get('capHeight'))},{q(r.get('italicAngle'))},"
        f"{q(r.get('hheaAscender'))},{q(r.get('hheaDescender'))},{q(r.get('hheaLineGap'))},"
        f"{q(r.get('typoAscender'))},{q(r.get('typoDescender'))},{q(r.get('typoLineGap'))},"
        f"{q(r.get('winAscent'))},{q(r.get('winDescent'))},"
        f"{q(bool(r['useTypoMetrics']) if r.get('useTypoMetrics') is not None else None)},"
        f"{q(r.get('avgCharWidth'))},{q(r.get('contrast'))},"
        f"{q(bool(r['isMonospace']) if r.get('isMonospace') is not None else None)},"
        f"{q(bool(r['hasHinting']) if r.get('hasHinting') is not None else None)},"
        f"{q(r.get('vendorId'))},{q(r.get('fileSize'))},"
        f"{q(r.get('repositoryUrl'))},"
        f"{q(bool(r['isNoto']) if r.get('isNoto') is not None else None)},"
        f"{q(bool(r['isBrandFont']) if r.get('isBrandFont') is not None else None)},"
        f"{q(bool(r['isOpenSource']) if r.get('isOpenSource') is not None else None)},"
        f"{q(chash)},{now}"
    )
    update = ",".join(
        f"{c}=excluded.{c}"
        for c in cols.split(",")
        if c != "family_dir"
    )
    lines.append(
        f"INSERT INTO family ({cols}) VALUES ({vals}) "
        f"ON CONFLICT(family_dir) DO UPDATE SET {update};"
    )
    fid = f"(SELECT id FROM family WHERE family_dir={q(fam)})"
    lines.append(f"DELETE FROM family_axis WHERE family_id={fid};")
    lines.append(f"DELETE FROM family_feature WHERE family_id={fid};")
    lines.append(f"DELETE FROM family_instance WHERE family_id={fid};")
    lines.append(f"DELETE FROM family_language WHERE family_id={fid};")
    lines.append(f"DELETE FROM family_script WHERE family_id={fid};")
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
            "INSERT INTO family_instance (family_id,name,coords,italic) VALUES ("
            f"{fid},{q(inst.get('name'))},{q(coords)},{q(bool(inst.get('italic')))});"
        )
    for lid in r.get("languages", []):
        lines.append(
            "INSERT INTO family_language (family_id,lang_id) VALUES ("
            f"{fid},{q(lid)});"
        )
    for script in r.get("scripts", []):
        lines.append(
            "INSERT INTO family_script (family_id,script) VALUES ("
            f"{fid},{q(script)});"
        )
    return lines


def emit(records, out_prefix, chunk_families=250):
    now = int(time.time() * 1000)
    total_stmts = 0
    files = 0
    for i in range(0, len(records), chunk_families):
        chunk = records[i : i + chunk_families]
        lines = []
        for r in chunk:
            lines.extend(statements_for(r, now))
        path = f"{out_prefix}.{files:03d}.sql"
        with open(path, "w") as fh:
            fh.write("\n".join(lines) + "\n")
        total_stmts += len(lines)
        files += 1
        print(f"  {path}: {len(chunk)} families, {len(lines)} statements")
    print(f"wrote {len(records)} families across {files} files ({total_stmts} statements)")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "../../src/data/fonts.json"
    out_prefix = sys.argv[2] if len(sys.argv) > 2 else "../../src/lib/db/seed"
    emit(json.load(open(src)), out_prefix)
