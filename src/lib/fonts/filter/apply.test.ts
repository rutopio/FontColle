import { describe, expect, it } from "vitest";
import type { FontRecord } from "@/lib/fonts/types";
import { applyFilters, searchByQuery, suggestFamilies } from "./apply";
import { fontActivity, fontRepoStatus, fontSpacing } from "./facets";
import { emptyFilter, type FilterState } from "./state";

function font(over: Partial<FontRecord> = {}): FontRecord {
  return {
    id: over.id ?? over.name?.toLowerCase().replace(/\s+/g, "-") ?? "f",
    name: "Test",
    displayName: null,
    designer: null,
    category: "Sans",
    apiCategory: null,
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
    createdMs: null,
    modifiedMs: null,
    weightClass: null,
    widthClass: null,
    weights: [],
    glyphCount: null,
    charCount: null,
    primaryScript: null,
    popularityRank: null,
    trendingRank: null,
    lastModifiedApi: null,
    upstreamHeadDate: null,
    upstreamAnyDate: null,
    upstreamPushedAt: null,
    upstreamArchived: null,
    upstreamRepoKey: null,
    upstreamNewestTag: null,
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

const names = (fonts: FontRecord[]) => fonts.map((f) => f.name);

describe("applyFilters, text query", () => {
  const fonts = [
    font({ name: "Inter" }),
    font({ name: "Roboto", designer: "Christian Robertson" }),
    font({ name: "Lato", displayName: "Lato Display" }),
  ];
  it("does NOT gate on the query (searchByQuery owns text search now)", () => {
    expect(applyFilters(fonts, filter({ query: "rob" }))).toHaveLength(3);
  });
});

describe("applyFilters, category", () => {
  const fonts = [
    font({ name: "S", category: "Sans" }),
    font({ name: "R", category: "Serif" }),
  ];
  it("includes the matching category, excludes others", () => {
    expect(
      names(applyFilters(fonts, filter({ categories: ["Sans"] })))
    ).toEqual(["S"]);
  });
});

describe("applyFilters, tags (Font type radio)", () => {
  const fonts = [
    font({ name: "V", facets: ["variable", "ligatures"] }),
    font({ name: "S", facets: ["static"] }),
  ];
  it("keeps only families carrying the selected font type", () => {
    expect(names(applyFilters(fonts, filter({ tags: ["variable"] })))).toEqual([
      "V",
    ]);
    expect(names(applyFilters(fonts, filter({ tags: ["static"] })))).toEqual([
      "S",
    ]);
  });
});

describe("applyFilters, features (AND default)", () => {
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

describe("applyFilters, variable axes", () => {
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

describe("applyFilters, weight and width ranges", () => {
  const wght = { tag: "wdth", name: null, min: 75, default: 100, max: 125 };
  const fonts = [
    font({ name: "Reg", weights: [400], widthClass: 5 }),
    font({ name: "Bold", weights: [700], widthClass: 5 }),
    font({ name: "Cond", weights: [400], widthClass: 5, axes: [wght] }),
    font({ name: "Both", weights: [400, 700], widthClass: 5 }),
  ];
  it("AND within weights (default): family covers every selected step", () => {
    expect(
      names(applyFilters(fonts, filter({ weights: ["400", "700"] })))
    ).toEqual(["Both"]);
  });
  it("OR within weights (toggle): family offers at least one selected step", () => {
    const out = applyFilters(
      fonts,
      filter({ weights: ["400", "700"], matchModes: { weights: "any" } })
    );
    expect(names(out)).toEqual(["Reg", "Bold", "Cond", "Both"]);
  });
  it("width covers the wdth-axis range (75-125% -> steps 3..6)", () => {
    expect(names(applyFilters(fonts, filter({ widths: ["3"] })))).toEqual([
      "Cond",
    ]);
  });
});

describe("applyFilters, writing systems and languages", () => {
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

describe("applyFilters, color and color formats", () => {
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

describe("applyFilters, style (OR default, per-group threshold)", () => {
  const fonts = [
    font({ name: "Didone", tags: { "/Serif/Didone": 80 } }),
    font({ name: "Faint", tags: { "/Serif/Didone": 20 } }),
    font({ name: "Sans", tags: { "/Sans/Humanist": 90 } }),
  ];
  it("includes a form tag at any positive score", () => {
    expect(
      names(applyFilters(fonts, filter({ style: ["/Serif/Didone"] })))
    ).toEqual(["Didone", "Faint"]);
  });
  it("excludes a form tag the family does not carry at all", () => {
    expect(
      names(applyFilters(fonts, filter({ style: ["/Slab/Clarendon"] })))
    ).toEqual([]);
  });
  it("requires 50+ for a mood tag", () => {
    const moody = [
      font({ name: "Strong", tags: { "/Expressive/Vintage": 70 } }),
      font({ name: "Trace", tags: { "/Expressive/Vintage": 10 } }),
    ];
    expect(
      names(applyFilters(moody, filter({ style: ["/Expressive/Vintage"] })))
    ).toEqual(["Strong"]);
  });
  it("OR by default across selected tags", () => {
    const out = applyFilters(
      fonts,
      filter({ style: ["/Serif/Didone", "/Sans/Humanist"] })
    );
    expect(names(out)).toEqual(["Didone", "Faint", "Sans"]);
  });
});

describe("applyFilters, designers, vendors, license, repo, upm", () => {
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
  it("OR within designers (default): family lists at least one selected name", () => {
    expect(
      names(
        applyFilters(
          fonts,
          filter({ designers: ["José Scaglione", "Steve Matteson"] })
        )
      )
    ).toEqual(["A", "B"]);
  });
  it("AND within designers (toggle): co-designed by every selected name", () => {
    expect(
      names(
        applyFilters(
          fonts,
          filter({
            designers: ["Veronika Burian", "José Scaglione"],
            matchModes: { designers: "all" },
          })
        )
      )
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

describe("applyFilters, noto flag, italic, hinting, monospace-metric", () => {
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
    expect(names(applyFilters(fonts, filter({ source: ["noto"] })))).toEqual([
      "Noto",
    ]);
    expect(names(applyFilters(fonts, filter({ source: ["others"] })))).toEqual([
      "Other",
    ]);
  });
  it("italic and slant are independent traits, not a radio", () => {
    // Google ships italics as a separate file, so no family exposes an `ital`
    // axis -- italic is read off the named instances. A family can hold both
    // traits (Roboto Flex, Recursive), which a radio could not express.
    const slnt = {
      tag: "slnt",
      name: null,
      min: null,
      default: null,
      max: null,
    };
    const italicInstance = { name: "Italic", italic: true, coords: {} };
    const cohort = [
      font({ name: "ItalicOnly", instances: [italicInstance] }),
      font({ name: "SlantOnly", axes: [slnt] }),
      font({ name: "Both", axes: [slnt], instances: [italicInstance] }),
      font({ name: "Neither" }),
    ];
    expect(names(applyFilters(cohort, filter({ italic: ["italic"] })))).toEqual(
      ["ItalicOnly", "Both"]
    );
    expect(names(applyFilters(cohort, filter({ italic: ["slant"] })))).toEqual([
      "SlantOnly",
      "Both",
    ]);
    // Selecting both pills is a union, so "Both" is listed once, not twice.
    expect(
      names(applyFilters(cohort, filter({ italic: ["italic", "slant"] })))
    ).toEqual(["ItalicOnly", "SlantOnly", "Both"]);
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

describe("applyFilters, metric ranges", () => {
  const fonts = [
    font({ name: "Tall", xHeight: 520, unitsPerEm: 1000 }),
    font({ name: "Short", xHeight: 400, unitsPerEm: 1000 }),
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

describe("searchByQuery", () => {
  it("returns the input unchanged for an empty query", () => {
    const fonts = [font({ name: "Inter" }), font({ name: "Roboto" })];
    expect(searchByQuery(fonts, "  ")).toBe(fonts);
  });

  it("filters to matches and drops non-matches", () => {
    const fonts = [
      font({ name: "Inter" }),
      font({ name: "Roboto" }),
      font({ name: "Lato" }),
    ];
    expect(names(searchByQuery(fonts, "rob"))).toEqual(["Roboto"]);
    expect(searchByQuery(fonts, "zzzzz")).toEqual([]);
  });

  it("matches on designer and on vendor (name + id)", () => {
    const fonts = [
      font({ name: "Alpha", designer: "Christian Robertson" }),
      font({ name: "Beta", vendorId: "GOOG" }),
    ];
    expect(names(searchByQuery(fonts, "christian"))).toEqual(["Alpha"]);
    expect(names(searchByQuery(fonts, "goog"))).toEqual(["Beta"]);
  });

  it("ranks a name hit above a designer-only hit", () => {
    const fonts = [
      font({ name: "Studio Sans", designer: "Someone" }),
      font({ name: "Zzz", designer: "Studio Foundry" }),
    ];
    expect(names(searchByQuery(fonts, "studio"))[0]).toBe("Studio Sans");
  });

  it("tolerates a single typo (huninnn -> Bpmf Huninn)", () => {
    const fonts = [font({ name: "Bpmf Huninn" }), font({ name: "Inter" })];
    expect(names(searchByQuery(fonts, "huninnn"))).toEqual(["Bpmf Huninn"]);
  });
});

describe("suggestFamilies", () => {
  const fonts = [
    font({ name: "Inter" }),
    font({ name: "Roboto" }),
    font({ name: "Noto Sans" }),
  ];
  it("suggests the closest name first for a typo within edit budget", () => {
    expect(suggestFamilies("robato", fonts)[0]).toBe("Roboto");
    expect(suggestFamilies("intr", fonts)[0]).toBe("Inter");
  });
  it("tolerates two edits on a longer query (looser than the search)", () => {
    expect(suggestFamilies("robotaa", fonts)[0]).toBe("Roboto");
  });
  it("matches an individual word of a multi-word family", () => {
    expect(suggestFamilies("noto", fonts)).toContain("Noto Sans");
  });
  it("lists every family within the edit budget, closest first", () => {
    const cuts = [
      font({ name: "Bpmf Huninn" }),
      font({ name: "Klee Huninn" }),
      font({ name: "Inter" }),
    ];
    const out = suggestFamilies("huninnn", cuts);
    expect(out).toEqual(["Bpmf Huninn", "Klee Huninn"]);
  });
  it("caps the list at MAX_SUGGESTIONS", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      font({ name: `Huninn ${i}` })
    );
    expect(suggestFamilies("huninnn", many).length).toBeLessThanOrEqual(5);
  });
  it("returns empty for a too-short query", () => {
    expect(suggestFamilies("ab", fonts)).toEqual([]);
  });
  it("returns empty when nothing is close enough", () => {
    expect(suggestFamilies("xylophone", fonts)).toEqual([]);
  });
});

describe("fontRepoStatus", () => {
  it("reports the upstream archived flag", () => {
    expect(fontRepoStatus(font({ upstreamArchived: false }))).toBe("live");
    expect(fontRepoStatus(font({ upstreamArchived: true }))).toBe("archived");
  });

  it("is unknown when the family has no resolvable repo", () => {
    expect(fontRepoStatus(font({ upstreamArchived: null }))).toBe("unknown");
  });
});

describe("fontActivity", () => {
  const monthsAgo = (n: number) => Date.now() - n * 30.44 * 24 * 60 * 60 * 1000;
  const daysAgoIso = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  it("prefers upstream repo activity over the build stamp", () => {
    // Alegreya's shape: Google rebuilt it recently, but master is years cold.
    const f = font({
      modifiedMs: monthsAgo(1),
      upstreamHeadDate: daysAgoIso(365 * 5),
    });
    expect(fontActivity(f)).toBe("dormant");
  });

  it("counts a live upstream repo even when the binary is old", () => {
    const f = font({
      modifiedMs: monthsAgo(120),
      upstreamHeadDate: daysAgoIso(30),
    });
    expect(fontActivity(f)).toBe("latest");
  });

  it("buckets by how long ago the font was compiled", () => {
    expect(fontActivity(font({ modifiedMs: monthsAgo(1) }))).toBe("latest");
    expect(fontActivity(font({ modifiedMs: monthsAgo(9) }))).toBe("active");
    expect(fontActivity(font({ modifiedMs: monthsAgo(24) }))).toBe("recent");
    expect(fontActivity(font({ modifiedMs: monthsAgo(60) }))).toBe("dormant");
  });

  it("ignores the Google publish date", () => {
    const f = font({
      modifiedMs: monthsAgo(120),
      lastModifiedApi: new Date().toISOString().slice(0, 10),
    });
    expect(fontActivity(f)).toBe("dormant");
  });

  it("falls back to the first commit when head.modified is unset", () => {
    const f = font({ modifiedMs: 0, firstCommitDate: "2024-01-15" });
    expect(fontActivity(f)).toBe("recent");
  });

  it("is dormant when nothing dates the family", () => {
    expect(
      fontActivity(font({ modifiedMs: null, firstCommitDate: null }))
    ).toBe("dormant");
  });
});

describe("fontSpacing", () => {
  it("reads Google's /Monospace tag as the authority", () => {
    expect(fontSpacing(font({ tags: { "/Monospace/Monospace": 100 } }))).toBe(
      "mono"
    );
  });

  it("keeps a mono face's letterform tag orthogonal to its spacing", () => {
    // Roboto Mono is Sans AND mono in Google's own tag data, so it sits on the
    // Sans card while the Spacing filter still reports it as monospaced.
    const roboto = font({
      category: "Sans",
      tags: { "/Monospace/Monospace": 100, "/Sans/Grotesque": 100 },
    });
    expect(fontSpacing(roboto)).toBe("mono");
    expect(
      applyFilters([roboto], {
        ...emptyFilter,
        categories: ["Sans"],
        spacing: ["mono"],
      })
    ).toHaveLength(1);
  });

  it("falls back to the API category when the tags CSV is silent", () => {
    // Iosevka Charon: no tag row, but the API knows it is monospace.
    expect(fontSpacing(font({ apiCategory: "MONOSPACE" }))).toBe("mono");
  });

  it("ignores isFixedPitch, which claims non-mono display faces", () => {
    // Press Start 2P / Rubik Mono One set the post-table flag but are not mono.
    expect(fontSpacing(font({ isMonospace: true }))).toBe("proportional");
  });

  it("treats an untagged proportional family as proportional", () => {
    expect(fontSpacing(font({ tags: { "/Sans/Geometric": 100 } }))).toBe(
      "proportional"
    );
  });
});

describe("spacing filter", () => {
  const mono = font({
    name: "Roboto Mono",
    tags: { "/Monospace/Monospace": 100 },
  });
  const sans = font({ name: "Roboto", tags: { "/Sans/Grotesque": 100 } });

  it("keeps only monospaced families", () => {
    const out = applyFilters([mono, sans], {
      ...emptyFilter,
      spacing: ["mono"],
    });
    expect(out.map((f) => f.name)).toEqual(["Roboto Mono"]);
  });

  it("keeps only proportional families", () => {
    const out = applyFilters([mono, sans], {
      ...emptyFilter,
      spacing: ["proportional"],
    });
    expect(out.map((f) => f.name)).toEqual(["Roboto"]);
  });

  it("does not filter when unset", () => {
    expect(applyFilters([mono, sans], emptyFilter)).toHaveLength(2);
  });
});
