import { WEIGHT_LABELS, WIDTH_LABELS } from "@/lib/fonts/filter";

// Pills for facets with fewer than this many fonts stay hidden behind a
// collapsible until the user opens it, unless they're already selected.
export const RARE_THRESHOLD = 20;

// Render a weight/width pill by its human label ("Bold") instead of the raw
// numeric step, while the toggle value stays numeric.
export const weightLabel = (v: string) => WEIGHT_LABELS[Number(v)] ?? v;
export const widthLabel = (v: string) => WIDTH_LABELS[Number(v)] ?? v;

// A few classification sub-tags carry a longer internal name than Google Fonts
// shows on its own UI. The tag path stays the harvest key; only the pill label
// is aligned to Google Fonts' shorter wording.
const GF_LABEL: Record<string, string> = {
  "Old Style Garalde": "Old Style",
  "Humanist Venetian": "Humanist",
  "Fat Face": "Fatface",
  "Upright Script": "Upright",
};

// The sub-tag name shown for a classification tag: the last path segment of the
// full tag path ("/Serif/Didone" -> "Didone"), overridden by GF_LABEL where it
// differs from Google Fonts' own label.
export const subTagLabel = (path: string) => {
  const seg = path.slice(path.lastIndexOf("/") + 1);
  return GF_LABEL[seg] ?? seg;
};
