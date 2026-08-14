import { SITE_URL } from "@/lib/site";
import type { FontRecord } from "./types";

export const MCP_CATEGORIES = [
  "Sans",
  "Serif",
  "Slab",
  "Display",
  "Script",
  "Graphics",
] as const;

export const MCP_MAX_RESULTS = 50;

export function mcpStrings(value: unknown): string[] {
  if (typeof value === "string") return value ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v !== "");
}

export function mcpNumbers(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
}

export function mcpSummarise(
  font: Pick<
    FontRecord,
    "id" | "name" | "category" | "isVariable" | "isMonospace" | "designer"
  >
) {
  return {
    id: font.id,
    name: font.name,
    category: font.category,
    isVariable: font.isVariable,
    isMonospace: font.isMonospace,
    designer: font.designer,
    url: `${SITE_URL}/instances/${font.id}`,
  };
}
