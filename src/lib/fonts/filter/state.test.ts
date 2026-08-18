import { describe, expect, it } from "vitest";
import type { MetricKey } from "@/lib/fonts/metrics";
import type { ModeKey } from "./match-mode";
import {
  emptyFilter,
  type FilterSearch,
  type FilterState,
  filterToSearch,
  parseFilterSearch,
  searchToFilter,
} from "./state";

const fullFilter: FilterState = {
  query: "noto sans",
  categories: ["Serif", "Sans"],
  tags: ["variable"],
  features: ["liga", "smcp"],
  axes: ["wght", "wdth"],
  weights: ["400", "700"],
  widths: ["3", "5"],
  scripts: ["Latn", "Cyrl"],
  languages: ["en_Latn", "ru_Cyrl"],
  color: ["color"],
  colorFormats: ["COLR", "SVG"],
  style: ["/Serif/Didone", "/Expressive/Playful"],
  designers: ["Veronika Burian", "Steve Matteson"],
  vendors: ["GOOG", "ADBE"],
  license: ["OFL", "APACHE2"],
  repoHosts: ["github", "gitlab"],
  activity: ["active"],
  repoStatus: ["live"],
  source: ["others"],
  italic: ["italic"],
  spacing: ["mono"],
  upm: ["1000", "2048"],
  instances: [2, 9],
  metrics: {
    xHeight: [0.45, 0.55],
    fileSize: [16384, 353980],
  },
  hasHinting: true,
  matchModes: { features: "any", style: "all" },
};

describe("searchToFilter(filterToSearch(f)) round-trip", () => {
  it("preserves the default/empty state", () => {
    expect(searchToFilter(filterToSearch(emptyFilter))).toEqual(emptyFilter);
  });

  it("preserves a fully-populated state (every field)", () => {
    expect(searchToFilter(filterToSearch(fullFilter))).toEqual(fullFilter);
  });

  it("preserves a query-only state", () => {
    const f: FilterState = { ...emptyFilter, query: "inter" };
    expect(searchToFilter(filterToSearch(f))).toEqual(f);
  });

  it("preserves a facet-arrays-only state", () => {
    const f: FilterState = {
      ...emptyFilter,
      categories: ["Sans"],
      scripts: ["Latn", "Grek"],
      colorFormats: ["COLR"],
    };
    expect(searchToFilter(filterToSearch(f))).toEqual(f);
  });

  it("preserves a boolean+range combo state", () => {
    const f: FilterState = {
      ...emptyFilter,
      hasHinting: false,
      metrics: { contrast: [1.2, 4.0], avgWidth: [0.4, 0.6] },
    };
    expect(searchToFilter(filterToSearch(f))).toEqual(f);
  });

  it("preserves a radio + matchModes combo state", () => {
    const f: FilterState = {
      ...emptyFilter,
      color: ["monochrome"],
      italic: ["upright"],
      activity: ["dormant"],
      matchModes: { scripts: "any" },
    };
    expect(searchToFilter(filterToSearch(f))).toEqual(f);
  });

  it("distinguishes hasHinting false from undefined", () => {
    const off = filterToSearch({ ...emptyFilter, hasHinting: undefined });
    const no = filterToSearch({ ...emptyFilter, hasHinting: false });
    expect(off.hinting).toBeUndefined();
    expect(no.hinting).toBe("unhinted");
    expect(searchToFilter(no).hasHinting).toBe(false);
    expect(searchToFilter(off).hasHinting).toBeUndefined();
  });
});

describe("filterToSearch normalization", () => {
  it("omits empty arrays and defaults from the URL", () => {
    expect(filterToSearch(emptyFilter)).toEqual({});
  });

  it("drops matchMode entries equal to the section default", () => {
    const s = filterToSearch({
      ...emptyFilter,
      matchModes: { features: "all", style: "any" },
    });
    expect(s.mode).toBeUndefined();
  });

  it("keeps only non-default matchMode entries", () => {
    const s = filterToSearch({
      ...emptyFilter,
      matchModes: { features: "any" },
    });
    expect(s.mode).toBe("features:any");
  });

  it("joins list params with underscore, designer/lang with comma", () => {
    const s = filterToSearch(fullFilter);
    expect(s.category).toBe("Serif_Sans");
    expect(s.weight).toBe("400_700");
    expect(s.designer).toContain(",");
    expect(s.lang).toBe("en_Latn,ru_Cyrl");
  });

  it("encodes classification paths as friendly dot/underscore form", () => {
    const s = filterToSearch({
      ...emptyFilter,
      style: ["/Serif/Didone", "/Sans/Humanist"],
    });
    expect(s.style).toBe("Serif.Didone_Sans.Humanist");
  });

  it("splits the style state into style (form) and mood (feel) params", () => {
    const s = filterToSearch({
      ...emptyFilter,
      style: ["/Serif/Didone", "/Expressive/Playful", "/Sans/Humanist"],
    });
    expect(s.style).toBe("Serif.Didone_Sans.Humanist");
    expect(s.mood).toBe("Expressive.Playful");
  });

  it("merges style and mood params back into one style array", () => {
    const f = searchToFilter({
      style: "Serif.Didone",
      mood: "Expressive.Playful",
    });
    expect(f.style).toEqual(["/Serif/Didone", "/Expressive/Playful"]);
  });

  it("spells the source radio with its pill labels (noto / non-noto)", () => {
    expect(filterToSearch({ ...emptyFilter, source: ["noto"] }).noto).toBe(
      "noto"
    );
    expect(filterToSearch({ ...emptyFilter, source: ["others"] }).noto).toBe(
      "non-noto"
    );
    expect(searchToFilter({ noto: "non-noto" }).source).toEqual(["others"]);
    expect(searchToFilter({ noto: "noto" }).source).toEqual(["noto"]);
  });
});

describe("searchToFilter reverse-direction edge cases", () => {
  it("maps an empty search to the empty filter", () => {
    expect(searchToFilter({})).toEqual(emptyFilter);
  });

  it("accepts either comma or underscore as the list separator", () => {
    expect(searchToFilter({ category: "Serif,Sans" }).categories).toEqual([
      "Serif",
      "Sans",
    ]);
  });

  it("accepts the raw comma/slash classification form", () => {
    expect(
      searchToFilter({ style: "/Serif/Didone,/Sans/Humanist" }).style
    ).toEqual(["/Serif/Didone", "/Sans/Humanist"]);
  });

  it("coerces a numeric instances param to a string", () => {
    expect(parseFilterSearch({ instances: 1 }).instances).toBe("1");
  });

  it("ignores a malformed instances range", () => {
    expect(searchToFilter({ instances: "bogus" }).instances).toBeUndefined();
    expect(searchToFilter({ instances: "1" }).instances).toBeUndefined();
    expect(searchToFilter({ instances: "2-" }).instances).toBeUndefined();
  });

  it("round-trips an arbitrary instances range", () => {
    expect(
      filterToSearch({ ...emptyFilter, instances: [3, 27] }).instances
    ).toBe("3-27");
    expect(searchToFilter({ instances: "3-27" }).instances).toEqual([3, 27]);
  });

  it("clamps and orders an out-of-domain instances range", () => {
    expect(searchToFilter({ instances: "27-3" }).instances).toEqual([3, 27]);
    expect(searchToFilter({ instances: "0-999" }).instances).toBeUndefined();
  });

  it("drops a full-domain instances range (it filters nothing)", () => {
    expect(
      filterToSearch({ ...emptyFilter, instances: [1, 74] }).instances
    ).toBeUndefined();
  });

  it("drops a fully non-numeric metric range", () => {
    expect(searchToFilter({ xheight: "abc" }).metrics).toEqual({});
  });

  // Number("") is 0, so half-open ranges like "0.4-" used to decode to [0.4, 0].
  it("drops a half-open metric range instead of mis-parsing it", () => {
    expect(searchToFilter({ xheight: "0.4-" }).metrics).toEqual({});
    expect(searchToFilter({ xheight: "-0.4" }).metrics).toEqual({});
  });

  it("designer values containing a comma round-trip lossily (documented)", () => {
    const f: FilterState = {
      ...emptyFilter,
      designers: ["Veronika Burian, José Scaglione"],
    };
    const back = searchToFilter(filterToSearch(f));
    expect(back.designers).toEqual(["Veronika Burian", " José Scaglione"]);
  });

  it("ignores unknown mode keys and invalid modes", () => {
    const f = searchToFilter({
      mode: "bogus:any,features:sideways,features:any",
    });
    expect(f.matchModes).toEqual({ features: "any" });
  });

  it("reverse round-trips a search back to itself", () => {
    const canonical: FilterSearch = {
      q: "roboto",
      category: "Sans",
      weight: "400_700",
      lang: "en_Latn",
      style: "Sans.Humanist",
      xheight: "0.45-0.55",
      hinting: "hinted",
      mode: "features:any",
    };
    expect(filterToSearch(searchToFilter(canonical))).toEqual(canonical);
  });

  it("drops a redundant (default-valued) mode pair on decode", () => {
    expect(searchToFilter({ mode: "features:all" }).matchModes).toEqual({});
  });
});

describe("coverage guard", () => {
  it("fullFilter exercises every FilterState key", () => {
    const covered = new Set(Object.keys(fullFilter));
    const expected = new Set(Object.keys(emptyFilter));
    expected.add("hasHinting");
    for (const k of expected) expect(covered.has(k)).toBe(true);
    for (const k of Object.keys(fullFilter.metrics))
      expect(typeof k).toBe("string");
    void ({} as Record<MetricKey, unknown>);
    void ({} as Record<ModeKey, unknown>);
  });
});
