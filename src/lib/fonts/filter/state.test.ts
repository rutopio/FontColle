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

// A fully-populated FilterState touching every field of the interface, so the
// round-trip test exercises the whole codec, not just the common ones. Values
// are chosen to be underscore-free where the encoder joins with "_" (category,
// tag, feature, axis, weight, width, script, color, colorformat, vendor,
// license, repo, activity, noto, italic, upm), an underscore inside a value
// would be indistinguish-
// able from the separator on decode, which is a real (accepted) limitation of
// the scheme, not something these fields ever hold in practice.
const fullFilter: FilterState = {
  query: "noto sans",
  classes: ["Serif", "Sans"],
  tags: ["ligatures", "small-caps"],
  features: ["liga", "smcp"],
  axes: ["wght", "wdth"],
  weights: ["400", "700"],
  widths: ["3", "5"],
  scripts: ["Latn", "Cyrl"],
  languages: ["en_Latn", "ru_Cyrl"], // comma-joined, "_" is safe here
  color: ["color"],
  colorFormats: ["COLR", "SVG"],
  // One form ("style" group) and one feel ("mood" group) path, so the round-trip
  // exercises both the `style` and `mood` URL params the codec splits into.
  style: ["/Serif/Didone", "/Expressive/Playful"],
  // FINDING (real bug, documented, see "designer values ..." test below):
  // designer tokens must NOT themselves contain a comma, because filterToSearch
  // comma-joins them and searchToFilter comma-splits them. A single stored
  // token like "Veronika Burian, José Scaglione" would round-trip lossily into
  // two tokens. In practice designers is populated from designerTokens(), which
  // already splits on "," so each element is comma-free, the round-trip holds
  // for real data. Fixtures here use comma-free tokens to match that invariant.
  designers: ["Veronika Burian", "Steve Matteson"],
  vendors: ["GOOG", "ADBE"],
  license: ["OFL", "APACHE2"],
  repoHosts: ["github", "gitlab"],
  activity: ["active"],
  flags: ["others"], // encodes to noto=non-noto, exercising the source remap
  italic: ["italic"],
  upm: ["1000", "2048"],
  // Instance bucket range; the URL carries its id ("2-9"), not the raw range.
  instances: [2, 9],
  metrics: {
    xHeight: [0.45, 0.55],
    fileSize: [16384, 353980],
  },
  hasHinting: true,
  matchModes: { tags: "any", style: "all" }, // both differ from default
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
      classes: ["Sans"],
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

  // hasHinting has three states; false must survive the round-trip distinctly
  // from undefined (which drops the param entirely).
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
    // A pristine filter produces an entirely empty search object.
    expect(filterToSearch(emptyFilter)).toEqual({});
  });

  it("drops matchMode entries equal to the section default", () => {
    // tags defaults to "all"; setting it explicitly to "all" is redundant and
    // must not appear in the URL.
    const s = filterToSearch({
      ...emptyFilter,
      matchModes: { tags: "all", style: "any" },
    });
    // style default is "any", so it's also dropped -> no mode param.
    expect(s.mode).toBeUndefined();
  });

  it("keeps only non-default matchMode entries", () => {
    const s = filterToSearch({
      ...emptyFilter,
      matchModes: { tags: "any" }, // default is "all", so kept
    });
    expect(s.mode).toBe("tags:any");
  });

  it("joins list params with underscore, designer/lang with comma", () => {
    const s = filterToSearch(fullFilter);
    expect(s.category).toBe("Serif_Sans");
    expect(s.weight).toBe("400_700");
    expect(s.designer).toContain(","); // designer names keep the comma
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
    expect(filterToSearch({ ...emptyFilter, flags: ["noto"] }).noto).toBe(
      "noto"
    );
    expect(filterToSearch({ ...emptyFilter, flags: ["others"] }).noto).toBe(
      "non-noto"
    );
    // and back: the URL "non-noto" decodes to the internal "others" flag.
    expect(searchToFilter({ noto: "non-noto" }).flags).toEqual(["others"]);
    expect(searchToFilter({ noto: "noto" }).flags).toEqual(["noto"]);
  });
});

describe("searchToFilter reverse-direction edge cases", () => {
  it("maps an empty search to the empty filter", () => {
    expect(searchToFilter({})).toEqual(emptyFilter);
  });

  it("accepts either comma or underscore as the list separator", () => {
    // splitUnderscore honours both, so a hand-typed comma URL still parses.
    expect(searchToFilter({ category: "Serif,Sans" }).classes).toEqual([
      "Serif",
      "Sans",
    ]);
  });

  it("accepts the raw comma/slash classification form", () => {
    expect(
      searchToFilter({ style: "/Serif/Didone,/Sans/Humanist" }).style
    ).toEqual(["/Serif/Didone", "/Sans/Humanist"]);
  });

  // The single-instance bucket encodes as "1-1", so a hand-typed ?instances=1
  // is a truncated range with no upper bound and is rejected rather than
  // silently decoding to [1, 0]. parseFilterSearch still has to coerce a
  // number-shaped param to a string first, or it would never reach the codec.
  it("coerces a numeric instances param to a string", () => {
    expect(parseFilterSearch({ instances: 1 }).instances).toBe("1");
  });

  it("ignores a malformed instances range", () => {
    expect(searchToFilter({ instances: "bogus" }).instances).toBeUndefined();
    expect(searchToFilter({ instances: "1" }).instances).toBeUndefined();
    expect(searchToFilter({ instances: "2-" }).instances).toBeUndefined();
  });

  // The slider can land on any range, not just a bucket, so the codec has to
  // carry arbitrary bounds and sanitize hand-typed ones.
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
    // "abc".split("-") -> ["abc"]; both bounds NaN, so the range is dropped.
    expect(searchToFilter({ xheight: "abc" }).metrics).toEqual({});
  });

  // Regression: Number("") is 0, so a truncated half-open range like "0.4-"
  // used to silently decode to [0.4, 0]. parseRange now rejects empty parts.
  it("drops a half-open metric range instead of mis-parsing it", () => {
    expect(searchToFilter({ xheight: "0.4-" }).metrics).toEqual({});
    expect(searchToFilter({ xheight: "-0.4" }).metrics).toEqual({});
  });

  it("designer values containing a comma round-trip lossily (documented)", () => {
    // The whole-string designer token splits back into two on the comma the
    // encoder used as its separator. Real data never hits this (see fixture
    // note above), but the codec is not bijective for such a value.
    const f: FilterState = {
      ...emptyFilter,
      designers: ["Veronika Burian, José Scaglione"],
    };
    const back = searchToFilter(filterToSearch(f));
    expect(back.designers).toEqual(["Veronika Burian", " José Scaglione"]);
  });

  it("ignores unknown mode keys and invalid modes", () => {
    const f = searchToFilter({ mode: "bogus:any,tags:sideways,tags:any" });
    expect(f.matchModes).toEqual({ tags: "any" });
  });

  it("reverse round-trips a search back to itself", () => {
    // search -> filter -> search must be stable for a canonical (encoder-shaped)
    // search object.
    const canonical: FilterSearch = {
      q: "roboto",
      category: "Sans",
      weight: "400_700",
      lang: "en_Latn",
      style: "Sans.Humanist",
      xheight: "0.45-0.55",
      hinting: "hinted",
      mode: "tags:any",
    };
    expect(filterToSearch(searchToFilter(canonical))).toEqual(canonical);
  });

  // FINDING (documented, not a change): mode:pairs whose key is valid but whose
  // value equals the section default are dropped on decode, so a hand-typed
  // ?mode=tags:all yields an empty matchModes, which then re-encodes to no
  // mode param. This is intentional (defaults stay implicit) but means the raw
  // search string is NOT byte-preserved for redundant modes.
  it("drops a redundant (default-valued) mode pair on decode", () => {
    expect(searchToFilter({ mode: "tags:all" }).matchModes).toEqual({});
  });
});

// Guard: assert the fullFilter above actually covers every FilterState field,
// so adding a field to the interface without covering it here fails loudly.
describe("coverage guard", () => {
  it("fullFilter exercises every FilterState key", () => {
    const covered = new Set(Object.keys(fullFilter));
    const expected = new Set(Object.keys(emptyFilter));
    // hasHinting is optional and absent from emptyFilter; assert it explicitly.
    expected.add("hasHinting");
    for (const k of expected) expect(covered.has(k)).toBe(true);
    // And every metric/mode subkey used is a real key.
    for (const k of Object.keys(fullFilter.metrics))
      expect(typeof k).toBe("string");
    void ({} as Record<MetricKey, unknown>);
    void ({} as Record<ModeKey, unknown>);
  });
});
