// Per-section OR/AND combine mode. Most multi-select sections hard-coded their
// rule in applyFilters (`some` vs `every`); this makes a subset user-switchable.
// A section's mode is "any" (OR, match at least one selected value) or "all"
// (AND, match every selected value).
import type { FilterState } from "./state";

export type MatchMode = "any" | "all";

// The sections that expose the OR/AND toggle: a family can carry several of
// these, and both modes are meaningful. Every other section (radio, single-
// select, per-font single-value, numeric steps) is excluded, a toggle there
// would be a no-op or would always empty the results.
export type ModeKey =
  | "style"
  | "features"
  | "axes"
  | "scripts"
  | "languages"
  | "colorFormats"
  | "weights"
  | "widths"
  | "designers";

export const MODE_KEYS: ModeKey[] = [
  "style",
  "features",
  "axes",
  "scripts",
  "languages",
  "colorFormats",
  "weights",
  "widths",
  "designers",
];

// Each section's default combine mode. Style (mutually exclusive sub-styles, so
// AND would always empty) and Designer default OR-within (match any selected
// value); the rest AND, so multi-selecting narrows. Weight/Width AND by default:
// selecting Light + Bold asks for families shipping both cuts.
export const SECTION_DEFAULT_MODE: Record<ModeKey, MatchMode> = {
  style: "any",
  features: "all",
  axes: "all",
  scripts: "all",
  languages: "all",
  colorFormats: "all",
  weights: "all",
  widths: "all",
  designers: "any",
};

/** The effective mode for a section: the user's override, else the default. */
export function matchMode(f: FilterState, key: ModeKey): MatchMode {
  return f.matchModes[key] ?? SECTION_DEFAULT_MODE[key];
}
