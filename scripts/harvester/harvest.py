#!/usr/bin/env python3
"""Harvest unified font metadata for a set of google/fonts families.

Per family:
  - Parse METADATA.pb (text protobuf) for category, designer, license, fonts, axes ranges.
  - Download the primary TTF and parse GSUB/GPOS features, fvar axes, named instances.
Outputs one merged JSON record per family conforming to a stable schema.
"""
import json, os, re, sys, urllib.request, urllib.parse, io, time, resource
from concurrent.futures import ThreadPoolExecutor, as_completed
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
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

# Dev-time cache for binary (TTF) downloads, mirroring the repo path under
# TTF_CACHE_DIR. Cached files are trusted as-is: delete the directory (or set
# TTF_CACHE=0) to force fresh downloads, e.g. for a release run.
CACHE_DIR = os.environ.get(
    "TTF_CACHE_DIR", os.path.join(os.path.dirname(__file__), "ttf_cache")
)
USE_CACHE = os.environ.get("TTF_CACHE", "1") != "0"

def _cache_path(url):
    if not url.startswith(RAW):
        return None
    rel = urllib.parse.unquote(url[len(RAW):]).lstrip("/")
    return os.path.join(CACHE_DIR, rel)

def fetch(url, binary=False, retries=3):
    cpath = _cache_path(url) if binary and USE_CACHE else None
    if cpath and os.path.isfile(cpath):
        with open(cpath, "rb") as fh:
            return fh.read()
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "font-harvester"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read() if binary else r.read().decode("utf-8")
            if cpath:
                # Atomic write so a concurrent worker never reads a torn file.
                os.makedirs(os.path.dirname(cpath), exist_ok=True)
                tmp = f"{cpath}.tmp.{os.getpid()}.{id(url)}"
                with open(tmp, "wb") as fh:
                    fh.write(data)
                os.replace(tmp, cpath)
            return data
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
        # source { repository_url: "..." }, the upstream GitHub repo. None when
        # the source block is absent (older fonts, API-supplemented families).
        "repository_url": scalar("repository_url"),
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

def _glyph_ymax(f, char):
    """yMax of `char`'s outline bounding box, via the font's glyph set (works
    for both glyf and CFF/CFF2 outlines since it goes through a pen, not raw
    glyf coordinates). None if the font has no cmap entry for `char` or the
    glyph has no contours (e.g. space)."""
    try:
        cmap = f.getBestCmap()
        gname = cmap.get(ord(char))
        if not gname:
            return None
        glyph_set = f.getGlyphSet()
        pen = BoundsPen(glyph_set)
        glyph_set[gname].draw(pen)
        if pen.bounds is None:
            return None
        return pen.bounds[3]  # (xMin, yMin, xMax, yMax)
    except Exception:
        return None


def _x_height(f, os2):
    if os2 is not None and getattr(os2, "version", 0) >= 2:
        v = getattr(os2, "sxHeight", 0)
        if v:
            return v
    return _glyph_ymax(f, "x")


def _cap_height(f, os2):
    if os2 is not None and getattr(os2, "version", 0) >= 2:
        v = getattr(os2, "sCapHeight", 0)
        if v:
            return v
    return _glyph_ymax(f, "H")


def _is_monospace(f, post):
    """post.isFixedPitch OR every non-zero hmtx advance width is equal."""
    if post is not None and getattr(post, "isFixedPitch", 0):
        return True
    if "hmtx" in f:
        widths = {aw for aw, _lsb in f["hmtx"].metrics.values() if aw}
        if len(widths) == 1:
            return True
    return False


def _has_hinting(f, outline_format):
    """True when fpgm or prep carries non-trivial bytecode. Only meaningful
    for glyf-flavored fonts; CFF fonts hint via CFF charstrings, not
    fpgm/prep, so this is null for them. Reads raw table bytes (cheap,
    no decompile) rather than the parsed Program object."""
    if outline_format != "glyf":
        return None
    for tag in ("fpgm", "prep"):
        if tag in f:
            try:
                data = f.reader[tag]
            except Exception:
                data = None
            if data and len(data) > 4:
                return True
    return False


def _vendor_id(os2):
    if os2 is None:
        return None
    v = (getattr(os2, "achVendID", None) or "").strip(" \x00")
    return v or None


def extract_style_metrics(f):
    """New per-family style metrics (§ style-metric filters): x-height,
    cap-height, italic angle, hhea/typo vertical metrics, avg char width,
    monospace/hinting/outline-format flags, vendor id, raw values in font
    units (ratios are derived later at the UI layer using units_per_em)."""
    os2 = f["OS/2"] if "OS/2" in f else None
    hhea = f["hhea"] if "hhea" in f else None
    post = f["post"] if "post" in f else None

    if "CFF2" in f:
        outline_format = "CFF2"
    elif "CFF " in f:
        outline_format = "CFF"
    elif "glyf" in f:
        outline_format = "glyf"
    else:
        outline_format = None

    return {
        "x_height": _x_height(f, os2),
        "cap_height": _cap_height(f, os2),
        "italic_angle": float(post.italicAngle) if post is not None else None,
        "hhea_ascender": hhea.ascender if hhea is not None else None,
        "hhea_descender": hhea.descender if hhea is not None else None,
        "hhea_line_gap": hhea.lineGap if hhea is not None else None,
        "typo_ascender": os2.sTypoAscender if os2 is not None else None,
        "typo_descender": os2.sTypoDescender if os2 is not None else None,
        "typo_line_gap": os2.sTypoLineGap if os2 is not None else None,
        "win_ascent": os2.usWinAscent if os2 is not None else None,
        "win_descent": os2.usWinDescent if os2 is not None else None,  # positive per spec
        # fsSelection bit 7 (USE_TYPO_METRICS): renderers should prefer the
        # sTypo* trio over win/hhea for default line height.
        "use_typo_metrics": bool(os2.fsSelection & 0x80) if os2 is not None else None,
        "avg_char_width": (os2.xAvgCharWidth or None) if os2 is not None else None,
        "is_monospace": _is_monospace(f, post),
        "outline_format": outline_format,
        "has_hinting": _has_hinting(f, outline_format),
        "vendor_id": _vendor_id(os2),
    }


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
    # the table directory, no parse cost.
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

    out.update(extract_style_metrics(f))

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
                parsed["file_size"] = len(raw)
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
                    parsed["file_size"] = len(raw)
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
        sys.exit(1)
