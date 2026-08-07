import type { FilterState } from "./state";

export type MatchMode = "any" | "all";

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
