import { MagnifyingGlassIcon, ToggleRightIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { featureName, groupFeatures } from "@/lib/fonts/features";
import { Pills } from "./section";
import { SectionHeader, type SortMode } from "./section-header";

// OpenType features: 272 distinct tags across the catalog. Rather than one
// count-sorted wall of pills, group them by what they do (ligatures, numerals,
// script shaping, …) under a single header. Every tag is rendered — rare ones
// collapse behind each sub-list's own "N more" expander, which is what keeps
// the 81 character variants and the 64 unregistered tags from swamping the
// panel while still leaving them reachable. The search box matches both the raw
// tag and its human name, so "ligature" finds liga/dlig/hlig.
export function FeatureSection({
  features,
  selectedFeatures,
  onToggleFeature,
  onResetFeatures,
}: {
  features: [string, number][];
  selectedFeatures: string[];
  onToggleFeature: (v: string) => void;
  onResetFeatures: () => void;
}) {
  const [sort, setSort] = useState<SortMode>("count");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // `features` arrives count-sorted; groupFeatures preserves that order within
  // each group. Alpha sort re-orders before grouping so each sub-list follows.
  // While searching, drop non-matching tags and hand Pills a topNSet holding
  // every survivor: a match must never stay hidden behind a "N more" expander.
  const groups = useMemo(() => {
    const ordered =
      sort === "alpha"
        ? [...features].sort((a, b) => a[0].localeCompare(b[0]))
        : features;
    const grouped = groupFeatures(ordered);
    if (!q) return grouped;
    return grouped.flatMap((g) => {
      const items = g.items.filter(
        ([tag]) =>
          tag.toLowerCase().includes(q) ||
          featureName(tag).toLowerCase().includes(q)
      );
      if (items.length === 0) return [];
      return [{ ...g, items, topNSet: new Set(items.map(([tag]) => tag)) }];
    });
  }, [features, sort, q]);

  const hasSelection = features.some(([v]) => selectedFeatures.includes(v));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="OpenType features"
        icon={ToggleRightIcon}
        hasSelection={hasSelection}
        onReset={onResetFeatures}
        canSort={features.length > 1}
        sort={sort}
        onToggleSort={() => setSort((s) => (s === "count" ? "alpha" : "count"))}
      />
      <div className="relative">
        <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search features"
          aria-label="Search OpenType features"
          className="w-full rounded-md border bg-transparent py-1.5 pr-2 pl-8 text-sm outline-none focus:border-foreground"
        />
      </div>
      {groups.length === 0 ? (
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MagnifyingGlassIcon />
            </EmptyMedia>
            <EmptyTitle>No features found</EmptyTitle>
            <EmptyDescription>
              No features match “{query.trim()}”. Try a tag or a feature name.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ id, title, items, topNSet }) => (
            <div key={id} className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {title}
              </h3>
              <Pills
                items={items}
                selected={selectedFeatures}
                onToggle={onToggleFeature}
                topNSet={topNSet}
                grid
                spread
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
