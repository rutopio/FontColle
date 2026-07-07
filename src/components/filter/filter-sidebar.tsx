import {
  ArrowsOutLineHorizontalIcon,
  BookmarkSimpleIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FilterState } from "@/lib/fonts/filter";
import { useScrollReset } from "@/lib/use-scroll-reset";
import { CardGrid } from "./card-grid";
import { CategoryCards } from "./category-cards";
import { weightLabel, widthLabel } from "./constants";
import { FeatureSection } from "./feature-section";
import { LanguageSection } from "./language-section";
import { Section } from "./section";
import { VariableAxesSection } from "./variable-axes-section";
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
  // Relative position (0-100, default 50) per selected variable-axis tag,
  // forwarded to the preview grid to drive each font's own axis range live.
  axisValues: Record<string, number>;
  onAxisValueChange: (tag: string, pct: number) => void;
}

export function FilterSidebar({
  index,
  filter,
  onChange,
  axisValues,
  onAxisValueChange,
}: Props) {
  const toggle = (key: keyof Omit<FilterState, "query">, value: string) => {
    const cur = filter[key];
    const next = cur.includes(value)
      ? cur.filter((x) => x !== value)
      : [...cur, value];
    onChange({ ...filter, [key]: next });
  };

  // A variable axis and its equivalent value section drive the same thing, so
  // they're mutually exclusive: the wght axis vs the Weight steps, wdth vs
  // Width. Selecting one clears the other.
  const AXIS_EXCLUSIVE: Record<string, "weights" | "widths"> = {
    wght: "weights",
    wdth: "widths",
  };
  const EXCLUSIVE_AXIS: Record<"weights" | "widths", string> = {
    weights: "wght",
    widths: "wdth",
  };

  // Variable-axis toggle: selecting wght/wdth clears the matching Weight/Width
  // selection (they're mutually exclusive); other axes toggle normally.
  const toggleAxis = (tag: string) => {
    const turningOn = !filter.axes.includes(tag);
    const nextAxes = turningOn
      ? [...filter.axes, tag]
      : filter.axes.filter((x) => x !== tag);
    const cleared = turningOn ? AXIS_EXCLUSIVE[tag] : undefined;
    onChange({
      ...filter,
      axes: nextAxes,
      ...(cleared ? { [cleared]: [] } : {}),
    });
  };

  // Radio-style: Weight and Width allow at most one value. Clicking the current
  // selection clears it; clicking another replaces it. Selecting one also
  // clears the mutually exclusive variable axis (wght/wdth).
  const select = (key: "weights" | "widths", value: string) => {
    const turningOn = !filter[key].includes(value);
    const next = turningOn ? [value] : [];
    const axisTag = EXCLUSIVE_AXIS[key];
    onChange({
      ...filter,
      [key]: next,
      axes: turningOn ? filter.axes.filter((x) => x !== axisTag) : filter.axes,
    });
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

  // Always open at the top; don't let router scroll restoration carry the
  // sidebar's position across list <-> detail navigation.
  const viewportRef = useScrollReset<HTMLDivElement>();

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea viewportRef={viewportRef} className="min-h-0 flex-1">
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
          <VariableAxesSection
            icon={SlidersHorizontalIcon}
            items={index.axes}
            selected={filter.axes}
            onToggle={toggleAxis}
            onReset={() => clearSection("axes", index.axes)}
            sliderValue={axisValues}
            onSliderChange={onAxisValueChange}
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
