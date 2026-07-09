import { useState } from "react";
import type { SortMode } from "./section-header";

// The search + sort state shared by every searchable filter section (facet,
// feature, language). Each section still owns its grouping/ranking; this only
// holds the state and the lowercased query they all derive.
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

// Narrow already-grouped pills to a query, matching each value against both its
// raw form and its label. Empty groups drop out, and every surviving group's
// topNSet is rebuilt to hold ALL its matches — the invariant that a search hit
// is never left hidden behind a "N more" expander. Shared by the feature and
// language panels, which differ only in how they group and label.
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
