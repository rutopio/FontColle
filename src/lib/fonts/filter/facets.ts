import { COLOR_FORMATS, isColorFont } from "@/lib/fonts/color";
import { catalogUpmCounts } from "@/lib/fonts/metrics";
import type { FontRecord } from "@/lib/fonts/types";
import { instanceCount } from "./instances";
import { FONT_TYPE_FACETS } from "./state";
import { familyWeightSet, familyWidthSet } from "./weights";

export type FacetIndex = ReturnType<typeof buildFacetIndex>;

// Shared with applyFilters so counts and results agree.
//
// Form counts at any positive score, matching Google Fonts' own browse lists.
// Mood needs a majority: Google scores nearly every family on nearly every mood
// trait (Roboto carries /Expressive/Vintage 10), so at 1 the pills would each
// match most of the catalog.
export const FORM_TAG_THRESHOLD = 1;
export const MOOD_TAG_THRESHOLD = 50;

/** `score` is 0 when the family carries no rating for that path. */
export function meetsTagThreshold(tag: string, score: number): boolean {
  return score >= tagThreshold(tag);
}

function tagThreshold(tag: string): number {
  return classificationGroupOf(tag) === "mood"
    ? MOOD_TAG_THRESHOLD
    : FORM_TAG_THRESHOLD;
}

// Sub-tags are ordered by family count. Both groups share the one `style`
// state; `group` only decides which rail panel a section renders under.
export const CLASSIFICATION_SECTIONS: {
  title: string;
  prefix: string;
  group: "style" | "mood";
  tags: string[];
}[] = [
  {
    title: "Sans Serif",
    prefix: "/Sans/",
    group: "style",
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
    title: "Serif",
    prefix: "/Serif/",
    group: "style",
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
    title: "Slab",
    prefix: "/Slab/",
    group: "style",
    tags: ["/Slab/Humanist", "/Slab/Geometric", "/Slab/Clarendon"],
  },
  {
    title: "Script",
    prefix: "/Script/",
    group: "style",
    tags: [
      "/Script/Handwritten",
      "/Script/Informal",
      "/Script/Upright Script",
      "/Script/Formal",
    ],
  },
  {
    title: "Expressive",
    prefix: "/Expressive/",
    group: "mood",
    tags: [
      "/Expressive/Rugged",
      "/Expressive/Vintage",
      "/Expressive/Business",
      "/Expressive/Loud",
      "/Expressive/Sincere",
      "/Expressive/Stiff",
      "/Expressive/Calm",
      "/Expressive/Playful",
      "/Expressive/Futuristic",
      "/Expressive/Competent",
      "/Expressive/Awkward",
      "/Expressive/Happy",
      "/Expressive/Active",
      "/Expressive/Excited",
      "/Expressive/Cute",
      "/Expressive/Innovative",
      "/Expressive/Artistic",
      "/Expressive/Childlike",
      "/Expressive/Sophisticated",
      "/Expressive/Fancy",
    ],
  },
  {
    title: "Theme",
    prefix: "/Theme/",
    group: "mood",
    tags: [
      "/Theme/Wacky",
      "/Theme/Techno",
      "/Theme/Brush",
      "/Theme/Distressed",
      "/Theme/Pixel",
      "/Theme/Woodtype",
      "/Theme/Blobby",
      "/Theme/Blackletter",
      "/Theme/Inline",
      "/Theme/Medieval",
      "/Theme/Stencil",
      "/Theme/Art Deco",
      "/Theme/Shaded",
      "/Theme/Tuscan",
      "/Theme/Art Nouveau",
    ],
  },
  {
    title: "Seasonal",
    prefix: "/Seasonal/",
    group: "mood",
    tags: [
      "/Seasonal/Valentine's Day",
      "/Seasonal/Holi",
      "/Seasonal/Diwali",
      "/Seasonal/Kwanzaa",
      "/Seasonal/Lunar New Year",
      "/Seasonal/Christmas",
      "/Seasonal/Halloween",
      "/Seasonal/Hanukkah",
    ],
  },
];

// Lets a group's badge count only its own tags even though every classification
// shares the one `style` state.
export function classificationGroupOf(tag: string): "style" | "mood" | null {
  const section = CLASSIFICATION_SECTIONS.find((s) => tag.startsWith(s.prefix));
  return section?.group ?? null;
}

// Records with a null license never match and get no pill.
export const LICENSE_VALUES = ["OFL", "APACHE2", "UFL"];
export const LICENSE_LABELS: Record<string, string> = {
  OFL: "OFL",
  APACHE2: "Apache 2.0",
  UFL: "UFL",
};

export const REPO_HOST_VALUES = ["github", "gitlab", "sourcehut", "none"];
export const REPO_HOST_LABELS: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  sourcehut: "SourceHut",
  none: "None",
};

// The four buckets partition the catalog, so they render as radio-style pills.
export const ACTIVITY_VALUES = ["latest", "active", "recent", "dormant"];
export const ACTIVITY_LABELS: Record<string, string> = {
  latest: "Latest (≤6m)",
  active: "Active (≤1y)",
  recent: "Recent (≤3y)",
  dormant: "Dormant (3y+)",
};

/** The activity bucket a family falls into, from head.modified.
 *
 *  Deliberately NOT lastModifiedApi: that moves on any release, and a
 *  library-wide metadata pass in Sept 2025 restamped 1492 of 1942 families
 *  within three weeks. head.modified only advances when the outlines are
 *  rebuilt, which is what "is this still maintained" actually asks. */
export function fontActivity(font: FontRecord): string {
  const months = monthsSince(font);
  if (months === null) return "dormant";
  if (months <= 6) return "latest";
  if (months <= 12) return "active";
  if (months <= 36) return "recent";
  return "dormant";
}

/** A non-positive head.modified is an unset stamp (it decodes to 1904/1970),
 *  not a real date, so it defers to the repo's first commit. */
function monthsSince(font: FontRecord): number | null {
  const stamp =
    font.modifiedMs && font.modifiedMs > 0
      ? font.modifiedMs
      : font.firstCommitDate
        ? Date.parse(font.firstCommitDate)
        : Number.NaN;
  if (!Number.isFinite(stamp)) return null;
  return (Date.now() - stamp) / (1000 * 60 * 60 * 24 * 30.44);
}

/** An absent or unrecognised URL is "none", so the pills partition the catalog. */
export function repoHost(url: string | null): string {
  if (!url) return "none";
  const u = url.toLowerCase();
  if (u.includes("github.com")) return "github";
  if (u.includes("gitlab.com")) return "gitlab";
  if (u.includes("sr.ht")) return "sourcehut";
  return "none";
}

// Only the Font type radio writes to `tags`, so only its two values need a
// label. deriveFacets still emits the wider set (feature/axis/subset facets)
// onto each record; those are data, reached through their own panels. Unmapped
// ids fall back to the id.
export const FACET_LABELS: Record<string, string> = {
  static: "Static",
  variable: "Variable",
};

// Radio-style split by Noto membership. isBrandFont/isOpenSource get no filter:
// Brand is ~all Noto, and OpenSource is true for every published family.
export const FLAG_VALUES = ["noto", "others"];
export const FLAG_LABELS: Record<string, string> = {
  noto: "Noto",
  others: "Non-Noto",
};

export const ITALIC_VALUES = ["italic", "upright"];
export const ITALIC_LABELS: Record<string, string> = {
  italic: "Has Italic",
  upright: "Non-Italic",
};

// Placeholders, not foundries: dropped so they don't masquerade as a source.
const UNKNOWN_VENDORS = new Set(["NONE", "UKWN", "----", ""]);

/** The source field comma-joins collaborators ("Veronika Burian, José
 *  Scaglione"); each token filters independently. */
export function designerTokens(font: FontRecord): string[] {
  if (!font.designer) return [];
  return font.designer
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

/** The OS/2 achVendID, uppercased so pyrs/PYRS collapse to one. Placeholder
 *  codes (NONE/UKWN/…) become null so they never get a pill. */
export function foldVendor(vendorId: string | null): string | null {
  if (!vendorId) return null;
  const v = vendorId.trim().toUpperCase();
  return UNKNOWN_VENDORS.has(v) ? null : v;
}

export function buildFacetIndex(fonts: FontRecord[]) {
  const categories = new Map<string, number>();
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
  // So the tooltip can show the code as the fonts actually embed it, rather
  // than the uppercased grouping key.
  const vendorCasings = new Map<string, Map<string, number>>();
  const license = new Map<string, number>();
  const repoHosts = new Map<string, number>();
  const activity = new Map<string, number>();
  const flags = new Map<string, number>();
  const italic = new Map<string, number>();
  const instances = new Map<string, number>();
  let hintedCount = 0;
  let unhintedCount = 0;
  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);

  for (const font of fonts) {
    if (font.hasHinting === true) hintedCount++;
    else unhintedCount++;
    bump(categories, font.category);
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
      if (meetsTagThreshold(path, score)) bump(classifications, path);
    for (const d of designerTokens(font)) bump(designers, d);
    const vnd = foldVendor(font.vendorId);
    if (vnd) {
      bump(vendors, vnd);
      const raw = (font.vendorId ?? "").trim();
      const seen = vendorCasings.get(vnd) ?? new Map<string, number>();
      seen.set(raw, (seen.get(raw) ?? 0) + 1);
      vendorCasings.set(vnd, seen);
    }
    if (font.license) bump(license, font.license);
    bump(repoHosts, repoHost(font.repositoryUrl));
    bump(activity, fontActivity(font));
    bump(flags, font.isNoto ? "noto" : "others");
    bump(italic, font.facets.includes("has-italic") ? "italic" : "upright");
    bump(instances, String(instanceCount(font)));
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const byStep = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  return {
    categories: sorted(categories),
    features: sorted(features),
    axes: sorted(axes),
    weights: byStep(weights),
    widths: byStep(widths),
    wsScripts: sorted(wsScripts),
    languages: sorted(languages),
    color: [
      ["monochrome", color.get("monochrome") ?? 0],
      ["color", color.get("color") ?? 0],
    ] as [string, number][],
    fontTypes: FONT_TYPE_FACETS.map(
      (v) => [v, facets.get(v) ?? 0] as [string, number]
    ),
    // Includes formats no published font uses: they stay selectable rather than
    // vanishing at count 0.
    colorFormats: COLOR_FORMATS.map(
      (f) => [f.id, colorFormats.get(f.id) ?? 0] as [string, number]
    ),
    style: CLASSIFICATION_SECTIONS.map((section) => ({
      title: section.title,
      group: section.group,
      items: section.tags.map(
        (t) => [t, classifications.get(t) ?? 0] as [string, number]
      ),
    })),
    designers: sorted(designers),
    vendors: sorted(vendors),
    vendorCasing: new Map(
      [...vendorCasings].map(([code, seen]) => {
        const best = [...seen.entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        )[0][0];
        return [code, best];
      })
    ),
    license: LICENSE_VALUES.map(
      (v) => [v, license.get(v) ?? 0] as [string, number]
    ),
    repoHosts: REPO_HOST_VALUES.map(
      (v) => [v, repoHosts.get(v) ?? 0] as [string, number]
    ),
    activity: ACTIVITY_VALUES.map(
      (v) => [v, activity.get(v) ?? 0] as [string, number]
    ),
    flags: FLAG_VALUES.map((v) => [v, flags.get(v) ?? 0] as [string, number]),
    italic: ITALIC_VALUES.map(
      (v) => [v, italic.get(v) ?? 0] as [string, number]
    ),
    // [count, families] ascending. Drives the range slider's stop list, so only
    // counts the catalog actually has are reachable (no dead stops between).
    instances: [...instances.entries()]
      .map(([n, c]) => [Number(n), c] as [number, number])
      .filter(([n]) => n > 0)
      .sort((a, b) => a[0] - b[0]),
    upmCounts: catalogUpmCounts(fonts),
    hintedCount,
    unhintedCount,
  };
}
