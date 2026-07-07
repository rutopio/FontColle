import { ToggleRightIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { featureName } from "@/lib/fonts/features";
import { cn } from "@/lib/utils";
import { FacetPickerDialog } from "./facet-picker";
import { SectionHeader, type SortMode } from "./section-header";

// OpenType features: dozens of four-letter tags. The sidebar shows the top 15
// most common as toggleable pills, plus a Browse all dialog for the full list.
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
  const TOP_N = 15;
  const [sort, setSort] = useState<SortMode>("count");

  const topNSet = useMemo(
    () => new Set(features.slice(0, TOP_N).map(([v]) => v)),
    [features]
  );

  const sorted = useMemo(() => {
    if (sort === "alpha") {
      return [...features].sort((a, b) => a[0].localeCompare(b[0]));
    }
    return features;
  }, [features, sort]);

  // Show top N pills + any selected values outside the top N.
  const visiblePills = sorted.filter(
    ([value]) => topNSet.has(value) || selectedFeatures.includes(value)
  );

  // Dialog items labelled with human names, name-sorted.
  const dialogItems = useMemo(
    () =>
      features
        .map(([tag, count]) => [tag, count, featureName(tag)] as const)
        .sort((a, b) => a[2].localeCompare(b[2])),
    [features]
  );

  const hasSelection = features.some(([v]) => selectedFeatures.includes(v));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="OpenType features"
        icon={ToggleRightIcon}
        hasSelection={hasSelection}
        onReset={onResetFeatures}
        canSort={sorted.length > 1}
        sort={sort}
        onToggleSort={() => setSort((s) => (s === "count" ? "alpha" : "count"))}
      />
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          {visiblePills.map(([value, count]) => {
            const on = selectedFeatures.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => onToggleFeature(value)}
                className={cn(
                  "flex min-w-0 items-center justify-between gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-primary bg-muted text-foreground"
                    : "text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
              >
                <span className="truncate font-mono">{value}</span>
                <span className="font-mono opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <FacetPickerDialog
          items={dialogItems}
          selected={selectedFeatures}
          onToggle={onToggleFeature}
          title="OpenType features"
          description="Filter fonts by the OpenType features they include."
          searchPlaceholder="Search features"
          primary="value"
        />
      </div>
    </div>
  );
}
