import { describe, expect, it } from "vitest";
import { type SortKey, sortFonts } from "./sort";
import type { FontRecord } from "./types";

function font(over: Partial<FontRecord>): FontRecord {
  return {
    name: "Z",
    designer: null,
    dateAdded: null,
    popularityRank: null,
    trendingRank: null,
    glyphCount: null,
    axes: [],
    ...over,
  } as FontRecord;
}

const axis = () => ({
  tag: "wght",
  name: null,
  min: null,
  default: null,
  max: null,
});
const names = (fonts: FontRecord[]) => fonts.map((f) => f.name);
const sortedNames = (fonts: FontRecord[], key: SortKey) =>
  names(sortFonts(fonts, key));

describe("sortFonts, name", () => {
  const fonts = [
    font({ name: "Charlie" }),
    font({ name: "alpha" }),
    font({ name: "Bravo" }),
  ];
  it("name-asc is case-insensitive A→Z", () => {
    expect(sortedNames(fonts, "name-asc")).toEqual([
      "alpha",
      "Bravo",
      "Charlie",
    ]);
  });
  it("name-desc reverses it", () => {
    expect(sortedNames(fonts, "name-desc")).toEqual([
      "Charlie",
      "Bravo",
      "alpha",
    ]);
  });
  it("does not mutate the input array", () => {
    const input = [font({ name: "B" }), font({ name: "A" })];
    sortFonts(input, "name-asc");
    expect(names(input)).toEqual(["B", "A"]);
  });
});

describe("sortFonts, creator (designer)", () => {
  const fonts = [
    font({ name: "X", designer: "Zoe" }),
    font({ name: "Y", designer: "Ann" }),
    font({ name: "N", designer: null }),
  ];
  it("creator-asc A→Z with nulls last", () => {
    expect(sortedNames(fonts, "creator-asc")).toEqual(["Y", "X", "N"]);
  });
  it("creator-desc Z→A (null still trails in the reversed compare)", () => {
    expect(sortedNames(fonts, "creator-desc")).toEqual(["N", "X", "Y"]);
  });
});

describe("sortFonts, date added", () => {
  const fonts = [
    font({ name: "Old", dateAdded: "2012-01-01" }),
    font({ name: "New", dateAdded: "2024-06-01" }),
    font({ name: "Mid", dateAdded: "2018-03-15" }),
    font({ name: "None", dateAdded: null }),
  ];
  it("date-newest: newest first, missing last", () => {
    expect(sortedNames(fonts, "date-newest")).toEqual([
      "New",
      "Mid",
      "Old",
      "None",
    ]);
  });
  it("date-oldest: oldest first, missing last", () => {
    expect(sortedNames(fonts, "date-oldest")).toEqual([
      "Old",
      "Mid",
      "New",
      "None",
    ]);
  });
});

describe("sortFonts, the two update dates", () => {
  const fonts = [
    font({
      name: "Donegal",
      upstreamHeadDate: "2026-07-20",
      gfTtfCommitDate: "2015-03-06",
    }),
    font({
      name: "Comfortaa",
      upstreamHeadDate: "2017-11-08",
      gfTtfCommitDate: "2021-08-26",
    }),
    font({
      name: "Alegreya",
      upstreamHeadDate: "2020-10-07",
      gfTtfCommitDate: "2021-01-08",
    }),
    font({ name: "None", upstreamHeadDate: null, gfTtfCommitDate: null }),
  ];

  it("updated-newest ranks by the upstream head", () => {
    expect(sortedNames(fonts, "updated-newest")).toEqual([
      "Donegal",
      "Alegreya",
      "Comfortaa",
      "None",
    ]);
  });

  it("gfupdated-newest ranks by the packaged font, a different order", () => {
    expect(sortedNames(fonts, "gfupdated-newest")).toEqual([
      "Comfortaa",
      "Alegreya",
      "Donegal",
      "None",
    ]);
  });

  it("gfupdated-oldest reverses it, missing still last", () => {
    expect(sortedNames(fonts, "gfupdated-oldest")).toEqual([
      "Donegal",
      "Alegreya",
      "Comfortaa",
      "None",
    ]);
  });
});

describe("sortFonts, popularity and trending", () => {
  const fonts = [
    font({ name: "C", popularityRank: 3, trendingRank: 1 }),
    font({ name: "A", popularityRank: 1, trendingRank: 3 }),
    font({ name: "Unranked", popularityRank: null, trendingRank: null }),
    font({ name: "B", popularityRank: 2, trendingRank: 2 }),
  ];
  it("popularity: lower rank first, unranked last", () => {
    expect(sortedNames(fonts, "popularity")).toEqual([
      "A",
      "B",
      "C",
      "Unranked",
    ]);
  });
  it("trending: lower rank first, unranked last", () => {
    expect(sortedNames(fonts, "trending")).toEqual(["C", "B", "A", "Unranked"]);
  });
  it("popularity-least: higher rank first, unranked still last", () => {
    expect(sortedNames(fonts, "popularity-least")).toEqual([
      "C",
      "B",
      "A",
      "Unranked",
    ]);
  });
  it("trending-least: higher rank first, unranked still last", () => {
    expect(sortedNames(fonts, "trending-least")).toEqual([
      "A",
      "B",
      "C",
      "Unranked",
    ]);
  });
  it("popularity tie-breaks by name", () => {
    const tie = [
      font({ name: "Beta", popularityRank: 5 }),
      font({ name: "Alpha", popularityRank: 5 }),
    ];
    expect(sortedNames(tie, "popularity")).toEqual(["Alpha", "Beta"]);
  });
});

describe("sortFonts, glyphs", () => {
  const fonts = [
    font({ name: "Big", glyphCount: 900 }),
    font({ name: "Small", glyphCount: 100 }),
    font({ name: "Mid", glyphCount: 500 }),
    font({ name: "None", glyphCount: null }),
  ];
  it("glyphs-most: descending, null last", () => {
    expect(sortedNames(fonts, "glyphs-most")).toEqual([
      "Big",
      "Mid",
      "Small",
      "None",
    ]);
  });
  it("glyphs-fewest: ascending, null last", () => {
    expect(sortedNames(fonts, "glyphs-fewest")).toEqual([
      "Small",
      "Mid",
      "Big",
      "None",
    ]);
  });
});

describe("sortFonts, axes count", () => {
  const fonts = [
    font({ name: "Three", axes: [axis(), axis(), axis()] }),
    font({ name: "Zero", axes: [] }),
    font({ name: "One", axes: [axis()] }),
  ];
  it("axes-most: descending by axis count", () => {
    expect(sortedNames(fonts, "axes-most")).toEqual(["Three", "One", "Zero"]);
  });
  it("axes-fewest: ascending by axis count", () => {
    expect(sortedNames(fonts, "axes-fewest")).toEqual(["Zero", "One", "Three"]);
  });
});
