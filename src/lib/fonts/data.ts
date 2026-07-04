import fontsData from "@/data/fonts.json";
import { buildFacetIndex } from "./filter";
import type { FontRecord } from "./types";

export const fonts = fontsData as FontRecord[];
export const facetIndex = buildFacetIndex(fonts);

const byId = new Map(fonts.map((f) => [f.id, f]));

export function getFont(id: string): FontRecord | undefined {
  return byId.get(id);
}
