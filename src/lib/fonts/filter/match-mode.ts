// Per-section OR/AND combine mode. Most multi-select sections hard-coded their
// rule in applyFilters (`some` vs `every`); this makes a subset user-switchable.
// A section's mode is "any" (OR — match at least one selected value) or "all"
// (AND — match every selected value).
import type { FilterState } from "./state";

export type MatchMode = "any" | "all";

// The sections that expose the OR/AND toggle: a family can carry several of
// these, and both modes are meaningful. Every other section (radio, single-
// select, per-font single-value, numeric steps) is excluded — a toggle there
// would be a no-op or would always empty the results.
export type ModeKey =
  | "classifications"
  | "facets"
  | "features"
  | "axes"
  | "scripts"
  | "languages"
  | "colorFormats";

export const MODE_KEYS: ModeKey[] = [
  "classifications",
  "facets",
  "features",
  "axes",
  "scripts",
  "languages",
  "colorFormats",
];

// Each section's mode when the user hasn't touched the toggle — chosen so an
// empty `matchModes` reproduces the pre-toggle behaviour exactly. Classification
// was OR; the rest were AND.
export const SECTION_DEFAULT_MODE: Record<ModeKey, MatchMode> = {
  classifications: "any",
  facets: "all",
  features: "all",
  axes: "all",
  scripts: "all",
  languages: "all",
  colorFormats: "all",
};

/** The effective mode for a section: the user's override, else the default. */
export function matchMode(f: FilterState, key: ModeKey): MatchMode {
  return f.matchModes[key] ?? SECTION_DEFAULT_MODE[key];
}
