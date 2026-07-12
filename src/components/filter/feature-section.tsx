import { CodeIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { featureName, groupFeatures } from "@/lib/fonts/features";
import type { MatchMode } from "@/lib/fonts/filter";
import { NoMatches, SearchBox } from "./search-box";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";
import { filterGroupsByQuery, useSearchSort } from "./use-facet-search";

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
  mode,
  onToggleMode,
}: {
  features: [string, number][];
  selectedFeatures: string[];
  onToggleFeature: (v: string) => void;
  onResetFeatures: () => void;
  mode?: MatchMode;
  onToggleMode?: () => void;
}) {
  const { sort, toggleSort, query, setQuery, q } = useSearchSort();

  // `features` arrives count-sorted; groupFeatures preserves that order within
  // each group. Alpha sort re-orders before grouping so each sub-list follows.
  // filterGroupsByQuery then drops non-matching tags and rebuilds each group's
  // topNSet so a match never stays hidden behind a "N more" expander.
  const groups = useMemo(() => {
    const ordered =
      sort === "alpha"
        ? [...features].sort((a, b) => a[0].localeCompare(b[0]))
        : features;
    return filterGroupsByQuery(groupFeatures(ordered), q, featureName);
  }, [features, sort, q]);

  const hasSelection = features.some(([v]) => selectedFeatures.includes(v));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Features"
        icon={CodeIcon}
        hasSelection={hasSelection}
        onReset={onResetFeatures}
        canSort={features.length > 1}
        sort={sort}
        onToggleSort={toggleSort}
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Search features"
        label="Search OpenType features"
      />
      {groups.length === 0 ? (
        <NoMatches
          title="No features found"
          description={`No features match “${query.trim()}”. Try a tag or a feature name.`}
          onClear={() => setQuery("")}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ id, title, items, topNSet }) => (
            <div key={id} className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase">
                {title}
              </h3>
              <Pills
                items={items}
                selected={selectedFeatures}
                onToggle={onToggleFeature}
                topNSet={topNSet}
                grid
                spread
                mono
                // The pill shows the 4-letter tag; the tooltip its full name.
                // Unknown tags map to themselves, so skip the tooltip there
                // (it would just repeat the label).
                title={(tag) => {
                  const name = featureName(tag);
                  return name === tag ? "" : name;
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
