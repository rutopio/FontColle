#!/usr/bin/env python3
"""Writing-system / language coverage, computed the way Google Fonts does.

HYBRID model (locked in tasks/todo.md):
- Alphabetic scripts (Latn/Cyrl/Grek/Arab/Hebr/Thai/Deva/…): a language is
  "supported" iff |cmap ∩ exemplar.base| / |exemplar.base| >= ALPHA_THRESHOLD
  (0.98, tolerating one rare char, e.g. German missing only ẞ).
- CJK (Hant/Hans/Jpan/Kore): 100% is the wrong bar. Support is driven by the
  METADATA `subsets` tags (what the GF website uses); we ALSO compute the
  exemplar coverage ratio as a numeric field for progressive display.

Uses gflanguages exemplar data + gftools' parse() for the coverage math.
Kept as a separate module so harvest.py stays about font I/O.
"""
from functools import lru_cache

import gflanguages
import langcodes
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


# Continent order the frontend renders in; mirrors LANGUAGE_REGIONS in
# src/lib/fonts/labels.ts, which must be kept in sync since these strings are
# both the bucket keys and the headings the UI renders. NO_REGION trails at the
# end and holds languages tied to no country: constructed ones like Volapuek and
# extinct ones like Old Prussian.
NO_REGION = "Constructed & historical"
REGION_ORDER = ["Africa", "Americas", "Asia", "Europe", "Oceania", NO_REGION]


@lru_cache(maxsize=1)
def _country_region_group():
    """CLDR country code -> continent group (Africa/Americas/Asia/Europe/
    Oceania), matching how Google Fonts buckets languages by region."""
    out = {}
    for rid, reg in gflanguages.LoadRegions().items():
        if reg.region_group:
            out[rid] = reg.region_group[0]
    return out


def language_regions(lang):
    """Every continent a gflanguages language is spoken on.

    gflanguages' `region` lists all countries where the language is spoken, so
    mapping that list through region_group gives real multi-continent reach:
    English -> Africa, Americas, Asia, Europe, Oceania. This is the same data
    Google Fonts expands, which is why its specimen shows English under both
    Americas and Europe.

    We used to collapse this to one continent via CLDR likelySubtags (en ->
    en_Latn_US -> Americas). That answered "if we must pick one, which?" but
    nothing required picking one, and it silently dropped four fifths of
    English's footprint. Languages with no mapped country fall back to CLDR's
    primary territory, then to NO_REGION; CLDR maximizes constructed and
    extinct languages to territory 001 ("World"), which is not a country and so
    has no continent, which is exactly the right answer for them.

    Returns continents in LANGUAGE_REGIONS order so the frontend can render
    them without re-sorting.
    """
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
    """lang_id -> {name, script, population, regions} for the frontend.

    `regions` is every continent the language is spoken on, so a language can
    appear under several headings, matching Google Fonts.
    """
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


def _sample_tiers(st):
    """The three heading passages Google Fonts opens its specimen page with,
    from a gflanguages sample_text: `styles` (h1, the short preamble line),
    `specimen_21` (h2) and `specimen_16` (h3). The smaller the type size, the
    more text the tier carries, so h3 is the longest. Missing fields fall back to
    the single sample string so a language that only carries `styles` still
    yields usable (repeated) tiers. Returns [] when the whole sample_text is
    empty; duplicate tiers are left for the frontend to dedupe."""
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
    """script code -> the three specimen tiers, keyed the same way as
    `specimen_by_script`: the highest-population language per script that
    carries a gflanguages sample_text. Latin omitted (Latin fonts keep the
    frontend's English UDHR tiers)."""
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
    """A single language's three specimen tiers, or None. The tier counterpart
    of `specimen_for_lang`, keyed off the font's CJK subset (Hant is ambiguous;
    HK -> Cantonese, TC -> zh_Hant, SC -> zh_Hans)."""
    lang = _languages().get(lang_id)
    if not lang:
        return None
    return _sample_tiers(lang.sample_text) or None


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
