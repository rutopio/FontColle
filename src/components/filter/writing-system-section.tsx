import { GlobeIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MatchMode } from "@/lib/fonts/filter";
import { scriptLabel, scriptPopulation } from "@/lib/fonts/labels";
import { FacetSearchSection } from "./facet-search-section";

// Writing systems (real scripts, Latn/Cyrl/…). Only 45 of them, so the whole
// list lives inline: pills show the top 10 by real-world speaker population
// (summed per script from gflanguages), the rest sit behind a "N more"
// expander, and a search box filters across all of them.
//
// Note the two rankings pull apart: population picks which pills show, but
// FacetSearchSection orders them by font count. So Simplified Han (1.3B
// writers, 10 fonts) earns a pill yet lands last, while Greek (135 fonts) is
// collapsed. That is deliberate, ranking exposure by font count would bury
// every non-Latin system; the info tooltip explains it to the user.
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
  // Label scripts with human names; keep counts. Already count-sorted.
  const items = useMemo(
    () =>
      scripts.map(([code, count]) => [code, count, scriptLabel(code)] as const),
    [scripts]
  );

  return (
    <FacetSearchSection
      // Not "Script": the Category cards already use that word for the Google
      // Fonts /Script/ class (handwriting-style faces), and that string is a
      // stored filter value, not just a label. Two different "Script" filters in
      // one panel would be worse than a longer title, which the header now
      // truncates rather than wrapping.
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
