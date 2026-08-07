import { describe, expect, it } from "vitest";
import {
  canRenderWithCoverage,
  decodeGlyphIndex,
  renderableFontIds,
} from "./glyph-index";

/** Build a coverage class the way scripts/gen-glyph-index.mjs encodes one. */
function encode(ranges: [number, number][]): string {
  let prev = 0;
  return ranges
    .map(([start, end]) => {
      const gap = (start - prev).toString(36);
      const len = end - start;
      prev = end;
      return len === 0 ? gap : `${gap}.${len.toString(36)}`;
    })
    .join(",");
}

const coverage = (ranges: [number, number][]) =>
  decodeGlyphIndex({ classes: [encode(ranges)], fonts: {} }).classes[0];

const cps = (s: string): [number, number][] =>
  [...new Set([...s].map((c) => c.codePointAt(0) as number))]
    .sort((a, b) => a - b)
    .map((cp) => [cp, cp]);

describe("decodeGlyphIndex", () => {
  it("round-trips ranges through the compact encoding", () => {
    const ranges: [number, number][] = [
      [32, 126],
      [160, 160],
      [0x4e00, 0x9fff],
    ];
    expect([...coverage(ranges)]).toEqual([32, 126, 160, 160, 0x4e00, 0x9fff]);
  });

  it("decodes an empty class", () => {
    expect(coverage([]).length).toBe(0);
  });
});

describe("canRenderWithCoverage", () => {
  it("matches plain codepoints", () => {
    const cov = coverage(cps("一二三"));
    expect(canRenderWithCoverage(cov, "一二三")).toBe(true);
    expect(canRenderWithCoverage(cov, "一二四")).toBe(false);
  });

  it("ignores whitespace and default-ignorable characters", () => {
    const cov = coverage(cps("ab"));
    expect(canRenderWithCoverage(cov, " a\tb\n")).toBe(true);
    expect(canRenderWithCoverage(cov, "a‍b")).toBe(true);
  });

  it("treats empty text as renderable by anything", () => {
    expect(canRenderWithCoverage(coverage([]), "   ")).toBe(true);
  });

  // The two shaper-normalization cases measured against real families:
  // adlamdisplay lacks U+1EC7 but shapes it from base + marks; abel lacks
  // U+0301 but composes "e" + U+0301 into its precomposed U+00E9.
  it("accepts a precomposed character the font builds from base + marks", () => {
    const cov = coverage(cps("ệ"));
    expect(canRenderWithCoverage(cov, "ệ")).toBe(true);
  });

  it("accepts base + mark when the font only has the precomposed form", () => {
    const cov = coverage(cps("eé"));
    expect(canRenderWithCoverage(cov, "é")).toBe(true);
    // The mark alone still has nothing to compose with.
    expect(canRenderWithCoverage(cov, "ó")).toBe(false);
  });

  it("requires marks that cannot compose to exist on their own", () => {
    // U+0301 composes onto "e" (U+00E9 present) but not onto "s".
    const cov = coverage(cps("esé"));
    expect(canRenderWithCoverage(cov, "ś")).toBe(false);
  });

  it("rejects text whose base character is missing entirely", () => {
    const cov = coverage(cps("eé"));
    expect(canRenderWithCoverage(cov, "ü")).toBe(false);
  });
});

describe("renderableFontIds", () => {
  const index = decodeGlyphIndex({
    classes: [encode(cps("abc")), encode(cps("一二三"))],
    fonts: { latin: 0, cjk: 1 },
  });

  it("selects only the fonts whose class covers the text", () => {
    expect([...renderableFontIds(index, "一二")]).toEqual(["cjk"]);
    expect([...renderableFontIds(index, "ab")]).toEqual(["latin"]);
  });

  it("omits fonts that are absent from the index", () => {
    // An unindexed font cannot be vouched for, so it is not in the set and the
    // caller filters it out.
    expect(renderableFontIds(index, "ab").has("unknown")).toBe(false);
  });
});
