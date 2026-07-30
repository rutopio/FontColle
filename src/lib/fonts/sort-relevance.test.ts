import { describe, expect, it } from "vitest";
import { searchByQuery } from "./filter/apply";
import { sortFonts } from "./sort";
import type { FontRecord } from "./types";

const font = (name: string, popularityRank: number): FontRecord =>
  ({
    id: name.replace(/ /g, "_"),
    name,
    popularityRank,
    axes: [],
    features: [],
  }) as unknown as FontRecord;

// "Sans Beta" wins on relevance (same prefix tier, shorter name) but is the
// least popular, so the two orders are guaranteed to disagree.
const fonts = [
  font("Sans Alpha", 1),
  font("Sans Beta", 9),
  font("Gamma Sans", 5),
];

// Mirrors the results useMemo in routes/index/-components/catalog.tsx.
const order = (query: string, sort: string | undefined) => {
  if (!query.trim()) return sortFonts(fonts, "popularity").map((f) => f.name);
  const matches = searchByQuery(fonts, query);
  return (sort ? sortFonts(matches, "popularity") : matches).map((f) => f.name);
};

describe("sort over search results", () => {
  it("keeps relevance order while no explicit sort is set", () => {
    expect(order("sans", undefined)).toEqual([
      "Sans Beta",
      "Sans Alpha",
      "Gamma Sans",
    ]);
  });

  it("lets an explicit sort override relevance", () => {
    expect(order("sans", "popularity")).toEqual([
      "Sans Alpha",
      "Gamma Sans",
      "Sans Beta",
    ]);
  });

  it("still restricts an explicit sort to the query's matches", () => {
    expect(order("beta", "popularity")).toEqual(["Sans Beta"]);
  });
});
