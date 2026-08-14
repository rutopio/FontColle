import { describe, expect, it } from "vitest";
import type { FilterSearch } from "./filter";
import {
  applyImport,
  buildPresetsFile,
  type FilterPreset,
  MAX_PRESETS,
  parsePresetsFile,
  sameSearch,
} from "./presets";

describe("sameSearch", () => {
  it("matches identical searches", () => {
    const a: FilterSearch = { category: "Sans", script: "Hant" };
    expect(sameSearch(a, { category: "Sans", script: "Hant" })).toBe(true);
  });

  it("treats an omitted key and an undefined key as the same", () => {
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

const preset = (
  id: string,
  name: string,
  search: FilterSearch
): FilterPreset => ({ id, name, search });

describe("parsePresetsFile", () => {
  it("reads an exported file", () => {
    const saved = [preset("a", "Sans", { category: "Sans" })];
    expect(parsePresetsFile(buildPresetsFile(saved))).toEqual(saved);
  });

  it("rejects a file with the wrong type", () => {
    expect(parsePresetsFile({ type: "other", presets: [] })).toBeNull();
  });

  it("rejects non-objects and a missing list", () => {
    expect(parsePresetsFile(null)).toBeNull();
    expect(parsePresetsFile("preset")).toBeNull();
    expect(parsePresetsFile({ type: "font-fridge.presets" })).toBeNull();
  });

  it("drops malformed entries", () => {
    const raw = {
      type: "font-fridge.presets",
      presets: [
        { id: "a", name: "Sans", search: { category: "Sans" } },
        { id: "b", name: "no search" },
        { name: "no id", search: {} },
        null,
      ],
    };
    expect(parsePresetsFile(raw)).toHaveLength(1);
  });

  it("strips unknown keys out of an imported search", () => {
    const raw = {
      type: "font-fridge.presets",
      presets: [
        { id: "a", name: "Sans", search: { category: "Sans", evil: "x" } },
      ],
    };
    expect(parsePresetsFile(raw)?.[0].search).not.toHaveProperty("evil");
  });
});

describe("applyImport", () => {
  it("merges without dropping existing presets", () => {
    const current = [preset("a", "Sans", { category: "Sans" })];
    const { next, result } = applyImport(
      current,
      [preset("b", "Serif", { category: "Serif" })],
      "merge"
    );
    expect(next.map((p) => p.name)).toEqual(["Sans", "Serif"]);
    expect(result).toMatchObject({ added: 1, removed: 0, total: 2 });
  });

  it("reissues incoming ids so a re-import cannot collide", () => {
    const current = [preset("a", "Sans", { category: "Sans" })];
    const { next } = applyImport(
      current,
      [preset("a", "Serif", { category: "Serif" })],
      "merge"
    );
    expect(next).toHaveLength(2);
    expect(next[1].id).not.toBe("a");
  });

  it("skips a preset whose name and conditions already exist", () => {
    const current = [preset("a", "Sans", { category: "Sans" })];
    const { next, result } = applyImport(
      current,
      [preset("b", "Sans", { category: "Sans" })],
      "merge"
    );
    expect(next).toHaveLength(1);
    expect(result.duplicate).toBe(1);
  });

  it("keeps a same-name preset with different conditions", () => {
    const current = [preset("a", "Sans", { category: "Sans" })];
    const { result } = applyImport(
      current,
      [preset("b", "Sans", { category: "Serif" })],
      "merge"
    );
    expect(result).toMatchObject({ added: 1, duplicate: 0 });
  });

  it("replaces the whole list and counts what was removed", () => {
    const current = [
      preset("a", "Sans", { category: "Sans" }),
      preset("b", "Serif", { category: "Serif" }),
    ];
    const { next, result } = applyImport(
      current,
      [preset("c", "Mono", { spacing: "mono" })],
      "replace"
    );
    expect(next.map((p) => p.name)).toEqual(["Mono"]);
    expect(result).toMatchObject({ added: 1, removed: 2, total: 1 });
  });

  it("counts every current preset as removed on replace, ids being reissued", () => {
    const current = [preset("a", "Sans", { category: "Sans" })];
    const { result } = applyImport(
      current,
      [preset("a", "Sans", { category: "Sans" })],
      "replace"
    );
    expect(result).toMatchObject({ added: 1, removed: 1, total: 1 });
  });

  it("drops what does not fit under the cap", () => {
    const current = Array.from({ length: MAX_PRESETS - 1 }, (_, i) =>
      preset(`c${i}`, `Current ${i}`, { q: `c${i}` })
    );
    const incoming = [
      preset("i0", "In 0", { q: "i0" }),
      preset("i1", "In 1", { q: "i1" }),
    ];
    const { next, result } = applyImport(current, incoming, "merge");
    expect(next).toHaveLength(MAX_PRESETS);
    expect(result).toMatchObject({ added: 1, dropped: 1, total: MAX_PRESETS });
  });

  it("imports nothing into a full list", () => {
    const current = Array.from({ length: MAX_PRESETS }, (_, i) =>
      preset(`c${i}`, `Current ${i}`, { q: `c${i}` })
    );
    const { result } = applyImport(
      current,
      [preset("i0", "In 0", { q: "i0" })],
      "merge"
    );
    expect(result).toMatchObject({ added: 0, dropped: 1 });
  });

  it("a duplicate does not consume a slot under the cap", () => {
    const current = Array.from({ length: MAX_PRESETS }, (_, i) =>
      preset(`c${i}`, `Current ${i}`, { q: `c${i}` })
    );
    const { result } = applyImport(
      current,
      [preset("x", "Current 0", { q: "c0" })],
      "merge"
    );
    expect(result).toMatchObject({ duplicate: 1, dropped: 0 });
  });
});
