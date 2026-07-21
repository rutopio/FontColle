import { describe, expect, it } from "vitest";
import { emptyFilter } from "./filter";
import {
  clearSection,
  resetFontType,
  select,
  selectFontType,
  toggle,
  toggleAxis,
  toggleMatchMode,
} from "./filter-actions";

describe("weight/width multi-select (last pick at the tail)", () => {
  it("appends new weight picks in click order", () => {
    let f = emptyFilter;
    f = select(f, "weights", "300"); // Light
    f = select(f, "weights", "700"); // Bold
    f = select(f, "weights", "400"); // Regular
    // OR filter keeps all three; the tail is the last one clicked, which the
    // preview renders (Light -> Bold -> Regular).
    expect(f.weights).toEqual(["300", "700", "400"]);
    expect(f.weights.at(-1)).toBe("400");
  });

  it("re-clicking a selected weight removes just that one", () => {
    let f = select(emptyFilter, "weights", "300");
    f = select(f, "weights", "700");
    f = select(f, "weights", "300"); // toggle Light off
    expect(f.weights).toEqual(["700"]);
  });

  it("widths behave the same", () => {
    let f = select(emptyFilter, "widths", "3");
    f = select(f, "widths", "7");
    expect(f.widths).toEqual(["3", "7"]);
  });
});

describe("weight/width <-> variable-axis mutual exclusion still holds", () => {
  it("selecting a weight step clears the wght axis", () => {
    const f = select(
      { ...emptyFilter, axes: ["wght", "opsz"] },
      "weights",
      "700"
    );
    expect(f.weights).toEqual(["700"]);
    expect(f.axes).toEqual(["opsz"]); // wght gone, opsz kept
  });

  it("turning the wght axis on clears the Weight steps", () => {
    const f = toggleAxis({ ...emptyFilter, weights: ["400", "700"] }, "wght");
    expect(f.axes).toEqual(["wght"]);
    expect(f.weights).toEqual([]);
  });
});

describe("mode override is dropped once its section empties", () => {
  it("clearSection drops a non-default facets mode", () => {
    let f = { ...emptyFilter, facets: ["ligatures", "fractions"] };
    f = toggleMatchMode(f, "facets"); // facets -> "any" (non-default)
    expect(f.matchModes.facets).toBe("any");
    f = clearSection(f, "facets", [
      ["ligatures", 1],
      ["fractions", 1],
    ]);
    expect(f.facets).toEqual([]);
    expect(f.matchModes.facets).toBeUndefined(); // no stale ?mode=facets:any
  });

  it("toggling the last facet off drops the mode too", () => {
    let f = toggle(emptyFilter, "facets", "ligatures");
    f = toggleMatchMode(f, "facets");
    f = toggle(f, "facets", "ligatures"); // remove the only value
    expect(f.facets).toEqual([]);
    expect(f.matchModes.facets).toBeUndefined();
  });

  it("clearing the axes section (via Static) drops a non-default axes mode", () => {
    let f = { ...emptyFilter, axes: ["wght", "opsz"] };
    f = toggleMatchMode(f, "axes"); // axes -> "any"
    expect(f.matchModes.axes).toBe("any");
    f = selectFontType(f, "static"); // clears axes
    expect(f.axes).toEqual([]);
    expect(f.matchModes.axes).toBeUndefined();
  });

  it("resetFontType drops a non-default axes mode", () => {
    let f = { ...emptyFilter, axes: ["wght"] };
    f = toggleMatchMode(f, "axes");
    f = resetFontType(f);
    expect(f.axes).toEqual([]);
    expect(f.matchModes.axes).toBeUndefined();
  });

  it("keeps the mode while the section still holds a value", () => {
    let f = { ...emptyFilter, facets: ["ligatures", "fractions"] };
    f = toggleMatchMode(f, "facets");
    f = clearSection(f, "facets", [["ligatures", 1]]); // one value remains
    expect(f.facets).toEqual(["fractions"]);
    expect(f.matchModes.facets).toBe("any"); // still meaningful, kept
  });
});
