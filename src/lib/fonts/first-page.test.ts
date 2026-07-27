import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SORT, sortFonts } from "./sort";
import type { FontRecord } from "./types";

// scripts/gen-catalog.mjs hand-copies sortFonts(fonts, "popularity") in plain JS
// to cut public/catalog-first.json, the slice the index loader serializes into
// the SSR HTML. If that copy ever drifts from sort.ts, the SSR list and the
// hydrated client list disagree and the first 24 cards visibly reshuffle on
// hydration. Nothing else pins the two together, so pin them here: the built
// artifacts must satisfy `sortFonts(full, DEFAULT_SORT).slice(0, N) === first`.
//
// Both files are build outputs, absent in a fresh clone before `pnpm build`.
// The assertions are skipped (not failed) when they are missing, so `pnpm test`
// still passes without a build; CI builds before testing and gets real coverage.
const ROOT = path.resolve(import.meta.dirname, "../../..");
const readJson = <T>(rel: string): T | null => {
  const file = path.join(ROOT, rel);
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as T)
    : null;
};

const first = readJson<FontRecord[]>("public/catalog-first.json");
// The client resolves the manifest to a content-hashed catalog and falls back
// to the plain one; read the same chain so the test compares against exactly
// the bytes a browser gets.
const manifest = readJson<{ path?: string }>("public/catalog-manifest.json");
const full =
  readJson<FontRecord[]>(
    path.join("public", manifest?.path ?? "/catalog.json")
  ) ?? readJson<FontRecord[]>("public/catalog.json");

describe.skipIf(!first || !full)("catalog-first.json ordering", () => {
  it("matches sortFonts(catalog, DEFAULT_SORT) head", () => {
    const expected = sortFonts(full!, DEFAULT_SORT)
      .slice(0, first!.length)
      .map((f) => f.id);
    expect(first!.map((f) => f.id)).toEqual(expected);
  });

  it("carries the popularityRank the sort depends on", () => {
    // A slice cut from records whose popularityRank was all null would compare
    // equal above by falling back to name order, passing vacuously.
    expect(first!.some((f) => f.popularityRank != null)).toBe(true);
  });
});
