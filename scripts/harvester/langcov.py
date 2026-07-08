#!/usr/bin/env python3
"""Writing-system / language coverage, computed the way Google Fonts does.

HYBRID model (locked in tasks/todo.md):
- Alphabetic scripts (Latn/Cyrl/Grek/Arab/Hebr/Thai/Deva/…): a language is
  "supported" iff |cmap ∩ exemplar.base| / |exemplar.base| >= ALPHA_THRESHOLD
  (0.98, tolerating one rare char — e.g. German missing only ẞ).
- CJK (Hant/Hans/Jpan/Kore): 100% is the wrong bar. Support is driven by the
  METADATA `subsets` tags (what the GF website uses); we ALSO compute the
  exemplar coverage ratio as a numeric field for progressive display.

Uses gflanguages exemplar data + gftools' parse() for the coverage math.
Kept as a separate module so harvest.py stays about font I/O.
"""
from functools import lru_cache

import gflanguages
from gftools.util.google_fonts import parse

ALPHA_THRESHOLD = 0.98

# Scripts whose support we decide by exemplar coverage ratio. CJK scripts are
# excluded here and handled via subset tags instead.
CJK_SCRIPTS = {"Hant", "Hans", "Jpan", "Kore", "Hani", "Kana", "Hira", "Bopo"}

# METADATA subset tag -> the gflanguages language id it implies. GF's website
# treats the presence of a CJK subset as support for that language.
SUBSET_TO_CJK_LANG = {
    "chinese-traditional": "zh_Hant",
    "chinese-hongkong": "zh_Hant",
    "chinese-simplified": "zh_Hans",
    "japanese": "ja_Jpan",
    "korean": "ko_Kore",
}
# CJK language ids we also report a coverage ratio for (progressive display).
CJK_RATIO_LANGS = ["zh_Hant", "zh_Hans", "ja_Jpan", "ko_Kore"]

# Emoji fonts have no linguistic sample; Google Fonts previews them with a fixed
# emoji string, so we mirror it (see Noto Color Emoji / Noto Emoji specimen pages).
EMOJI_SAMPLE = "🥰💀✌️🌴🐢🐐🍄⚽🍻👑📸😬👀🚨🏡🕊️🏆😻🌟🧿🍀🎨🍜"

# CJK subset tag -> the language whose sample text we specimen the font in,
# matching Google Fonts. Hong Kong shows Cantonese (yue_Hant), not the Wu text
# that would win a raw Hant-by-population pick.
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


@lru_cache(maxsize=1)
def _country_region_group():
    """CLDR country code -> continent group (Africa/Americas/Asia/Europe/
    Oceania), matching how Google Fonts buckets languages by region."""
    out = {}
    for rid, reg in gflanguages.LoadRegions().items():
        if reg.region_group:
            out[rid] = reg.region_group[0]
    return out


def language_region(lang):
    """Continent for a gflanguages language, from its first CLDR region.
    Returns "Other" when the language declares no region."""
    groups = _country_region_group()
    for c in lang.region:
        g = groups.get(c)
        if g:
            return g
    return "Other"


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
    """lang_id -> {name, script, population, region} for the frontend."""
    out = {}
    for lid, lang in _languages().items():
        out[lid] = {
            "name": lang.name,
            "script": lang.script,
            "population": lang.population or 0,
            "region": language_region(lang),
        }
    return out


def script_label_map():
    """script code -> human name (Latn -> "Latin")."""
    return {code: s.name for code, s in _scripts().items()}


def _sample_string(st):
    """Pick a sample sentence from a gflanguages sample_text, in the same field
    order Google Fonts' specimen preview uses: `styles` (the UDHR preamble line
    they show, "…recognition of the inherent dignity…") first, then fall back to
    the tester / masthead lines. Returns "" when none is present."""
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
    """script code -> a representative specimen string, the way Google Fonts
    shows fonts in their own script.

    For each script we pick the highest-population language that carries a
    gflanguages sample_text. Latin is intentionally omitted so Latin fonts keep
    the app's English UDHR default on the frontend.
    """
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
    """A single language's sample string, or None.

    Used for CJK, where the script alone is ambiguous: Hant covers Traditional
    Chinese, Cantonese and several regional variants, and the highest-population
    one (Wu) is not what Google Fonts shows. Keying off the font's specific
    language gives the canonical text (zh_Hant / yue_Hant / zh_Hans / …)."""
    lang = _languages().get(lang_id)
    if not lang:
        return None
    return _sample_string(lang.sample_text) or None


def coverage(cmap_codepoints, subsets):
    """Return (languages, scripts, cjk_coverage) for one family.

    - cmap_codepoints: set of str characters the family's fonts cover (union).
    - subsets: METADATA subset tags (drives CJK support).
    languages: sorted list of supported lang ids (alphabetic ratio>=0.98 + CJK
    from subsets). scripts: distinct scripts of the supported languages.
    cjk_coverage: {lang_id: ratio} for the CJK languages, for display.
    """
    cps = set(cmap_codepoints)
    langs = set()

    # Alphabetic: ratio over exemplar base, excluding CJK scripts.
    for lid, (script, base) in _lang_exemplars().items():
        if script in CJK_SCRIPTS:
            continue
        have = len(base & cps)
        if have / len(base) >= ALPHA_THRESHOLD:
            langs.add(lid)

    # CJK: presence of the subset tag is the support signal.
    cjk_coverage = {}
    for sub in subsets or []:
        lid = SUBSET_TO_CJK_LANG.get(sub)
        if lid:
            langs.add(lid)
    # Numeric coverage ratio for CJK languages (progressive display / sorting).
    ex = _lang_exemplars()
    for lid in CJK_RATIO_LANGS:
        if lid in ex:
            _, base = ex[lid]
            cjk_coverage[lid] = round(len(base & cps) / len(base), 4)

    scripts = sorted({_languages()[lid].script for lid in langs if lid in _languages()})
    return sorted(langs), scripts, cjk_coverage
