import {
  ArrowsOutLineHorizontalIcon,
  BookmarkSimpleIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FacetIndex, FilterState } from "@/lib/fonts/filter";
import * as actions from "@/lib/fonts/filter-actions";
import { useScrollReset } from "@/lib/use-scroll-reset";
import { CardGrid } from "./card-grid";
import { CategoryCards } from "./category-cards";
import { ClassificationSection } from "./classification-section";
import { ColorFormatSection, ColorSection } from "./color-section";
import { weightLabel, widthLabel } from "./constants";
import { FeatureSection } from "./feature-section";
import { FontTypeSection } from "./font-type-section";
import type { FilterGroupId } from "./groups";
import { LanguageSection } from "./language-section";
import { LicenseSection } from "./license-section";
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
  // Thin wrappers: every rule lives in filter-actions.ts (pure, testable); the
  // component only feeds the current filter in and pushes the result back out.
  const toggle = (key: keyof Omit<FilterState, "query">, value: string) =>
    onChange(actions.toggle(filter, key, value));
  const toggleAxis = (tag: string) => onChange(actions.toggleAxis(filter, tag));
  const select = (key: "weights" | "widths", value: string) =>
    onChange(actions.select(filter, key, value));
  const selectColor = (value: string) =>
    onChange(actions.selectColor(filter, value));
  const selectFontType = (value: string) =>
    onChange(actions.selectFontType(filter, value));
  const resetFontType = () => onChange(actions.resetFontType(filter));
  const clearSection = (
    key: keyof Omit<FilterState, "query">,
    items: [string, number][]
  ) => onChange(actions.clearSection(filter, key, items));

  const colorSelected = actions.colorSelection(filter);
  const fontTypeSelected = actions.fontTypeSelection(filter);

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
              {index.classifications.map((section) => (
                <ClassificationSection
                  key={section.title}
                  title={section.title}
                  items={section.items}
                  selected={filter.classifications}
                  onToggle={(v) => toggle("classifications", v)}
                  onReset={() => clearSection("classifications", section.items)}
                />
              ))}
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
          {group === "other" && (
            <LicenseSection
              items={index.license}
              selected={filter.license}
              onToggle={(v) => toggle("license", v)}
              onReset={() => onChange({ ...filter, license: [] })}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
