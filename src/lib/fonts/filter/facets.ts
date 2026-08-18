import { COLOR_FORMATS, isColorFont } from "@/lib/fonts/color";
import { catalogUpmCounts } from "@/lib/fonts/metrics";
import type { FontRecord } from "@/lib/fonts/types";
import { instanceCount } from "./instances";
import { fontSpacing, SPACING_LABELS, SPACING_VALUES } from "./spacing";
import { FONT_TYPE_FACETS } from "./state";
import { familyWeightSet, familyWidthSet } from "./weights";

export type FacetIndex = ReturnType<typeof buildFacetIndex>;

export const FORM_TAG_THRESHOLD = 1;
export const MOOD_TAG_THRESHOLD = 50;

export function meetsTagThreshold(tag: string, score: number): boolean {
  return score >= tagThreshold(tag);
}

function tagThreshold(tag: string): number {
  return classificationGroupOf(tag) === "mood"
    ? MOOD_TAG_THRESHOLD
    : FORM_TAG_THRESHOLD;
}

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

export function classificationGroupOf(tag: string): "style" | "mood" | null {
  const section = CLASSIFICATION_SECTIONS.find((s) => tag.startsWith(s.prefix));
  return section?.group ?? null;
}

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

export const ACTIVITY_VALUES = ["latest", "active", "recent", "dormant"];
export const ACTIVITY_LABELS: Record<string, string> = {
  latest: "Latest (≤6m)",
  active: "Active (≤1y)",
  recent: "Recent (≤3y)",
  dormant: "Dormant (3y+)",
};

export function fontActivity(font: FontRecord): string {
  const months = monthsSince(font);
  if (months === null) return "dormant";
  if (months <= 6) return "latest";
  if (months <= 12) return "active";
  if (months <= 36) return "recent";
  return "dormant";
}

function monthsSince(font: FontRecord): number | null {
  // Upstream repo activity first: it answers "is anyone still working on this
  // font", which is what "Last updated" claims to show. modifiedMs only says when
  // Google last COMPILED the binary, so an actively developed family reads as
  // dormant until Google happens to rebuild it. Fall back to it (then to the
  // repo debut) only for the ~42 families with no resolvable github repo.
  const stamp = font.upstreamHeadDate
    ? Date.parse(font.upstreamHeadDate)
    : font.modifiedMs && font.modifiedMs > 0
      ? font.modifiedMs
      : font.firstCommitDate
        ? Date.parse(font.firstCommitDate)
        : Number.NaN;
  if (!Number.isFinite(stamp)) return null;
  return (Date.now() - stamp) / (1000 * 60 * 60 * 24 * 30.44);
}

export const REPO_STATUS_VALUES = ["live", "archived"];
export const REPO_STATUS_LABELS: Record<string, string> = {
  live: "Live",
  archived: "Archived",
};

/** Whether the family's upstream repo is archived. `unknown` when it has none. */
export function fontRepoStatus(font: FontRecord): string {
  if (font.upstreamArchived == null) return "unknown";
  return font.upstreamArchived ? "archived" : "live";
}

export function repoHost(url: string | null): string {
  if (!url) return "none";
  const u = url.toLowerCase();
  if (u.includes("github.com")) return "github";
  if (u.includes("gitlab.com")) return "gitlab";
  if (u.includes("sr.ht")) return "sourcehut";
  return "none";
}

export const FACET_LABELS: Record<string, string> = {
  static: "Static",
  variable: "Variable",
};

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

// Defined in ./spacing, which stays free of `@/` imports so gen-facets.mjs can
// share it. Re-exported here so the facet call sites read uniformly.
export { fontSpacing, SPACING_LABELS, SPACING_VALUES };

const UNKNOWN_VENDORS = new Set(["NONE", "UKWN", "----", ""]);

export function designerTokens(font: FontRecord): string[] {
  if (!font.designer) return [];
  return font.designer
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

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
  const wsScripts = new Map<string, number>();
  const languages = new Map<string, number>();
  const color = new Map<string, number>();
  const colorFormats = new Map<string, number>();
  const classifications = new Map<string, number>();
  const designers = new Map<string, number>();
  const vendors = new Map<string, number>();
  const vendorCasings = new Map<string, Map<string, number>>();
  const license = new Map<string, number>();
  const repoHosts = new Map<string, number>();
  const activity = new Map<string, number>();
  const repoStatus = new Map<string, number>();
  const flags = new Map<string, number>();
  const italic = new Map<string, number>();
  const spacing = new Map<string, number>();
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
    bump(repoStatus, fontRepoStatus(font));
    bump(flags, font.isNoto ? "noto" : "others");
    bump(italic, font.facets.includes("has-italic") ? "italic" : "upright");
    bump(spacing, fontSpacing(font));
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
    repoStatus: REPO_STATUS_VALUES.map(
      (v) => [v, repoStatus.get(v) ?? 0] as [string, number]
    ),
    flags: FLAG_VALUES.map((v) => [v, flags.get(v) ?? 0] as [string, number]),
    italic: ITALIC_VALUES.map(
      (v) => [v, italic.get(v) ?? 0] as [string, number]
    ),
    spacing: SPACING_VALUES.map(
      (v) => [v, spacing.get(v) ?? 0] as [string, number]
    ),
    instances: [...instances.entries()]
      .map(([n, c]) => [Number(n), c] as [number, number])
      .filter(([n]) => n > 0)
      .sort((a, b) => a[0] - b[0]),
    upmCounts: catalogUpmCounts(fonts),
    hintedCount,
    unhintedCount,
  };
}
