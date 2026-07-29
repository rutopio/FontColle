import { FACET_LABELS, WEIGHT_LABELS, WIDTH_LABELS } from "@/lib/fonts/filter";

export const RARE_THRESHOLD = 20;

export const weightLabel = (v: string) => WEIGHT_LABELS[Number(v)] ?? v;
export const widthLabel = (v: string) => WIDTH_LABELS[Number(v)] ?? v;

export const facetLabel = (v: string) => FACET_LABELS[v] ?? v;

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
