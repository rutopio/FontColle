import { WEIGHT_LABELS, WIDTH_LABELS } from "@/lib/fonts/filter";

// Pills for facets with fewer than this many fonts stay hidden behind a
// collapsible until the user opens it, unless they're already selected.
export const RARE_THRESHOLD = 20;

// A representative Google Font per category, used to render "Aa" on each
// Category card in a typeface typical of that class.
export const CATEGORY_SPECIMEN: Record<string, string> = {
  Sans: "Inter",
  Serif: "Playfair Display",
  Display: "Bebas Neue",
  Script: "Dancing Script",
  Mono: "JetBrains Mono",
};

// Render a weight/width pill by its human label ("Bold") instead of the raw
// numeric step, while the toggle value stays numeric.
export const weightLabel = (v: string) => WEIGHT_LABELS[Number(v)] ?? v;
export const widthLabel = (v: string) => WIDTH_LABELS[Number(v)] ?? v;

// Inconsolata is a variable face with weight (200–900) and width (50–200) axes,
// so its "Aa" specimen can render each Weight/Width card at the value it stands
// for. We load its full range once and clamp per-card coords to these bounds.
export const SPECIMEN_FAMILY = "Inconsolata";
export const SPECIMEN_AXES = [
  { tag: "wght", min: 200, max: 900 },
  { tag: "wdth", min: 50, max: 200 },
];
export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
