import type { FontRecord } from "./types";

// Derive the §12 facets from a record's axes/features/subsets. Mirrors the
// harvester's Python logic so records loaded from D1 (which stores raw axes /
// features, not derived facets) get the same facet tags as the static dataset.

const FEATURE_FACETS: Record<string, string> = {
  smcp: "small-caps",
  c2sc: "small-caps",
  dlig: "discretionary-ligatures",
  hlig: "historical-ligatures",
  liga: "ligatures",
  frac: "fractions",
  tnum: "tabular-figures",
  onum: "oldstyle-figures",
  zero: "slashed-zero",
  case: "case-sensitive",
  salt: "stylistic-alternates",
  titl: "titling",
};

const AXIS_FACETS: Record<string, string> = {
  wght: "weight-axis",
  wdth: "width-axis",
  opsz: "optical-size-axis",
  slnt: "slant-axis",
  ital: "italic-axis",
  GRAD: "grade-axis",
};

export function deriveFacets(font: FontRecord): string[] {
  const facets = new Set<string>();
  facets.add(font.isVariable ? "variable" : "static");

  const hasSlantOrItalAxis = font.axes.some(
    (a) => a.tag === "ital" || a.tag === "slnt"
  );
  // Instances now carry an explicit italic flag (separate-file italics), so use
  // it directly and fall back to a name check for older records.
  const hasItalicInstance = font.instances.some(
    (i) => i.italic || (i.name ?? "").toLowerCase().includes("ital")
  );
  if (hasSlantOrItalAxis || hasItalicInstance) facets.add("has-italic");

  for (const a of font.axes) {
    const f = AXIS_FACETS[a.tag];
    if (f) facets.add(f);
  }
  for (const tag of font.features) {
    const f = FEATURE_FACETS[tag];
    if (f) facets.add(f);
  }

  if (font.subsets.includes("latin")) facets.add("latin");
  if (
    font.subsets.some(
      (s) => s.startsWith("chinese") || s === "japanese" || s === "korean"
    )
  ) {
    facets.add("cjk");
  }
  for (const s of [
    "arabic",
    "cyrillic",
    "greek",
    "hebrew",
    "thai",
    "devanagari",
  ]) {
    if (font.subsets.includes(s)) facets.add(s);
  }

  return [...facets].sort();
}

/** Fill in facets for records that don't already have them (e.g. from D1). */
export function withFacets(fonts: FontRecord[]): FontRecord[] {
  return fonts.map((f) =>
    f.facets.length ? f : { ...f, facets: deriveFacets(f) }
  );
}
