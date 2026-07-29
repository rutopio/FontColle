import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SORT, sortFonts } from "./sort";
import type { FontRecord } from "./types";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const readJson = <T>(rel: string): T | null => {
  const file = path.join(ROOT, rel);
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as T)
    : null;
};

const first = readJson<FontRecord[]>("public/catalog-first.json");
const manifest = readJson<{ path?: string }>("public/catalog-manifest.json");
const full =
  readJson<FontRecord[]>(
    path.join("public", manifest?.path ?? "/catalog.json")
  ) ?? readJson<FontRecord[]>("public/catalog.json");

describe.skipIf(!first || !full)("catalog-first.json ordering", () => {
  it("matches sortFonts(catalog, DEFAULT_SORT) head", () => {
    if (!(first && full)) return;
    const expected = sortFonts(full, DEFAULT_SORT)
      .slice(0, first.length)
      .map((f) => f.id);
    expect(first.map((f) => f.id)).toEqual(expected);
  });

  it("carries the popularityRank the sort depends on", () => {
    if (!first) return;
    expect(first.some((f) => f.popularityRank != null)).toBe(true);
  });
});
