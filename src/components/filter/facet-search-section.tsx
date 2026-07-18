import type { Icon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MatchMode } from "@/lib/fonts/filter";
import { NoMatches, SearchBox } from "./search-box";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";
import { useSearchSort } from "./use-facet-search";

/** A labelled facet value: [value, family count, human label]. */
export type FacetItem = readonly [string, number, string];

// A facet section small enough to render every value inline: a live search box
// over the whole list, then pills with the rare ones behind a "N more"
// expander. No Browse all dialog, that's for the facets with hundreds of
// values (Language), where an inline list would be unusable.
//
// The search matches both the raw value ("Latn") and its label ("Latin"), and
// hands Pills a topNSet of every survivor so a match can never stay collapsed.
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
  // OR/AND toggle, forwarded to the header. Pass both to show it.
  mode?: MatchMode;
  onToggleMode?: () => void;
  // How to pick which values show up front. Defaults to font count; pass a
  // lookup like speaker population to rank by that instead.
  rankBy?: (value: string) => number;
  topN: number;
  // Optional hover/focus tooltip per value (e.g. the raw vendor code behind a
  // foundry-name label). Omitted for facets whose label already says it all.
  pillTitle?: (value: string) => string;
  // Optional note shown in an info-icon tooltip beside the title (e.g. the data
  // source). Forwarded to SectionHeader.
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

  // Which values render up front. Always ranked by count/population, never by
  // the active sort, flipping to A–Z reorders pills, it doesn't change which
  // ones hide. While searching, every match shows.
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
