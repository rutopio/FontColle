import { GlobeHemisphereWestIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { scriptLabel, scriptPopulation } from "@/lib/fonts/labels";
import { FacetPickerSection } from "./facet-picker";

// Writing systems (real scripts, Latn/Cyrl/…). Pills show the top 10 by
// real-world speaker population (summed per script from gflanguages), plus a
// Browse all dialog over the full searchable list.
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
    <FacetPickerSection
      title="Writing system"
      icon={GlobeHemisphereWestIcon}
      items={items}
      selected={selectedScripts}
      onToggle={onToggleScript}
      onReset={onResetScripts}
      dialogTitle="Writing systems"
      dialogDescription="Filter fonts by the scripts they support."
      searchPlaceholder="Search writing systems"
      rankBy={scriptPopulation}
      topN={10}
    />
  );
}
