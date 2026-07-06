import {
  ArrowsOutLineHorizontalIcon,
  BookmarkSimpleIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FilterState } from "@/lib/fonts/filter";
import { CardGrid } from "./card-grid";
import { CategoryCards } from "./category-cards";
import { weightLabel, widthLabel } from "./constants";
import { FeatureSection } from "./feature-section";
import { LanguageSection } from "./language-section";
import { Section } from "./section";
import { WritingSystemSection } from "./writing-system-section";

interface FacetIndex {
  classes: [string, number][];
  facets: [string, number][];
  features: [string, number][];
  axes: [string, number][];
  weights: [string, number][];
  widths: [string, number][];
  wsScripts: [string, number][];
  languages: [string, number][];
}

interface Props {
  index: FacetIndex;
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterSidebar({ index, filter, onChange }: Props) {
  const toggle = (key: keyof Omit<FilterState, "query">, value: string) => {
    const cur = filter[key];
    const next = cur.includes(value)
      ? cur.filter((x) => x !== value)
      : [...cur, value];
    onChange({ ...filter, [key]: next });
  };

  // Radio-style: Weight and Width allow at most one value. Clicking the current
  // selection clears it; clicking another replaces it.
  const select = (key: "weights" | "widths", value: string) => {
    const next = filter[key].includes(value) ? [] : [value];
    onChange({ ...filter, [key]: next });
  };

  // Clear only the values a given section shows (Properties/Subsets share the
  // facets key, so scope the reset to that section's own items).
  const clearSection = (
    key: keyof Omit<FilterState, "query">,
    items: [string, number][]
  ) => {
    const own = new Set(items.map(([v]) => v));
    onChange({ ...filter, [key]: filter[key].filter((v) => !own.has(v)) });
  };

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-12 p-4">
          <CategoryCards
            items={index.classes}
            selected={filter.classes}
            onToggle={(v) => toggle("classes", v)}
          />
          <Section
            title="Properties"
            icon={BookmarkSimpleIcon}
            items={index.facets}
            selected={filter.facets}
            onToggle={(v) => toggle("facets", v)}
            onReset={() => clearSection("facets", index.facets)}
          />
          <WritingSystemSection
            scripts={index.wsScripts}
            selectedScripts={filter.scripts}
            onToggleScript={(v) => toggle("scripts", v)}
            onResetScripts={() => onChange({ ...filter, scripts: [] })}
          />
          <LanguageSection
            languages={index.languages}
            selectedLanguages={filter.languages}
            onToggleLanguage={(v) => toggle("languages", v)}
            onResetLanguages={() => onChange({ ...filter, languages: [] })}
          />
          <CardGrid
            title="Weight"
            icon={TextAaIcon}
            items={index.weights}
            selected={filter.weights}
            onToggle={(v) => select("weights", v)}
            onReset={() => onChange({ ...filter, weights: [] })}
            label={weightLabel}
            axis="wght"
          />
          <CardGrid
            title="Width"
            icon={ArrowsOutLineHorizontalIcon}
            items={index.widths}
            selected={filter.widths}
            onToggle={(v) => select("widths", v)}
            onReset={() => onChange({ ...filter, widths: [] })}
            label={widthLabel}
            axis="wdth"
          />
          <Section
            title="Variable axes"
            icon={SlidersHorizontalIcon}
            items={index.axes}
            selected={filter.axes}
            onToggle={(v) => toggle("axes", v)}
            onReset={() => clearSection("axes", index.axes)}
            grid
            spread
            topN={6}
          />
          <FeatureSection
            features={index.features}
            selectedFeatures={filter.features}
            onToggleFeature={(v) => toggle("features", v)}
            onResetFeatures={() => onChange({ ...filter, features: [] })}
          />
        </div>
      </ScrollArea>
    </aside>
  );
}
