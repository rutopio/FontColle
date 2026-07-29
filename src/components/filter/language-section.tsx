import { ChatTextIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MatchMode } from "@/lib/fonts/filter";
import { groupLanguageCountsByRegion, languageLabel } from "@/lib/fonts/labels";
import { NoMatches, SearchBox } from "./search-box";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";
import { filterGroupsByQuery, useSearchSort } from "./use-facet-search";

const TOP_N_PER_REGION = 10;

export function LanguageSection({
  languages,
  selectedLanguages,
  onToggleLanguage,
  onResetLanguages,
  mode,
  onToggleMode,
}: {
  languages: [string, number][];
  selectedLanguages: string[];
  onToggleLanguage: (v: string) => void;
  onResetLanguages: () => void;
  mode?: MatchMode;
  onToggleMode?: () => void;
}) {
  const { sort, toggleSort, query, setQuery, q } = useSearchSort();

  const groups = useMemo(() => {
    const ordered =
      sort === "alpha"
        ? [...languages].sort((a, b) =>
            languageLabel(a[0]).localeCompare(languageLabel(b[0]))
          )
        : languages;
    return filterGroupsByQuery(
      groupLanguageCountsByRegion(ordered, TOP_N_PER_REGION),
      q,
      languageLabel
    );
  }, [languages, sort, q]);

  const hasSelection = languages.some(([id]) => selectedLanguages.includes(id));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Language"
        icon={ChatTextIcon}
        hasSelection={hasSelection}
        onReset={onResetLanguages}
        canSort={languages.length > 1}
        sort={sort}
        onToggleSort={toggleSort}
        info="Grouped by continent, from the countries each language is spoken in. Widely spoken languages appear under every continent that applies, so English shows up under all five and the region counts add up to more than the total. Use search to find any language directly."
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Search languages"
        label="Search languages"
      />
      {groups.length === 0 ? (
        <NoMatches
          title="No languages found"
          description={`No language matches “${query.trim()}”.`}
          onClear={() => setQuery("")}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ region, items, topNSet }) => (
            <div key={region} className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase">
                {region}
              </h3>
              <Pills
                items={items}
                selected={selectedLanguages}
                onToggle={onToggleLanguage}
                topNSet={topNSet}
                label={languageLabel}
                columns={2}
                grid
                spread
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
