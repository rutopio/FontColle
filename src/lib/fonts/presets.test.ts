import { describe, expect, it } from "vitest";
import type { FilterSearch } from "./filter";
import { sameSearch } from "./presets";

// sameSearch backs the "this preset is the one currently applied" highlight. It
// compares two FilterSearch objects that both came from filterToSearch (which
// omits empty keys) or parseFilterSearch (which writes undefined for absent
// ones), so the two spellings of "not set" have to compare equal.
describe("sameSearch", () => {
  it("matches identical searches", () => {
    const a: FilterSearch = { category: "Sans", script: "Hant" };
    expect(sameSearch(a, { category: "Sans", script: "Hant" })).toBe(true);
  });

  it("treats an omitted key and an undefined key as the same", () => {
    // filterToSearch omits; parseFilterSearch sets undefined. A preset saved
    // from one and compared against the other must still match, or the active
    // highlight would never light up.
    const omitted: FilterSearch = { category: "Sans" };
    const explicit: FilterSearch = { category: "Sans", script: undefined };
    expect(sameSearch(omitted, explicit)).toBe(true);
    expect(sameSearch(explicit, omitted)).toBe(true);
  });

  it("rejects a differing value", () => {
    expect(sameSearch({ category: "Sans" }, { category: "Serif" })).toBe(false);
  });

  it("rejects an extra condition on either side", () => {
    const base: FilterSearch = { category: "Sans" };
    const narrower: FilterSearch = { category: "Sans", weight: "700" };
    expect(sameSearch(base, narrower)).toBe(false);
    expect(sameSearch(narrower, base)).toBe(false);
  });

  it("matches two empty searches", () => {
    expect(sameSearch({}, {})).toBe(true);
  });

  it("ignores key order", () => {
    expect(
      sameSearch(
        { category: "Sans", weight: "700" },
        { weight: "700", category: "Sans" }
      )
    ).toBe(true);
  });
});
