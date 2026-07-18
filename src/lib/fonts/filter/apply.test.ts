import { describe, expect, it } from "vitest";
import type { FontRecord } from "../types";
import { applyFilters, queryRelevance, suggestFamily } from "./apply";
import { emptyFilter, type FilterState } from "./state";

// A minimal FontRecord factory: every field the matcher reads gets a sane
// default, and each test overrides only the fields it exercises. Fields the
// matcher never touches are set to null/empty to keep fixtures readable.
function font(over: Partial<FontRecord> = {}): FontRecord {
  return {
    id: over.id ?? over.name?.toLowerCase().replace(/\s+/g, "-") ?? "f",
    name: "Test",
    displayName: null,
    designer: null,
    class: "Sans",
    category: null,
    license: null,
    isVariable: false,
    subsets: [],
    repositoryUrl: null,
    isNoto: false,
    isBrandFont: null,
    isOpenSource: null,
    axes: [],
    instances: [],
    features: [],
    facets: [],
    colorTables: [],
    languages: [],
    scripts: [],
    cjkCoverage: {},
    version: null,
    versionString: null,
    dateAdded: null,
    firstCommitDate: null,
    weightClass: null,
    widthClass: null,
    weights: [],
    glyphCount: null,
    charCount: null,
    primaryScript: null,
    popularityRank: null,
    trendingRank: null,
    lastModified: null,
    versionHistory: [],
    specimen: null,
    about: null,
    designerProfiles: [],
    licenseHeader: null,
    tags: {},
    unitsPerEm: 1000,
    xHeight: null,
    capHeight: null,
    italicAngle: null,
    hheaAscender: null,
    hheaDescender: null,
    hheaLineGap: null,
    typoAscender: null,
    typoDescender: null,
    typoLineGap: null,
    winAscent: null,
    winDescent: null,
    useTypoMetrics: null,
    avgCharWidth: null,
    contrast: null,
    isMonospace: null,
    hasHinting: null,
    vendorId: null,
    fileSize: null,
    ...over,
  };
}

const filter = (over: Partial<FilterState>): FilterState => ({
  ...emptyFilter,
  ...over,
});

// Names of the records that survived a filter, for concise assertions.
const names = (fonts: FontRecord[]) => fonts.map((f) => f.name);

describe("applyFilters — text query", () => {
  const fonts = [
    font({ name: "Inter" }),
    font({ name: "Roboto", designer: "Christian Robertson" }),
    font({ name: "Lato", displayName: "Lato Display" }),
  ];
  it("matches on name substring", () => {
    expect(names(applyFilters(fonts, filter({ query: "rob" })))).toEqual([
      "Roboto",
    ]);
  });
  it("matches on displayName and designer too", () => {
    expect(applyFilters(fonts, filter({ query: "display" }))).toHaveLength(1);
    expect(applyFilters(fonts, filter({ query: "christian" }))).toHaveLength(1);
  });
  it("excludes non-matches", () => {
    expect(applyFilters(fonts, filter({ query: "zzz" }))).toHaveLength(0);
  });
});

describe("applyFilters — class", () => {
  const fonts = [
    font({ name: "S", class: "Sans" }),
    font({ name: "R", class: "Serif" }),
  ];
  it("includes the matching class, excludes others", () => {
    expect(names(applyFilters(fonts, filter({ classes: ["Sans"] })))).toEqual([
      "S",
    ]);
  });
});

describe("applyFilters — facets (AND default, OR toggle)", () => {
  const both = font({ name: "Both", facets: ["ligatures", "small-caps"] });
  const one = font({ name: "One", facets: ["ligatures"] });
  const fonts = [both, one];
  it("AND-mode requires every selected facet", () => {
    const out = applyFilters(
      fonts,
      filter({ facets: ["ligatures", "small-caps"] })
    );
    expect(names(out)).toEqual(["Both"]);
  });
  it("any-mode requires at least one selected facet", () => {
    const out = applyFilters(
      fonts,
      filter({
        facets: ["ligatures", "small-caps"],
        matchModes: { facets: "any" },
      })
    );
    expect(names(out)).toEqual(["Both", "One"]);
  });
});

describe("applyFilters — features (AND default)", () => {
  const fonts = [
    font({ name: "A", features: ["kern", "liga"] }),
    font({ name: "B", features: ["kern"] }),
  ];
  it("requires every selected feature by default", () => {
    expect(
      names(applyFilters(fonts, filter({ features: ["kern", "liga"] })))
    ).toEqual(["A"]);
  });
});

describe("applyFilters — variable axes", () => {
  const axis = (tag: string) => ({
    tag,
    name: null,
    min: null,
    default: null,
    max: null,
  });
  const fonts = [
    font({ name: "VF", axes: [axis("wght"), axis("wdth")] }),
    font({ name: "Static", axes: [] }),
  ];
  it("includes fonts carrying the selected axis, excludes static", () => {
    expect(names(applyFilters(fonts, filter({ axes: ["wght"] })))).toEqual([
      "VF",
    ]);
  });
  it("AND across axes requires all", () => {
    expect(
      applyFilters(fonts, filter({ axes: ["wght", "opsz"] }))
    ).toHaveLength(0);
  });
});

describe("applyFilters — weight and width ranges", () => {
  const wght = { tag: "wdth", name: null, min: 75, default: 100, max: 125 };
  const fonts = [
    font({ name: "Reg", weights: [400], widthClass: 5 }),
    font({ name: "Bold", weights: [700], widthClass: 5 }),
    font({ name: "Cond", weights: [400], widthClass: 5, axes: [wght] }),
  ];
  it("OR within weights: family offers at least one selected step", () => {
    expect(names(applyFilters(fonts, filter({ weights: ["700"] })))).toEqual([
      "Bold",
    ]);
  });
  it("width covers the wdth-axis range (75-125% -> steps 3..6)", () => {
    // Cond's wdth axis spans 75..125%, which includes step 3 (75%).
    expect(names(applyFilters(fonts, filter({ widths: ["3"] })))).toEqual([
      "Cond",
    ]);
  });
});

describe("applyFilters — writing systems and languages", () => {
  const fonts = [
    font({
      name: "Multi",
      scripts: ["Latn", "Cyrl"],
      languages: ["en_Latn", "ru_Cyrl"],
    }),
    font({ name: "Latin", scripts: ["Latn"], languages: ["en_Latn"] }),
  ];
  it("AND across scripts by default", () => {
    expect(
      names(applyFilters(fonts, filter({ scripts: ["Latn", "Cyrl"] })))
    ).toEqual(["Multi"]);
  });
  it("OR across scripts when toggled", () => {
    expect(
      applyFilters(
        fonts,
        filter({ scripts: ["Latn", "Cyrl"], matchModes: { scripts: "any" } })
      )
    ).toHaveLength(2);
  });
  it("AND across languages by default", () => {
    expect(
      names(applyFilters(fonts, filter({ languages: ["en_Latn", "ru_Cyrl"] })))
    ).toEqual(["Multi"]);
  });
});

describe("applyFilters — color and color formats", () => {
  const colr = font({ name: "COLR", colorTables: ["COLR", "CPAL"] });
  const svg = font({ name: "SVG", colorTables: ["SVG"] });
  const dual = font({ name: "Dual", colorTables: ["COLR", "SVG"] });
  const mono = font({ name: "Mono", colorTables: [] });
  const fonts = [colr, svg, dual, mono];
  it("color radio includes colorful, excludes monochrome", () => {
    expect(applyFilters(fonts, filter({ color: ["color"] }))).toHaveLength(3);
    expect(
      names(applyFilters(fonts, filter({ color: ["monochrome"] })))
    ).toEqual(["Mono"]);
  });
  it("colorFormats AND requires all selected tables (COLR+SVG -> only Dual)", () => {
    expect(
      names(applyFilters(fonts, filter({ colorFormats: ["COLR", "SVG"] })))
    ).toEqual(["Dual"]);
  });
  it("colorFormats OR when toggled", () => {
    const out = applyFilters(
      fonts,
      filter({
        colorFormats: ["COLR", "SVG"],
        matchModes: { colorFormats: "any" },
      })
    );
    expect(names(out)).toEqual(["COLR", "SVG", "Dual"]);
  });
});

describe("applyFilters — classifications (OR default, threshold 50)", () => {
  const fonts = [
    font({ name: "Didone", tags: { "/Serif/Didone": 80 } }),
    font({ name: "Weak", tags: { "/Serif/Didone": 40 } }), // below threshold
    font({ name: "Sans", tags: { "/Sans/Humanist": 90 } }),
  ];
  it("includes only fonts scoring >=50 for a selected tag", () => {
    expect(
      names(applyFilters(fonts, filter({ classifications: ["/Serif/Didone"] })))
    ).toEqual(["Didone"]);
  });
  it("OR by default across selected tags", () => {
    const out = applyFilters(
      fonts,
      filter({ classifications: ["/Serif/Didone", "/Sans/Humanist"] })
    );
    expect(names(out)).toEqual(["Didone", "Sans"]);
  });
});

describe("applyFilters — designers, vendors, license, repo, upm", () => {
  const fonts = [
    font({
      name: "A",
      designer: "Veronika Burian, José Scaglione",
      vendorId: "GOOG",
      license: "OFL",
      repositoryUrl: "https://github.com/google/fonts",
      unitsPerEm: 1000,
    }),
    font({
      name: "B",
      designer: "Steve Matteson",
      vendorId: "MONO",
      license: "APACHE2",
      repositoryUrl: null,
      unitsPerEm: 2048,
    }),
  ];
  it("designer matches a comma-split token", () => {
    expect(
      names(applyFilters(fonts, filter({ designers: ["José Scaglione"] })))
    ).toEqual(["A"]);
  });
  it("vendor matches the folded id", () => {
    expect(names(applyFilters(fonts, filter({ vendors: ["GOOG"] })))).toEqual([
      "A",
    ]);
  });
  it("license matches the id", () => {
    expect(
      names(applyFilters(fonts, filter({ license: ["APACHE2"] })))
    ).toEqual(["B"]);
  });
  it("repo host: github vs none", () => {
    expect(
      names(applyFilters(fonts, filter({ repoHosts: ["github"] })))
    ).toEqual(["A"]);
    expect(names(applyFilters(fonts, filter({ repoHosts: ["none"] })))).toEqual(
      ["B"]
    );
  });
  it("upm matches the units-per-em value", () => {
    expect(names(applyFilters(fonts, filter({ upm: ["2048"] })))).toEqual([
      "B",
    ]);
  });
});

describe("applyFilters — noto flag, italic, hinting, monospace-metric", () => {
  const fonts = [
    font({
      name: "Noto",
      isNoto: true,
      facets: ["has-italic"],
      hasHinting: true,
    }),
    font({ name: "Other", isNoto: false, facets: [], hasHinting: false }),
  ];
  it("noto/others radio partitions", () => {
    expect(names(applyFilters(fonts, filter({ flags: ["noto"] })))).toEqual([
      "Noto",
    ]);
    expect(names(applyFilters(fonts, filter({ flags: ["others"] })))).toEqual([
      "Other",
    ]);
  });
  it("italic radio uses the has-italic facet", () => {
    expect(names(applyFilters(fonts, filter({ italic: ["italic"] })))).toEqual([
      "Noto",
    ]);
    expect(names(applyFilters(fonts, filter({ italic: ["upright"] })))).toEqual(
      ["Other"]
    );
  });
  it("hinting true requires the trait; false excludes hinted", () => {
    expect(names(applyFilters(fonts, filter({ hasHinting: true })))).toEqual([
      "Noto",
    ]);
    expect(names(applyFilters(fonts, filter({ hasHinting: false })))).toEqual([
      "Other",
    ]);
  });
});

describe("applyFilters — metric ranges", () => {
  const fonts = [
    // xHeight ratio 0.52 (520/1000)
    font({ name: "Tall", xHeight: 520, unitsPerEm: 1000 }),
    // xHeight ratio 0.40
    font({ name: "Short", xHeight: 400, unitsPerEm: 1000 }),
    // null xHeight -> excluded by any active xHeight range
    font({ name: "Unknown", xHeight: null, unitsPerEm: 1000 }),
  ];
  it("keeps fonts whose derived value is in range, drops null inputs", () => {
    const out = applyFilters(
      fonts,
      filter({ metrics: { xHeight: [0.5, 0.6] } })
    );
    expect(names(out)).toEqual(["Tall"]);
  });
});

describe("queryRelevance ordering", () => {
  it("ranks exact > prefix > word-boundary > mid-word > designer-only", () => {
    const exact = queryRelevance(font({ name: "HK" }), "hk");
    const prefix = queryRelevance(font({ name: "HK Grotesk" }), "hk");
    const boundary = queryRelevance(font({ name: "Noto Sans HK" }), "hk");
    // "hk" sits mid-word (index 2, preceded by "s", not whitespace).
    const midword = queryRelevance(font({ name: "Ashko" }), "hk");
    const designer = queryRelevance(
      font({ name: "Zzz", designer: "HK Studio" }),
      "hk"
    );
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(boundary);
    expect(boundary).toBeGreaterThan(midword);
    expect(midword).toBeGreaterThan(designer);
    expect(designer).toBeGreaterThan(0);
  });
  it("returns 0 for an empty query and for no match", () => {
    expect(queryRelevance(font({ name: "Inter" }), "")).toBe(0);
    expect(queryRelevance(font({ name: "Inter" }), "zzz")).toBe(0);
  });
});

describe("suggestFamily", () => {
  const fonts = [
    font({ name: "Inter" }),
    font({ name: "Roboto" }),
    font({ name: "Noto Sans" }),
  ];
  it("suggests the closest name for a typo within edit budget", () => {
    expect(suggestFamily("robato", fonts)).toBe("Roboto");
    expect(suggestFamily("intr", fonts)).toBe("Inter");
  });
  it("matches an individual word of a multi-word family", () => {
    expect(suggestFamily("noto", fonts)).toBe("Noto Sans");
  });
  it("returns null for a too-short query", () => {
    expect(suggestFamily("ab", fonts)).toBeNull();
  });
  it("returns null when nothing is close enough", () => {
    expect(suggestFamily("xylophone", fonts)).toBeNull();
  });
});
