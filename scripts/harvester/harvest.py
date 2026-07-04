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

RAW = "https://raw.githubusercontent.com/google/fonts/main"

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

def parse_ttf(raw_bytes):
    f = TTFont(io.BytesIO(raw_bytes), lazy=True)
    out = {"axes": [], "named_instances": [], "gsub_features": [], "gpos_features": [],
           "is_variable": "fvar" in f}
    if "fvar" in f:
        nm = f["name"]
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
    f.close()
    return out

def pick_primary_ttf(family_dir, meta):
    """Prefer a VF file (has [ in name), else the metadata's first font filename."""
    # Try listing the dir to find a VF file
    api = f"https://api.github.com/repos/google/fonts/contents/ofl/{family_dir}?ref=main"
    try:
        listing = json.loads(fetch(api))
        ttfs = [x["name"] for x in listing if x["name"].endswith(".ttf")]
        vf = [n for n in ttfs if "[" in n]
        if vf:
            return vf[0]
        if ttfs:
            return ttfs[0]
    except Exception:
        pass
    if meta["fonts"]:
        return meta["fonts"][0]["filename"]
    return None

def harvest(family_dir):
    rec = {"family_dir": family_dir, "_stats": {}}
    md_text = fetch(f"{RAW}/ofl/{family_dir}/METADATA.pb")
    meta = parse_metadata_pb(md_text)
    rec.update(meta)
    ttf_name = pick_primary_ttf(family_dir, meta)
    rec["primary_ttf"] = ttf_name
    if ttf_name:
        url = f"{RAW}/ofl/{family_dir}/{urllib.parse.quote(ttf_name)}"
        t0 = time.time()
        raw = fetch(url, binary=True)
        t_dl = time.time() - t0
        t1 = time.time()
        rec["ttf"] = parse_ttf(raw)
        t_parse = time.time() - t1
        rec["_stats"] = {"ttf_bytes": len(raw), "dl_s": round(t_dl, 2),
                         "parse_s": round(t_parse, 2)}
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
