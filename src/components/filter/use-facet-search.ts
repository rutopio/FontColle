import { useState } from "react";
import type { SortMode } from "./section-header";

export function useSearchSort() {
  const [sort, setSort] = useState<SortMode>("count");
  const [query, setQuery] = useState("");
  return {
    sort,
    setSort,
    toggleSort: () => setSort((s) => (s === "count" ? "alpha" : "count")),
    query,
    setQuery,
    q: query.trim().toLowerCase(),
  };
}

export function filterGroupsByQuery<G extends { items: [string, number][] }>(
  groups: G[],
  q: string,
  labelOf: (value: string) => string
): G[] {
  if (!q) return groups;
  return groups.flatMap((g) => {
    const items = g.items.filter(
      ([value]) =>
        value.toLowerCase().includes(q) ||
        labelOf(value).toLowerCase().includes(q)
    );
    if (items.length === 0) return [];
    return [{ ...g, items, topNSet: new Set(items.map(([value]) => value)) }];
  });
}
