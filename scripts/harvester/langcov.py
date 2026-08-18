#!/usr/bin/env python3
"""Language/script coverage: alphabetic by exemplar ratio, CJK by subset tags."""
from functools import lru_cache

import gflanguages
import langcodes
from gftools.util.google_fonts import parse

ALPHA_THRESHOLD = 0.98

CJK_SCRIPTS = {"Hant", "Hans", "Jpan", "Kore", "Hani", "Kana", "Hira", "Bopo"}

SUBSET_TO_CJK_LANG = {
    "chinese-traditional": "zh_Hant",
    "chinese-hongkong": "zh_Hant",
    "chinese-simplified": "zh_Hans",
    "japanese": "ja_Jpan",
    "korean": "ko_Kore",
}
CJK_RATIO_LANGS = ["zh_Hant", "zh_Hans", "ja_Jpan", "ko_Kore"]
EMOJI_SAMPLE = "🥰💀✌️🌴🐢🐐🍄⚽🍻👑📸😬👀🚨🏡🕊️🏆😻🌟🧿🍀🎨🍜"

# HK -> Cantonese, not Wu (matches Google Fonts).
SUBSET_TO_SPECIMEN_LANG = {
    "chinese-hongkong": "yue_Hant",
    "chinese-traditional": "zh_Hant",
    "chinese-simplified": "zh_Hans",
    "japanese": "ja_Jpan",
    "korean": "ko_Kore",
}


@lru_cache(maxsize=1)
def _languages():
    return gflanguages.LoadLanguages()


@lru_cache(maxsize=1)
def _scripts():
    return gflanguages.LoadScripts()


# Must match LANGUAGE_REGIONS in src/lib/fonts/labels.ts.
NO_REGION = "Constructed & historical"
REGION_ORDER = ["Africa", "Americas", "Asia", "Europe", "Oceania", NO_REGION]


@lru_cache(maxsize=1)
def _country_region_group():
    """CLDR country code -> continent group."""
    out = {}
    for rid, reg in gflanguages.LoadRegions().items():
        if reg.region_group:
            out[rid] = reg.region_group[0]
    return out


def language_regions(lang):
    """All continents a language is spoken on, in LANGUAGE_REGIONS order."""
    groups = _country_region_group()
    found = {groups[c] for c in lang.region if c in groups}
    if not found:
        try:
            territory = langcodes.Language.get(lang.language).maximize().territory
        except Exception:
            territory = None
        g = groups.get(territory) if territory else None
        if g:
            found = {g}
    if not found:
        return [NO_REGION]
    return [r for r in REGION_ORDER if r in found]


@lru_cache(maxsize=1)
def _lang_exemplars():
    """lang_id -> (script, set(base codepoints)); skip langs without a base."""
    out = {}
    for lid, lang in _languages().items():
        base = lang.exemplar_chars.base if lang.exemplar_chars else ""
        if not base:
            continue
        cps = parse(base)
        if cps:
            out[lid] = (lang.script, cps)
    return out


def script_name(code):
    s = _scripts().get(code)
    return s.name if s is not None else code


def language_label_map():
    """lang_id -> {name, script, population, regions} for the frontend."""
    out = {}
    for lid, lang in _languages().items():
        out[lid] = {
            "name": lang.name,
            "script": lang.script,
            "population": lang.population or 0,
            "regions": language_regions(lang),
        }
    return out


def script_label_map():
    """script code -> human name (Latn -> "Latin")."""
    return {code: s.name for code, s in _scripts().items()}


def _sample_string(st):
    """Sample sentence from gflanguages sample_text (styles > tester > masthead)."""
    if not st:
        return ""
    return (
        st.styles
        or st.tester
        or st.masthead_full
        or st.masthead_partial
        or ""
    ).strip()


@lru_cache(maxsize=1)
def specimen_by_script():
    """script -> specimen string (highest-population language per script; Latin omitted)."""
    best = {}  # script -> (population, text)
    for _lid, lang in _languages().items():
        script = lang.script
        if not script or script == "Latn":
            continue
        text = _sample_string(lang.sample_text)
        if not text:
            continue
        pop = lang.population or 0
        cur = best.get(script)
        if cur is None or pop > cur[0]:
            best[script] = (pop, text)
    return {script: text for script, (_pop, text) in best.items()}


def specimen_for_lang(lang_id):
    """Sample string for a specific language (CJK needs this; script is ambiguous)."""
    lang = _languages().get(lang_id)
    if not lang:
        return None
    return _sample_string(lang.sample_text) or None


def _sample_tiers(st):
    """Three heading-size specimen tiers (h1/h2/h3), or []."""
    if not st:
        return []
    single = _sample_string(st)
    tiers = [
        (st.styles or "").strip() or single,
        (st.specimen_21 or "").strip() or single,
        (st.specimen_16 or "").strip() or single,
    ]
    return tiers if any(tiers) else []


@lru_cache(maxsize=1)
def tiers_by_script():
    """script -> three specimen tiers (Latin omitted)."""
    best = {}  # script -> (population, tiers)
    for _lid, lang in _languages().items():
        script = lang.script
        if not script or script == "Latn":
            continue
        tiers = _sample_tiers(lang.sample_text)
        if not tiers:
            continue
        pop = lang.population or 0
        cur = best.get(script)
        if cur is None or pop > cur[0]:
            best[script] = (pop, tiers)
    return {script: tiers for script, (_pop, tiers) in best.items()}


def tiers_for_lang(lang_id):
    """Three specimen tiers for a specific language, or None."""
    lang = _languages().get(lang_id)
    if not lang:
        return None
    return _sample_tiers(lang.sample_text) or None


def coverage(cmap_codepoints: set[str], subsets: list[str]) -> tuple[list[str], list[str], dict[str, float]]:
    """Return (languages, scripts, cjk_coverage) for one family.

    - cmap_codepoints: set of str characters the family's fonts cover (union).
    - subsets: METADATA subset tags (drives CJK support).
    languages: sorted list of supported lang ids (alphabetic ratio>=0.98 + CJK
    from subsets). scripts: distinct scripts of the supported languages.
    cjk_coverage: {lang_id: ratio} for the CJK languages, for display.
    """
    cps = set(cmap_codepoints)
    langs = set()

    for lid, (script, base) in _lang_exemplars().items():
        if script in CJK_SCRIPTS:
            continue
        have = len(base & cps)
        if have / len(base) >= ALPHA_THRESHOLD:
            langs.add(lid)

    cjk_coverage = {}
    for sub in subsets or []:
        lid = SUBSET_TO_CJK_LANG.get(sub)
        if lid:
            langs.add(lid)
    ex = _lang_exemplars()
    for lid in CJK_RATIO_LANGS:
        if lid in ex:
            _, base = ex[lid]
            cjk_coverage[lid] = round(len(base & cps) / len(base), 4)

    scripts = sorted({_languages()[lid].script for lid in langs if lid in _languages()})
    return sorted(langs), scripts, cjk_coverage
