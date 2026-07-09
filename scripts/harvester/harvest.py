#!/usr/bin/env python3
"""Harvest unified font metadata for a set of google/fonts families.

Per family:
  - Parse METADATA.pb (text protobuf) for category, designer, license, fonts, axes ranges.
  - Download the primary TTF and parse GSUB/GPOS features, fvar axes, named instances.
Outputs one merged JSON record per family conforming to a stable schema.
"""
import json, re, sys, urllib.request, urllib.parse, io, time, resource
from concurrent.futures import ThreadPoolExecutor, as_completed
from fontTools.ttLib import TTFont
import langcov

RAW = "https://raw.githubusercontent.com/google/fonts/main"

# sfnt tags of the color tables we report. "SVG " carries its padding space.
# CPAL/CBLC are companion tables (palettes / bitmap locations) and are recorded
# alongside their primary, since a font is only well-formed with both.
COLOR_TABLES = ("COLR", "CPAL", "SVG ", "sbix", "CBDT", "CBLC")

# Human weight names for synthesizing static-family style names (Thin..Black).
WEIGHT_NAMES = {
    100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular",
    500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black",
}

def fetch(url, binary=False, retries=3):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "font-harvester"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read() if binary else r.read().decode("utf-8")
        except Exception as e:
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise last

def parse_metadata_pb(text):
    """Minimal text-protobuf parser for the fields we care about."""
    def scalar(key):
        m = re.search(rf'^\s*{key}:\s*"?([^"\n]+)"?', text, re.M)
        return m.group(1).strip() if m else None
    meta = {
        "name": scalar("name"),
        "designer": scalar("designer"),
        "category": scalar("category"),
        "license": scalar("license"),
        "subsets": re.findall(r'subsets:\s*"([^"]+)"', text),
        "date_added": scalar("date_added"),      # e.g. "2010-08-17"
        "primary_script": scalar("primary_script"),  # e.g. "Latn"
        "stroke": scalar("stroke"),              # SERIF / SANS_SERIF stroke class
        "classifications": re.findall(r'classifications:\s*"([^"]+)"', text),
    }
    # fonts { ... } blocks -> weights/styles
    fonts = []
    for blk in re.findall(r'fonts\s*\{(.*?)\}', text, re.S):
        w = re.search(r'weight:\s*(\d+)', blk)
        s = re.search(r'style:\s*"?(\w+)"?', blk)
        fn = re.search(r'filename:\s*"([^"]+)"', blk)
        fonts.append({
            "weight": int(w.group(1)) if w else None,
            "style": s.group(1) if s else None,
            "filename": fn.group(1) if fn else None,
        })
    meta["fonts"] = fonts
    # axes { tag ... min_value ... max_value } blocks (VF range from metadata)
    axes = []
    for blk in re.findall(r'axes\s*\{(.*?)\}', text, re.S):
        tag = re.search(r'tag:\s*"([^"]+)"', blk)
        lo = re.search(r'min_value:\s*([\d.\-]+)', blk)
        hi = re.search(r'max_value:\s*([\d.\-]+)', blk)
        if tag:
            axes.append({"tag": tag.group(1),
                         "min": float(lo.group(1)) if lo else None,
                         "max": float(hi.group(1)) if hi else None})
    meta["metadata_axes"] = axes
    return meta

# OpenType epoch: 1904-01-01. head.created/modified are seconds since then.
_MAC_EPOCH_OFFSET = 2082844800  # seconds between 1904-01-01 and 1970-01-01

def _epoch_ms(long_datetime):
    """head created/modified (secs since 1904) -> unix epoch ms, or None."""
    try:
        return int((long_datetime - _MAC_EPOCH_OFFSET) * 1000)
    except Exception:
        return None

def parse_ttf(raw_bytes):
    f = TTFont(io.BytesIO(raw_bytes), lazy=True)
    nm = f["name"]
    out = {"axes": [], "named_instances": [], "gsub_features": [], "gpos_features": [],
           "is_variable": "fvar" in f}

    if "fvar" in f:
        for a in f["fvar"].axes:
            out["axes"].append({
                "tag": a.axisTag,
                "name": nm.getDebugName(a.axisNameID) if a.axisNameID else None,
                "min": a.minValue, "default": a.defaultValue, "max": a.maxValue,
            })
        for inst in f["fvar"].instances:
            out["named_instances"].append({
                "name": nm.getDebugName(inst.subfamilyNameID),
                "coords": {k: v for k, v in inst.coordinates.items()},
            })
    for tag in ("GSUB", "GPOS"):
        feats = set()
        if tag in f and f[tag].table.FeatureList:
            for fr in f[tag].table.FeatureList.FeatureRecord:
                feats.add(fr.FeatureTag)
        out[tag.lower() + "_features"] = sorted(feats)

    # --- archival metadata (flat scalars, no blob) ---
    head = f["head"] if "head" in f else None
    os2 = f["OS/2"] if "OS/2" in f else None
    cmap = {}
    try:
        cmap = f.getBestCmap()
    except Exception:
        pass

    # Characters this file covers, for language-coverage math (kept out of the
    # emitted record; the caller unions them across a family's files).
    out["_cmap_chars"] = {chr(cp) for cp in cmap.keys()} if cmap else set()

    out["version"] = round(head.fontRevision, 4) if head else None
    out["version_string"] = nm.getDebugName(5)  # "Version 1.085"
    out["created_ms"] = _epoch_ms(head.created) if head else None
    out["modified_ms"] = _epoch_ms(head.modified) if head else None
    out["weight_class"] = os2.usWeightClass if os2 else None
    out["width_class"] = os2.usWidthClass if os2 else None
    out["fs_type"] = os2.fsType if os2 else None  # embedding permission bits
    out["glyph_count"] = f["maxp"].numGlyphs if "maxp" in f else None
    out["char_count"] = len(cmap)
    out["units_per_em"] = head.unitsPerEm if head else None
    out["has_stat"] = "STAT" in f
    # Color-table presence, in table-directory order. A font may carry several at
    # once (6 GF families ship both COLR and OpenType-SVG so old renderers can
    # fall back), so this is a list, not an enum. lazy=True means `in` only reads
    # the table directory — no parse cost.
    out["color_tables"] = [t for t in COLOR_TABLES if t in f]
    if os2 and hasattr(os2, "panose"):
        p = os2.panose
        out["panose"] = [p.bFamilyType, p.bSerifStyle, p.bWeight, p.bProportion,
                         p.bContrast, p.bStrokeVariation, p.bArmStyle, p.bLetterForm,
                         p.bMidline, p.bXHeight]
    else:
        out["panose"] = None
    # Unicode block coverage bits (OS/2 ulUnicodeRange1..4) as a compact int list
    if os2:
        out["unicode_ranges"] = [getattr(os2, f"ulUnicodeRange{i}", 0) for i in (1, 2, 3, 4)]
    else:
        out["unicode_ranges"] = None

    f.close()
    return out

def _vf_files(meta):
    """VF filenames from METADATA (name contains '['), in metadata order."""
    return [f["filename"] for f in (meta.get("fonts") or [])
            if f.get("filename") and "[" in f["filename"]]


def _synth_static_instances(meta):
    """Static family: its 'styles' ARE the METADATA fonts[] entries (static
    files expose no fvar instances). Synthesize one instance per file with a
    name from weight+style and an italic flag."""
    out = []
    for fo in meta.get("fonts") or []:
        w = fo.get("weight")
        italic = (fo.get("style") or "").lower() == "italic"
        base = WEIGHT_NAMES.get(w, str(w) if w is not None else "Regular")
        if italic:
            name = "Italic" if base == "Regular" else f"{base} Italic"
        else:
            name = base
        out.append({
            "name": name,
            "coords": {"wght": w} if w is not None else {},
            "italic": bool(italic),
        })
    return out


def harvest(entry):
    """entry is "license\tfamily_dir" (license in ofl/apache/ufl)."""
    if "\t" in entry:
        license_dir, family_dir = entry.split("\t", 1)
    else:
        license_dir, family_dir = "ofl", entry
    base = f"{RAW}/{license_dir}/{family_dir}"
    rec = {"family_dir": family_dir, "license_dir": license_dir, "_stats": {}}
    md_text = fetch(f"{base}/METADATA.pb")
    meta = parse_metadata_pb(md_text)
    rec.update(meta)

    vf_files = _vf_files(meta)
    cmap_chars = set()          # union across all parsed files, for langcov
    instances = []              # merged named instances, tagged italic
    total_bytes = t_dl = t_parse = 0.0

    if vf_files:
        # Variable family: parse EVERY VF file (upright + italic + others).
        # Family-level metadata (axes/features/OS2) comes from the FIRST file
        # (the upright primary) to avoid double-counting; per-file named
        # instances are merged, tagged with the file's style.
        primary_ttf = vf_files[0]
        rec["primary_ttf"] = primary_ttf
        primary_parsed = None
        for fname in vf_files:
            is_italic = "italic" in fname.lower()
            url = f"{base}/{urllib.parse.quote(fname)}"
            t0 = time.time()
            raw = fetch(url, binary=True)
            t_dl += time.time() - t0
            t1 = time.time()
            parsed = parse_ttf(raw)
            t_parse += time.time() - t1
            total_bytes += len(raw)
            cmap_chars |= parsed.pop("_cmap_chars", set())
            for inst in parsed.get("named_instances", []):
                instances.append({**inst, "italic": is_italic})
            if fname == primary_ttf:
                primary_parsed = parsed
        # Family record uses the upright primary's axes/features/metrics.
        primary_parsed["named_instances"] = instances
        rec["ttf"] = primary_parsed
    else:
        # Static family: one file per cut; parse the primary for metadata and
        # union all files' cmaps for language coverage. Styles are synthesized
        # from METADATA fonts[] (static files have no fvar instances).
        fonts = meta.get("fonts") or []
        primary_ttf = fonts[0]["filename"] if fonts and fonts[0].get("filename") else None
        rec["primary_ttf"] = primary_ttf
        if primary_ttf:
            for fo in fonts:
                fname = fo.get("filename")
                if not fname:
                    continue
                url = f"{base}/{urllib.parse.quote(fname)}"
                t0 = time.time()
                raw = fetch(url, binary=True)
                t_dl += time.time() - t0
                total_bytes += len(raw)
                if fname == primary_ttf:
                    t1 = time.time()
                    parsed = parse_ttf(raw)
                    t_parse += time.time() - t1
                    cmap_chars |= parsed.pop("_cmap_chars", set())
                    rec["ttf"] = parsed
                else:
                    # Non-primary static cuts: only union the cmap (cheap).
                    try:
                        tf = TTFont(io.BytesIO(raw), lazy=True)
                        cm = tf.getBestCmap()
                        cmap_chars |= {chr(cp) for cp in cm.keys()}
                        tf.close()
                    except Exception:
                        pass
            if "ttf" in rec:
                rec["ttf"]["named_instances"] = _synth_static_instances(meta)

    # Language / writing-system coverage over the family's union cmap.
    langs, scripts, cjk_cov = langcov.coverage(cmap_chars, meta.get("subsets"))
    rec["languages"] = langs
    rec["scripts"] = scripts
    rec["cjk_coverage"] = cjk_cov

    rec["_stats"] = {"ttf_bytes": int(total_bytes), "dl_s": round(t_dl, 2),
                     "parse_s": round(t_parse, 2),
                     "files": (len(vf_files) or len(meta.get("fonts") or []))}
    return rec

def peak_mem_mb():
    # ru_maxrss is bytes on macOS, KB on Linux
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return rss / (1024 * 1024) if sys.platform == "darwin" else rss / 1024

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "-":
        families = [l.strip() for l in sys.stdin if l.strip()]
    else:
        families = sys.argv[1:]
    results, errors = [], []
    run_t0 = time.time()
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(harvest, fam): fam for fam in families}
        for fut in as_completed(futs):
            fam = futs[fut]
            done += 1
            try:
                r = fut.result()
                results.append(r)
                st = r.get("_stats", {})
                mb = st.get("ttf_bytes", 0) / 1e6
                axc = len(r.get("ttf", {}).get("axes", []))
                fc = len(r.get("ttf", {}).get("gsub_features", []))
                flag = " <== BIG" if mb > 5 else ""
                print(f"[{done:3d}/{len(families)}] ok {fam:22s} {mb:6.1f}MB "
                      f"dl={st.get('dl_s',0):4.1f}s parse={st.get('parse_s',0):4.1f}s "
                      f"vf={r.get('ttf',{}).get('is_variable')} axes={axc} gsub={fc}{flag}",
                      file=sys.stderr)
            except Exception as e:
                errors.append((fam, repr(e)))
                print(f"[{done:3d}/{len(families)}] ERR {fam}: {e}", file=sys.stderr)
    total = time.time() - run_t0
    with open("stress_output.json", "w") as fh:
        json.dump(results, fh, indent=2, default=str, ensure_ascii=False)
    print(f"\n=== SUMMARY ===", file=sys.stderr)
    print(f"ok={len(results)} err={len(errors)} total_time={total:.1f}s "
          f"peak_mem={peak_mem_mb():.0f}MB", file=sys.stderr)
    if errors:
        print("errors:", file=sys.stderr)
        for fam, e in errors:
            print(f"  {fam}: {e}", file=sys.stderr)
