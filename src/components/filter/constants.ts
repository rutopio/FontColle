import { WEIGHT_LABELS, WIDTH_LABELS } from "@/lib/fonts/filter";

// Pills for facets with fewer than this many fonts stay hidden behind a
// collapsible until the user opens it, unless they're already selected.
export const RARE_THRESHOLD = 20;

// Render a weight/width pill by its human label ("Bold") instead of the raw
// numeric step, while the toggle value stays numeric.
export const weightLabel = (v: string) => WEIGHT_LABELS[Number(v)] ?? v;
export const widthLabel = (v: string) => WIDTH_LABELS[Number(v)] ?? v;
