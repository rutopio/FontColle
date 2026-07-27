import { CodeIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { featureName, groupFeatures } from "@/lib/fonts/features";
import type { MatchMode } from "@/lib/fonts/filter";
import { NoMatches, SearchBox } from "./search-box";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";
import { filterGroupsByQuery, useSearchSort } from "./use-facet-search";

// 272 distinct tags, grouped by what they do rather than left as one
// count-sorted wall. Per-sub-list expanders keep the 81 character variants and
// 64 unregistered tags from swamping the panel while leaving them reachable.
// The search matches both the raw tag and its name, so "ligature" finds dlig.
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

  // filterGroupsByQuery rebuilds each group's topNSet, so a match never stays
  // hidden behind a "N more" expander.
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
                // An unknown tag maps to itself, so its tooltip would just
                // repeat the label.
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
