import { GlobeIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MatchMode } from "@/lib/fonts/filter";
import { scriptLabel, scriptPopulation } from "@/lib/fonts/labels";
import { FacetSearchSection } from "./facet-search-section";

// Two rankings pull apart here, deliberately: speaker population picks which
// pills show, but FacetSearchSection orders them by font count. So Simplified
// Han (1.3B writers, 10 fonts) earns a pill yet lands last. Ranking exposure by
// font count instead would bury every non-Latin system.
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
      // NOT "Script": the Category cards already use that word for the Google
      // Fonts /Script/ class, and that string is a stored filter value.
      title="Writing system"
      icon={GlobeIcon}
      items={items}
      selected={selectedScripts}
      onToggle={onToggleScript}
      onReset={onResetScripts}
      searchPlaceholder="Search writing systems"
      info="The 10 most spoken writing systems show up front, ranked by how many people write in them, then sorted by how many fonts support each. Speaker figures come from gflanguages, summed across every language written in each system."
      rankBy={scriptPopulation}
      topN={10}
      mode={mode}
      onToggleMode={onToggleMode}
    />
  );
}
