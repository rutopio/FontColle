import { describe, expect, it } from "vitest";
import {
  applyImport,
  buildFavoritesFile,
  parseFavoritesFile,
} from "./favorites";

const known = new Set(["inter", "lora", "mono"]);

describe("parseFavoritesFile", () => {
  it("reads an exported file", () => {
    const file = buildFavoritesFile(["inter", "lora"]);
    expect(parseFavoritesFile(file)).toEqual(["inter", "lora"]);
  });

  it("rejects a file with the wrong type", () => {
    expect(parseFavoritesFile({ type: "other", favorites: [] })).toBeNull();
  });

  it("rejects non-objects and a missing list", () => {
    expect(parseFavoritesFile(null)).toBeNull();
    expect(parseFavoritesFile("inter")).toBeNull();
    expect(parseFavoritesFile({ type: "font-fridge.favorites" })).toBeNull();
  });

  it("drops non-string entries and duplicates", () => {
    const raw = {
      type: "font-fridge.favorites",
      favorites: ["inter", 7, "inter", null, "lora"],
    };
    expect(parseFavoritesFile(raw)).toEqual(["inter", "lora"]);
  });
});

describe("applyImport", () => {
  it("merges without dropping existing favorites", () => {
    const { next, result } = applyImport(["inter"], ["lora"], "merge", known);
    expect(next).toEqual(["inter", "lora"]);
    expect(result).toEqual({ added: 1, removed: 0, skipped: 0, total: 2 });
  });

  it("does not re-add an id already favorited", () => {
    const { next, result } = applyImport(
      ["inter", "lora"],
      ["inter"],
      "merge",
      known
    );
    expect(next).toEqual(["inter", "lora"]);
    expect(result.added).toBe(0);
  });

  it("replaces the whole list and counts what was removed", () => {
    const { next, result } = applyImport(
      ["inter", "lora"],
      ["mono"],
      "replace",
      known
    );
    expect(next).toEqual(["mono"]);
    expect(result).toEqual({ added: 1, removed: 2, skipped: 0, total: 1 });
  });

  it("keeps an id that survives a replace out of the removed count", () => {
    const { result } = applyImport(
      ["inter", "lora"],
      ["inter"],
      "replace",
      known
    );
    expect(result).toEqual({ added: 1, removed: 1, skipped: 0, total: 1 });
  });

  it("skips ids missing from the catalog", () => {
    const { next, result } = applyImport(
      [],
      ["inter", "retired-font"],
      "merge",
      known
    );
    expect(next).toEqual(["inter"]);
    expect(result.skipped).toBe(1);
  });

  it("replacing with an all-unknown file clears the list", () => {
    const { next, result } = applyImport(
      ["inter"],
      ["retired-font"],
      "replace",
      known
    );
    expect(next).toEqual([]);
    expect(result).toEqual({ added: 0, removed: 1, skipped: 1, total: 0 });
  });
});
