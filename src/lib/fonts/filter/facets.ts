// Build the set of selectable filter values with family counts, from the full
// dataset — the data behind every sidebar section's pills.
import { COLOR_FORMATS, isColorFont } from "../color";
import { catalogUpmCounts } from "../metrics";
import type { FontRecord } from "../types";
import { FONT_TYPE_FACETS } from "./state";
import { familyWeightSet, familyWidthSet } from "./weights";

/** The selectable filter values with family counts, keyed by section. */
export type FacetIndex = ReturnType<typeof buildFacetIndex>;

// A font belongs to a classification tag when its score reaches this. Shared
// with applyFilters so counts and results agree.
export const TAG_MEMBERSHIP_THRESHOLD = 50;

// The four classification sections, in display order, each an ordered list of
// its sub-tag paths (the only groups surfaced for now). Sub-tag order is by
// family count descending, taken from the current dataset.
export const CLASSIFICATION_SECTIONS: {
  title: string;
  prefix: string;
  tags: string[];
}[] = [
  {
    title: "Serif",
    prefix: "/Serif/",
    tags: [
      "/Serif/Transitional",
      "/Serif/Old Style Garalde",
      "/Serif/Modern",
      "/Serif/Humanist Venetian",
      "/Serif/Didone",
      "/Serif/Scotch",
      "/Serif/Fat Face",
    ],
  },
  {
    title: "Sans Serif",
    prefix: "/Sans/",
    tags: [
      "/Sans/Humanist",
      "/Sans/Geometric",
      "/Sans/Neo Grotesque",
      "/Sans/Rounded",
      "/Sans/Grotesque",
      "/Sans/Superellipse",
      "/Sans/Glyphic",
    ],
  },
  {
    title: "Slab",
    prefix: "/Slab/",
    tags: ["/Slab/Humanist", "/Slab/Clarendon", "/Slab/Geometric"],
  },
  {
    title: "Script",
    prefix: "/Script/",
    tags: [
      "/Script/Handwritten",
      "/Script/Informal",
      "/Script/Upright Script",
      "/Script/Formal",
    ],
  },
];

// The license pills, in fixed order. Records with a null license never match
// and get no pill.
export const LICENSE_VALUES = ["OFL", "APACHE2", "UFL"];
export const LICENSE_LABELS: Record<string, string> = {
  OFL: "OFL",
  APACHE2: "Apache 2.0",
  UFL: "UFL",
};

// Source-repository host pills, in fixed order (None trails, as the absence
// bucket). The catalog is ~99% GitHub with a handful of GitLab/SourceHut and a
// few families with no repository_url at all.
export const REPO_HOST_VALUES = ["github", "gitlab", "sourcehut", "none"];
export const REPO_HOST_LABELS: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  sourcehut: "SourceHut",
  none: "None",
};

/** The host bucket a family's repository_url falls into. Every family maps to
 *  exactly one value (an absent/unknown URL is "none"), so the four pills
 *  partition the catalog. Shared by the facet index and applyFilters. */
export function repoHost(url: string | null): string {
  if (!url) return "none";
  const u = url.toLowerCase();
  if (u.includes("github.com")) return "github";
  if (u.includes("gitlab.com")) return "gitlab";
  if (u.includes("sr.ht")) return "sourcehut";
  return "none";
}

// Plain-language labels for the Tag panel's facet values (kebab-case ids from
// deriveFacets). The panel is the natural-language shortcut, so it shows these
// human phrases rather than the raw tag. Unmapped ids fall back to the id.
export const FACET_LABELS: Record<string, string> = {
  static: "Static",
  variable: "Variable",
  "has-italic": "Italic",
  ligatures: "Ligatures",
  "discretionary-ligatures": "Discretionary ligatures",
  "historical-ligatures": "Historical ligatures",
  fractions: "Fractions",
  "tabular-figures": "Tabular figures",
  "oldstyle-figures": "Oldstyle figures",
  "slashed-zero": "Slashed zero",
  "small-caps": "Small caps",
  "case-sensitive": "Case-sensitive forms",
  "stylistic-alternates": "Stylistic alternates",
  titling: "Titling",
  "weight-axis": "Weight axis",
  "width-axis": "Width axis",
  "optical-size-axis": "Optical size axis",
  "slant-axis": "Slant axis",
  "italic-axis": "Italic axis",
  "grade-axis": "Grade axis",
  monospace: "Monospace",
  colorful: "Colorful",
  "noto-family": "Noto",
  latin: "Latin",
  cjk: "CJK",
  arabic: "Arabic",
  cyrillic: "Cyrillic",
  greek: "Greek",
  hebrew: "Hebrew",
  thai: "Thai",
  devanagari: "Devanagari",
};

// Source pills: a radio-style split of the catalog by Noto membership. Every
// published family is either Noto (Google's global writing-system project) or
// Others, so these two cover the whole set. (isBrandFont/isOpenSource carry no
// filter: Brand is ~all Noto, and OpenSource is true for every published
// family — neither distinguishes anything.)
export const FLAG_VALUES = ["noto", "others"];
export const FLAG_LABELS: Record<string, string> = {
  noto: "Noto",
  others: "Non-Noto",
};

// Vendor ids that mean "unknown", not a foundry — dropped from the Vendor
// facet so they don't masquerade as a real source.
const UNKNOWN_VENDORS = new Set(["NONE", "UKWN", "----", ""]);

/** A font's designers as trimmed tokens. The source field comma-joins
 *  collaborators ("Veronika Burian, José Scaglione"); each token filters
 *  independently. Empty when no designer is recorded. */
export function designerTokens(font: FontRecord): string[] {
  if (!font.designer) return [];
  return font.designer
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

/** A font's vendor as a folded OS/2 achVendID, or null when unknown. Uppercased
 *  so pyrs/PYRS collapse to one; the placeholder codes (NONE/UKWN/…) become
 *  null so they never get a pill. */
export function foldVendor(vendorId: string | null): string | null {
  if (!vendorId) return null;
  const v = vendorId.trim().toUpperCase();
  return UNKNOWN_VENDORS.has(v) ? null : v;
}

/** Build the set of selectable values with counts, from the full dataset. */
export function buildFacetIndex(fonts: FontRecord[]) {
  const classes = new Map<string, number>();
  const facets = new Map<string, number>();
  const features = new Map<string, number>();
  const axes = new Map<string, number>();
  const weights = new Map<string, number>();
  const widths = new Map<string, number>();
  const wsScripts = new Map<string, number>(); // real writing systems (Latn…)
  const languages = new Map<string, number>();
  const color = new Map<string, number>();
  const colorFormats = new Map<string, number>();
  const classifications = new Map<string, number>();
  const designers = new Map<string, number>();
  const vendors = new Map<string, number>();
  // Folded vendor code -> its original casings with counts. The pill groups by
  // the uppercased code (so pyrs/PYRS merge), but the tooltip should show the
  // code as the font actually embeds it, so we remember what we saw.
  const vendorCasings = new Map<string, Map<string, number>>();
  const license = new Map<string, number>();
  const repoHosts = new Map<string, number>();
  const flags = new Map<string, number>();
  let hintedCount = 0;
  let unhintedCount = 0;
  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);

  for (const font of fonts) {
    if (font.hasHinting === true) hintedCount++;
    else unhintedCount++;
    bump(classes, font.class);
    for (const x of font.facets) bump(facets, x);
    for (const x of font.features) bump(features, x);
    for (const a of font.axes) bump(axes, a.tag);
    for (const w of familyWeightSet(font)) bump(weights, String(w));
    for (const w of familyWidthSet(font)) bump(widths, String(w));
    for (const s of font.scripts) bump(wsScripts, s);
    for (const l of font.languages) bump(languages, l);
    bump(color, isColorFont(font) ? "color" : "monochrome");
    for (const t of font.colorTables) bump(colorFormats, t);
    for (const [path, score] of Object.entries(font.tags))
      if (score >= TAG_MEMBERSHIP_THRESHOLD) bump(classifications, path);
    for (const d of designerTokens(font)) bump(designers, d);
    const vnd = foldVendor(font.vendorId);
    if (vnd) {
      bump(vendors, vnd);
      // Record the raw (unfolded) casing so the tooltip can show it verbatim.
      const raw = (font.vendorId ?? "").trim();
      const seen = vendorCasings.get(vnd) ?? new Map<string, number>();
      seen.set(raw, (seen.get(raw) ?? 0) + 1);
      vendorCasings.set(vnd, seen);
    }
    if (font.license) bump(license, font.license);
    bump(repoHosts, repoHost(font.repositoryUrl));
    bump(flags, font.isNoto ? "noto" : "others");
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // Weight/width pills read best in ascending numeric order, not by count.
  const byStep = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  return {
    classes: sorted(classes),
    // Every facet, INCLUDING static/variable: the Tag panel shows them as plain
    // multi-select pills (Font type is still a radio in the Axes panel, backed
    // by the same `facets` state). Static + Variable are mutually exclusive, so
    // selecting both AND-filters to nothing — accepted, the user's call.
    facets: sorted(facets),
    features: sorted(features),
    axes: sorted(axes),
    weights: byStep(weights),
    widths: byStep(widths),
    // real writing systems + languages (language-support task)
    wsScripts: sorted(wsScripts),
    languages: sorted(languages),
    // Monochrome first, then Colorful (fixed order, not by count).
    color: [
      ["monochrome", color.get("monochrome") ?? 0],
      ["color", color.get("color") ?? 0],
    ] as [string, number][],
    // Static/Variable in fixed order — the sole entry point for this filter.
    // Same underlying `facets` values, so applyFilters needs no special case.
    fontTypes: FONT_TYPE_FACETS.map(
      (v) => [v, facets.get(v) ?? 0] as [string, number]
    ),
    // Every format, in COLOR_FORMATS order, including the ones no published
    // font uses — they stay selectable rather than vanishing at count 0.
    colorFormats: COLOR_FORMATS.map(
      (f) => [f.id, colorFormats.get(f.id) ?? 0] as [string, number]
    ),
    // One entry per classification section: its sub-tag pills in fixed order,
    // each [full tag path, count].
    classifications: CLASSIFICATION_SECTIONS.map((section) => ({
      title: section.title,
      items: section.tags.map(
        (t) => [t, classifications.get(t) ?? 0] as [string, number]
      ),
    })),
    // Designers and vendors, count-sorted. Label = value for both (real names,
    // 4-char codes). The Designer panel renders these via FacetSearchSection.
    designers: sorted(designers),
    vendors: sorted(vendors),
    // Folded vendor code -> the code as most fonts embed it (the most common
    // original casing), so the tooltip shows "pyrs" when that's what the fonts
    // use, not the forced-uppercase grouping key.
    vendorCasing: new Map(
      [...vendorCasings].map(([code, seen]) => {
        const best = [...seen.entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        )[0][0];
        return [code, best];
      })
    ),
    // License pills in fixed order (OFL / Apache 2.0 / UFL).
    license: LICENSE_VALUES.map(
      (v) => [v, license.get(v) ?? 0] as [string, number]
    ),
    // Repository-host pills in fixed order (GitHub / GitLab / SourceHut / None).
    repoHosts: REPO_HOST_VALUES.map(
      (v) => [v, repoHosts.get(v) ?? 0] as [string, number]
    ),
    // Source pills in fixed order (Noto / Others).
    flags: FLAG_VALUES.map((v) => [v, flags.get(v) ?? 0] as [string, number]),
    // Units-per-em pill items ([value, family count]) for the Metrics tab.
    upmCounts: catalogUpmCounts(fonts),
    // Family counts for the Hint pills.
    hintedCount,
    unhintedCount,
  };
}
