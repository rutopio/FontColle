import { GlobeIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MatchMode } from "@/lib/fonts/filter";
import { scriptLabel, scriptPopulation } from "@/lib/fonts/labels";
import { FacetSearchSection } from "./facet-search-section";

export function WritingSystemSection({
  scripts,
  selectedScripts,
  onToggleScript,
  onResetScripts,
  mode,
  onToggleMode,
}: {
  scripts: [string, number][];
  selectedScripts: string[];
  onToggleScript: (v: string) => void;
  onResetScripts: () => void;
  mode?: MatchMode;
  onToggleMode?: () => void;
}) {
  const items = useMemo(
    () =>
      scripts.map(([code, count]) => [code, count, scriptLabel(code)] as const),
    [scripts]
  );

  return (
    <FacetSearchSection
      title="Writing system"
      icon={GlobeIcon}
      items={items}
      selected={selectedScripts}
      onToggle={onToggleScript}
      onReset={onResetScripts}
      searchPlaceholder="Search writing systems"
      info="The 10 most common writing systems are listed first, ranked by number of speakers, then by how many fonts support each. Speaker figures come from gflanguages, summed across every language written in each system."
      rankBy={scriptPopulation}
      topN={10}
      mode={mode}
      onToggleMode={onToggleMode}
    />
  );
}
