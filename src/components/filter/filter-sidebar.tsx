import {
  ArrowsOutLineHorizontalIcon,
  BookmarkSimpleIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type FacetIndex,
  type FilterState,
  FONT_TYPE_FACETS,
} from "@/lib/fonts/filter";
import { useScrollReset } from "@/lib/use-scroll-reset";
import { CardGrid } from "./card-grid";
import { CategoryCards } from "./category-cards";
import { ColorFormatSection, ColorSection } from "./color-section";
import { weightLabel, widthLabel } from "./constants";
import { FeatureSection } from "./feature-section";
import { FontTypeSection } from "./font-type-section";
import type { FilterGroupId } from "./groups";
import { LanguageSection } from "./language-section";
import { Section } from "./section";
import { VariableAxesSection } from "./variable-axes-section";
import { WritingSystemSection } from "./writing-system-section";

interface Props {
  index: FacetIndex;
  filter: FilterState;
  onChange: (next: FilterState) => void;
  // Which rail group's sections to show. The panel renders one group at a time.
  group: FilterGroupId;
  // Relative position (0-100, default 50) per selected variable-axis tag,
  // forwarded to the preview grid to drive each font's own axis range live.
  axisValues: Record<string, number>;
  onAxisValueChange: (tag: string, pct: number) => void;
}

export function FilterSidebar({
  index,
  filter,
  onChange,
  group,
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

  // Picking a color format already implies Colorful (only a font with a color
  // table can carry one), so Colorful shows as selected without duplicating it
  // into filter.color — applyFilters would just apply the same narrowing twice.
  const colorImpliedByFormat = filter.colorFormats.length > 0;
  const colorSelected = colorImpliedByFormat ? ["color"] : filter.color;

  // Color is radio-style: clicking the current value clears it, clicking the
  // other replaces it. Two couplings with the format pills:
  //  - Monochrome clears them (a monochrome font has no color table, so leaving
  //    them set would filter everything out from a now-disabled control).
  //  - Clicking the format-implied Colorful clears them too, since that implied
  //    selection is the only thing making it look selected.
  const selectColor = (value: string) => {
    if (value === "color" && colorImpliedByFormat) {
      onChange({ ...filter, color: [], colorFormats: [] });
      return;
    }
    const next = filter.color.includes(value) ? [] : [value];
    onChange({
      ...filter,
      color: next,
      colorFormats: next.includes("monochrome") ? [] : filter.colorFormats,
    });
  };

  // Static/Variable live in `facets`, which is AND-ed — selecting both would
  // always return nothing. Enforce radio behavior: clicking the selected value
  // clears it, clicking the other replaces it, leaving the rest of the facets
  // (ligatures, fractions, …) untouched.
  const withoutFontType = filter.facets.filter(
    (f) => !FONT_TYPE_FACETS.includes(f)
  );

  // Picking a variable axis already implies Variable (only a variable font has
  // axes), so Variable shows as selected without duplicating it into `facets` —
  // applyFilters would just apply the same narrowing twice. Mirrors how a color
  // format implies Colorful.
  const variableImpliedByAxes = filter.axes.length > 0;
  const fontTypeSelected = variableImpliedByAxes
    ? ["variable"]
    : filter.facets.filter((f) => FONT_TYPE_FACETS.includes(f));

  // Two couplings with the variable axes below:
  //  - Static clears them (a static font has no axes, so leaving them set would
  //    filter everything out from a now-disabled control).
  //  - Clicking the axis-implied Variable clears them too, since that implied
  //    selection is the only thing making it look selected.
  const selectFontType = (value: string) => {
    if (value === "variable" && variableImpliedByAxes) {
      onChange({ ...filter, facets: withoutFontType, axes: [] });
      return;
    }
    const turningOff = filter.facets.includes(value);
    const facets = turningOff ? withoutFontType : [...withoutFontType, value];
    onChange({
      ...filter,
      facets,
      axes: facets.includes("static") ? [] : filter.axes,
    });
  };
  const resetFontType = () =>
    onChange({ ...filter, facets: withoutFontType, axes: [] });

  // Clear only the values a given section shows. Several sections share one
  // FilterState key (Properties and Font type both live in `facets`), so scope
  // the reset to the items that section actually renders.
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
      {/* Remount per group so each one opens scrolled to its top. */}
      <ScrollArea
        key={group}
        viewportRef={viewportRef}
        className="min-h-0 flex-1"
      >
        <div className="flex flex-col gap-12 p-4">
          {group === "style" && (
            <>
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
            </>
          )}
          {group === "color" && (
            <>
              <ColorSection
                items={index.color}
                selected={colorSelected}
                onToggle={selectColor}
                onReset={() =>
                  onChange({ ...filter, color: [], colorFormats: [] })
                }
              />
              <ColorFormatSection
                items={index.colorFormats}
                selected={filter.colorFormats}
                onToggle={(v) => toggle("colorFormats", v)}
                onReset={() => onChange({ ...filter, colorFormats: [] })}
                disabled={filter.color.includes("monochrome")}
              />
            </>
          )}
          {group === "language" && (
            <>
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
            </>
          )}
          {group === "axes" && (
            <>
              <FontTypeSection
                items={index.fontTypes}
                selected={fontTypeSelected}
                onToggle={selectFontType}
                onReset={resetFontType}
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
                disabled={filter.facets.includes("static")}
              />
            </>
          )}
          {group === "features" && (
            <FeatureSection
              features={index.features}
              selectedFeatures={filter.features}
              onToggleFeature={(v) => toggle("features", v)}
              onResetFeatures={() => onChange({ ...filter, features: [] })}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
