import { GlobeHemisphereWestIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { scriptLabel, scriptPopulation } from "@/lib/fonts/labels";
import { FacetSearchSection } from "./facet-search-section";

// Writing systems (real scripts, Latn/Cyrl/…). Only 45 of them, so the whole
// list lives inline: pills show the top 10 by real-world speaker population
// (summed per script from gflanguages), the rest sit behind a "N more"
// expander, and a search box filters across all of them.
export function WritingSystemSection({
  scripts,
  selectedScripts,
  onToggleScript,
  onResetScripts,
}: {
  scripts: [string, number][];
  selectedScripts: string[];
  onToggleScript: (v: string) => void;
  onResetScripts: () => void;
}) {
  // Label scripts with human names; keep counts. Already count-sorted.
  const items = useMemo(
    () =>
      scripts.map(([code, count]) => [code, count, scriptLabel(code)] as const),
    [scripts]
  );

  return (
    <FacetSearchSection
      title="Writing system"
      icon={GlobeHemisphereWestIcon}
      items={items}
      selected={selectedScripts}
      onToggle={onToggleScript}
      onReset={onResetScripts}
      searchPlaceholder="Search writing systems"
      rankBy={scriptPopulation}
      topN={10}
    />
  );
}
