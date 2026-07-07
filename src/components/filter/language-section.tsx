import { TranslateIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { languageLabel, languagePopulation } from "@/lib/fonts/labels";
import { FacetPickerSection } from "./facet-picker";

// Languages: a searchable list of hundreds of language ids. The sidebar shows
// the top 20 by real-world speaker population (gflanguages) as pills; the
// Browse all dialog searches every one.
export function LanguageSection({
  languages,
  selectedLanguages,
  onToggleLanguage,
  onResetLanguages,
}: {
  languages: [string, number][];
  selectedLanguages: string[];
  onToggleLanguage: (v: string) => void;
  onResetLanguages: () => void;
}) {
  // Full labelled list for the dialog (name-sorted).
  const allItems = useMemo(
    () =>
      languages
        .map(([id, count]) => [id, count, languageLabel(id)] as const)
        .sort((a, b) => a[2].localeCompare(b[2])),
    [languages]
  );

  return (
    <FacetPickerSection
      title="Language"
      icon={TranslateIcon}
      items={allItems}
      selected={selectedLanguages}
      onToggle={onToggleLanguage}
      onReset={onResetLanguages}
      dialogTitle="Languages"
      dialogDescription="Filter fonts by the languages they support."
      searchPlaceholder="Search languages"
      rankBy={languagePopulation}
      topN={20}
    />
  );
}
