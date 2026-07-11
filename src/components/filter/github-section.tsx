import { DresserIcon } from "@phosphor-icons/react";
import { REPO_HOST_LABELS } from "@/lib/fonts/filter";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

// Repository-host filter: GitHub / GitLab / SourceHut / None, two per row.
// Multi-select with OR semantics — a family matches when its repository_url's
// host is one of the selected buckets. Every family maps to exactly one bucket
// (no repo -> None), so the four pills partition the catalog. Order is fixed
// (None trails), from the facet index.
export function GithubSection({
  items,
  selected,
  onToggle,
  onReset,
}: {
  // [hostId, count], e.g. ["github", 1993]. Fixed order.
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Source Repo"
        icon={DresserIcon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([value, count]) => (
          <PillButton
            key={value}
            value={value}
            count={count}
            label={REPO_HOST_LABELS[value] ?? value}
            selected={selected.includes(value)}
            onToggle={onToggle}
            className="min-w-0"
          />
        ))}
      </div>
    </div>
  );
}
