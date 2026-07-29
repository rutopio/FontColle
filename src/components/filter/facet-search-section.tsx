import type { Icon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MatchMode } from "@/lib/fonts/filter";
import { NoMatches, SearchBox } from "./search-box";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";
import { useSearchSort } from "./use-facet-search";

export type FacetItem = readonly [string, number, string];

export function FacetSearchSection({
  title,
  icon,
  items,
  selected,
  onToggle,
  onReset,
  searchPlaceholder,
  rankBy,
  topN,
  pillTitle,
  info,
  mode,
  onToggleMode,
}: {
  title: string;
  icon: Icon;
  items: readonly FacetItem[];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  searchPlaceholder: string;
  mode?: MatchMode;
  onToggleMode?: () => void;
  rankBy?: (value: string) => number;
  topN: number;
  pillTitle?: (value: string) => string;
  info?: React.ReactNode;
}) {
  const { sort, toggleSort, query, setQuery, q } = useSearchSort();

  const labelOf = useMemo(
    () => new Map(items.map(([value, , label]) => [value, label])),
    [items]
  );

  const matches = useMemo(
    () =>
      q
        ? items.filter(
            ([value, , label]) =>
              value.toLowerCase().includes(q) || label.toLowerCase().includes(q)
          )
        : items,
    [items, q]
  );

  const pills = useMemo(
    () =>
      [...matches]
        .sort((a, b) =>
          sort === "alpha" ? a[2].localeCompare(b[2]) : b[1] - a[1]
        )
        .map(([value, count]) => [value, count] as [string, number]),
    [matches, sort]
  );

  const topNSet = useMemo(() => {
    if (q) return new Set(matches.map(([value]) => value));
    const rank = rankBy ?? ((_: string) => 0);
    return new Set(
      [...items]
        .sort((a, b) => (rankBy ? rank(b[0]) - rank(a[0]) : b[1] - a[1]))
        .slice(0, topN)
        .map(([value]) => value)
    );
  }, [items, matches, q, rankBy, topN]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={title}
        icon={icon}
        info={info}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={items.length > 1}
        sort={sort}
        onToggleSort={toggleSort}
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder={searchPlaceholder}
        label={`Search ${title.toLowerCase()}`}
      />
      {pills.length === 0 ? (
        <NoMatches
          title="Nothing found"
          description={`No ${title.toLowerCase()} matches “${query.trim()}”.`}
          onClear={() => setQuery("")}
        />
      ) : (
        <Pills
          items={pills}
          selected={selected}
          onToggle={onToggle}
          topNSet={topNSet}
          label={(value) => labelOf.get(value) ?? value}
          title={pillTitle}
          columns={2}
          grid
          spread
        />
      )}
    </div>
  );
}
