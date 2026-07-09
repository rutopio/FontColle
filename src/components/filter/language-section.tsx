import { TranslateIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { groupLanguageCountsByRegion, languageLabel } from "@/lib/fonts/labels";
import { NoMatches, SearchBox } from "./search-box";
import { Pills } from "./section";
import { SectionHeader, type SortMode } from "./section-header";

// How many languages each continent shows before the "N more" expander.
const TOP_N_PER_REGION = 10;

// Languages: 980 of them, so they're grouped by continent (the same buckets the
// detail page's language accordion uses) rather than listed as one wall. Each
// region shows its 10 most-spoken languages up front; the rest — 438 of them in
// Africa alone — collapse behind that region's own expander, and the search box
// reaches every one.
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
  const [sort, setSort] = useState<SortMode>("count");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // Search matches the human name ("English") and the raw id ("en_Latn").
  // Matching groups hand Pills a topNSet of every survivor, so a hit is never
  // left collapsed behind an expander.
  const groups = useMemo(() => {
    const ordered =
      sort === "alpha"
        ? [...languages].sort((a, b) =>
            languageLabel(a[0]).localeCompare(languageLabel(b[0]))
          )
        : languages;
    const grouped = groupLanguageCountsByRegion(ordered, TOP_N_PER_REGION);
    if (!q) return grouped;
    return grouped.flatMap((g) => {
      const items = g.items.filter(
        ([id]) =>
          id.toLowerCase().includes(q) ||
          languageLabel(id).toLowerCase().includes(q)
      );
      if (items.length === 0) return [];
      return [{ ...g, items, topNSet: new Set(items.map(([id]) => id)) }];
    });
  }, [languages, sort, q]);

  const hasSelection = languages.some(([id]) => selectedLanguages.includes(id));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Language"
        icon={TranslateIcon}
        hasSelection={hasSelection}
        onReset={onResetLanguages}
        canSort={languages.length > 1}
        sort={sort}
        onToggleSort={() => setSort((s) => (s === "count" ? "alpha" : "count"))}
        info="Grouped by continent using each language's primary region in CLDR, matching Google Fonts. A language appears under one continent only, so widely spoken ones can land somewhere unexpected — English sits under Americas because its main territory is the US. Use search to find any language directly."
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
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
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
