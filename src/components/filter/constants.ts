import { FACET_LABELS, WEIGHT_LABELS, WIDTH_LABELS } from "@/lib/fonts/filter";

// Below this count a pill stays collapsed, unless it is already selected.
export const RARE_THRESHOLD = 20;

// The toggle value stays numeric.
export const weightLabel = (v: string) => WEIGHT_LABELS[Number(v)] ?? v;
export const widthLabel = (v: string) => WIDTH_LABELS[Number(v)] ?? v;

// Human display for a derived facet id ("has-italic" -> "Italic"); falls back
// to the raw id. Shared by the Font type pills and their active-filter chips,
// so the two can never drift apart.
export const facetLabel = (v: string) => FACET_LABELS[v] ?? v;

// The tag path stays the harvest key; only the pill label follows Google
// Fonts' shorter wording.
const GF_LABEL: Record<string, string> = {
  "Old Style Garalde": "Old Style",
  "Humanist Venetian": "Humanist",
  "Fat Face": "Fatface",
  "Upright Script": "Upright",
};

export const subTagLabel = (path: string) => {
  const seg = path.slice(path.lastIndexOf("/") + 1);
  return GF_LABEL[seg] ?? seg;
};
