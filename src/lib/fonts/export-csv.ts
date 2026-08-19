import { featureName } from "./features/names";
import { languageLabel, scriptLabel, vendorLabel } from "./labels";
import type { FontRecord } from "./types";

const num = (n: number | null | undefined): string =>
  n == null ? "" : String(n);

const bool = (b: boolean | null | undefined): string =>
  b == null ? "" : b ? "yes" : "no";

const text = (s: string | null | undefined): string => s ?? "";

const msDate = (ms: number | null | undefined): string =>
  ms == null ? "" : new Date(ms).toISOString().slice(0, 10);

/** "wght 100-900 @400" per axis, joined by "; ". */
const axisRanges = (f: FontRecord): string =>
  f.axes
    .map((a) => {
      const range = a.min != null && a.max != null ? ` ${a.min}-${a.max}` : "";
      const def = a.default != null ? ` @${a.default}` : "";
      return `${a.tag}${range}${def}`;
    })
    .join("; ");

/** Named instances as "Bold Italic (wght=700, ital=1)". */
const instanceList = (f: FontRecord): string =>
  f.instances
    .map((i) => {
      const coords = Object.entries(i.coords)
        .map(([tag, v]) => `${tag}=${v}`)
        .join(", ");
      const name = i.name ?? (i.italic ? "Italic" : "Regular");
      return coords ? `${name} (${coords})` : name;
    })
    .join("; ");

const tagScores = (f: FontRecord): string =>
  Object.entries(f.tags)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, score]) => `${tag}:${score}`)
    .join("; ");

const cjkCoverage = (f: FontRecord): string =>
  Object.entries(f.cjkCoverage ?? {})
    .map(([key, pct]) => `${key}:${pct}`)
    .join("; ");

const versionHistory = (f: FontRecord): string =>
  (f.versionHistory ?? []).map((v) => `${v.version} (${v.date})`).join("; ");

const designerProfiles = (f: FontRecord): string =>
  (f.designerProfiles ?? [])
    .map((d) => d.name)
    .filter((n): n is string => Boolean(n))
    .join("; ");

const siblings = (f: FontRecord): string =>
  Object.entries(f.siblingsByDesigner ?? {})
    .map(([designer, list]) => {
      const names = list.map((s) => s.name).join(", ");
      return `${designer}: ${names}`;
    })
    .join(" | ");

/** Collapse newlines so long prose stays inside one spreadsheet cell. */
const prose = (s: string | null | undefined): string =>
  s ? s.replace(/\s+/g, " ").trim() : "";

const COLUMNS: { header: string; value: (f: FontRecord) => string }[] = [
  // Identity
  { header: "ID", value: (f) => f.id },
  { header: "Family Name", value: (f) => f.name },
  { header: "Display Name", value: (f) => text(f.displayName) },
  { header: "Designer", value: (f) => text(f.designer) },
  { header: "Designer Profiles", value: designerProfiles },
  { header: "Category", value: (f) => f.category },
  { header: "API Category", value: (f) => text(f.apiCategory) },
  { header: "Facets", value: (f) => f.facets.join("; ") },
  { header: "Tags", value: tagScores },
  { header: "License", value: (f) => text(f.license) },
  { header: "Is Noto", value: (f) => bool(f.isNoto) },
  { header: "Is Brand Font", value: (f) => bool(f.isBrandFont) },
  { header: "Is Open Source", value: (f) => bool(f.isOpenSource) },
  { header: "Vendor ID", value: (f) => text(f.vendorId) },
  {
    header: "Vendor",
    value: (f) => (f.vendorId ? vendorLabel(f.vendorId) : ""),
  },

  // Variable axes and styles
  { header: "Variable", value: (f) => bool(f.isVariable) },
  { header: "Axis Count", value: (f) => String(f.axes.length) },
  { header: "Axis Tags", value: (f) => f.axes.map((a) => a.tag).join(" ") },
  { header: "Axis Ranges", value: axisRanges },
  { header: "Style Count", value: (f) => String(f.instances.length) },
  { header: "Styles", value: instanceList },
  { header: "Weights", value: (f) => f.weights.join(" ") },
  { header: "Weight Class", value: (f) => num(f.weightClass) },
  { header: "Width Class", value: (f) => num(f.widthClass) },

  // Coverage
  { header: "Primary Script", value: (f) => text(f.primaryScript) },
  { header: "Script Count", value: (f) => String(f.scripts.length) },
  { header: "Script Codes", value: (f) => f.scripts.join(" ") },
  { header: "Scripts", value: (f) => f.scripts.map(scriptLabel).join("; ") },
  { header: "Language Count", value: (f) => String(f.languages.length) },
  { header: "Language Codes", value: (f) => f.languages.join(" ") },
  {
    header: "Languages",
    value: (f) => f.languages.map(languageLabel).join("; "),
  },
  { header: "Subsets", value: (f) => f.subsets.join(" ") },
  { header: "CJK Coverage", value: cjkCoverage },
  { header: "Feature Count", value: (f) => String(f.features.length) },
  { header: "Feature Tags", value: (f) => f.features.join(" ") },
  {
    header: "Features",
    value: (f) => f.features.map(featureName).join("; "),
  },
  { header: "Color Tables", value: (f) => f.colorTables.join(" ") },
  { header: "Glyph Count", value: (f) => num(f.glyphCount) },
  { header: "Char Count", value: (f) => num(f.charCount) },

  // Metrics
  { header: "Units Per Em", value: (f) => num(f.unitsPerEm) },
  { header: "x-Height", value: (f) => num(f.xHeight) },
  { header: "Cap Height", value: (f) => num(f.capHeight) },
  { header: "Italic Angle", value: (f) => num(f.italicAngle) },
  { header: "hhea Ascender", value: (f) => num(f.hheaAscender) },
  { header: "hhea Descender", value: (f) => num(f.hheaDescender) },
  { header: "hhea Line Gap", value: (f) => num(f.hheaLineGap) },
  { header: "typo Ascender", value: (f) => num(f.typoAscender) },
  { header: "typo Descender", value: (f) => num(f.typoDescender) },
  { header: "typo Line Gap", value: (f) => num(f.typoLineGap) },
  { header: "win Ascent", value: (f) => num(f.winAscent) },
  { header: "win Descent", value: (f) => num(f.winDescent) },
  { header: "Use Typo Metrics", value: (f) => bool(f.useTypoMetrics) },
  { header: "Avg Char Width", value: (f) => num(f.avgCharWidth) },
  { header: "Contrast", value: (f) => num(f.contrast) },
  { header: "Monospace", value: (f) => bool(f.isMonospace) },
  { header: "Hinting", value: (f) => bool(f.hasHinting) },
  { header: "File Size", value: (f) => num(f.fileSize) },

  // Versions and dates
  { header: "Version", value: (f) => num(f.version) },
  { header: "Version String", value: (f) => text(f.versionString) },
  { header: "Version History", value: versionHistory },
  { header: "Date Added", value: (f) => text(f.dateAdded) },
  { header: "First Commit Date", value: (f) => text(f.firstCommitDate) },
  { header: "Created", value: (f) => msDate(f.createdMs) },
  { header: "Modified", value: (f) => msDate(f.modifiedMs) },
  { header: "Last Modified (API)", value: (f) => text(f.lastModifiedApi) },
  { header: "GF TTF Commit Date", value: (f) => text(f.gfTtfCommitDate) },

  // Upstream repository
  { header: "Upstream Head Date", value: (f) => text(f.upstreamHeadDate) },
  { header: "Upstream Any Date", value: (f) => text(f.upstreamAnyDate) },
  { header: "Upstream Pushed At", value: (f) => text(f.upstreamPushedAt) },
  { header: "Upstream Archived", value: (f) => bool(f.upstreamArchived) },
  { header: "Upstream Repo Key", value: (f) => text(f.upstreamRepoKey) },
  { header: "Upstream Newest Tag", value: (f) => text(f.upstreamNewestTag) },

  // Ranking
  { header: "Popularity Rank", value: (f) => num(f.popularityRank) },
  { header: "Trending Rank", value: (f) => num(f.trendingRank) },

  // Long-form text
  { header: "Specimen", value: (f) => text(f.specimen) },
  { header: "Specimen Tiers", value: (f) => (f.specimenTiers ?? []).join(" ") },
  { header: "About", value: (f) => prose(f.about) },
  { header: "License Header", value: (f) => prose(f.licenseHeader) },
  { header: "Siblings By Designer", value: siblings },

  // Links
  { header: "GitHub URL", value: (f) => text(f.repositoryUrl) },
  {
    header: "Google Fonts URL",
    value: (f) =>
      `https://fonts.google.com/specimen/${f.name.replace(/\s+/g, "+")}`,
  },
];

/** RFC 4180: quote every field, double any embedded quote. */
function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildFontsCsv(fonts: FontRecord[]): string {
  const rows = [
    COLUMNS.map((c) => cell(c.header)).join(","),
    ...fonts.map((f) => COLUMNS.map((c) => cell(c.value(f))).join(",")),
  ];
  // CRLF + BOM so Excel opens the UTF-8 content correctly.
  return `﻿${rows.join("\r\n")}\r\n`;
}

export function csvFileName(): string {
  return `font-fridge-fonts-${new Date().toISOString().slice(0, 10)}.csv`;
}
