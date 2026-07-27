// "any" is OR (match at least one selected value), "all" is AND (match every
// one). Only a subset of sections expose the choice; see MODE_KEYS.
import type { FilterState } from "./state";

export type MatchMode = "any" | "all";

// Only where a family can carry several values, so both modes mean something.
// A toggle on a radio or single-value section would be a no-op, or would always
// empty the results.
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

// Style defaults to OR because its sub-styles are near-exclusive and AND would
// always empty; Designer likewise. The rest AND, so multi-selecting narrows:
// Light + Bold asks for families shipping both cuts.
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

export function matchMode(f: FilterState, key: ModeKey): MatchMode {
  return f.matchModes[key] ?? SECTION_DEFAULT_MODE[key];
}
