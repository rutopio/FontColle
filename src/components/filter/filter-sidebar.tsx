import {
  ArrowsOutLineHorizontalIcon,
  SlidersHorizontalIcon,
  TagIcon,
  TextAaIcon,
  TextItalicIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FACET_LABELS,
  type FacetIndex,
  type FilterState,
  ITALIC_LABELS,
  type MetricKey,
  type MetricRange,
  type ModeKey,
  matchMode,
} from "@/lib/fonts/filter";
import * as actions from "@/lib/fonts/filter-actions";
import { useScrollReset } from "@/lib/use-scroll-reset";
import { CardGrid } from "./card-grid";
import { CategoryCards } from "./category-cards";
import { ClassificationSection } from "./classification-section";
import { ColorFormatSection, ColorSection } from "./color-section";
import { weightLabel, widthLabel } from "./constants";
import { DesignerSection } from "./designer-section";
import { FeatureSection } from "./feature-section";
import { FontTypeSection } from "./font-type-section";
import { GithubSection } from "./github-section";
import type { FilterGroupId } from "./groups";
import { LanguageSection } from "./language-section";
import { LicenseSection } from "./license-section";
import {
  HintSection,
  MetricsSection,
  UnitsPerEmSection,
} from "./metrics-section";
import { RadioPillSection } from "./radio-pill-section";
import { Section } from "./section";
import { SourceSection } from "./source-section";
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

// Human display for a derived facet id; falls back to the raw id.
const facetLabel = (v: string) => FACET_LABELS[v] ?? v;

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
  const toggle = (key: Parameters<typeof actions.toggle>[1], value: string) =>
    onChange(actions.toggle(filter, key, value));
  const toggleAxis = (tag: string) => onChange(actions.toggleAxis(filter, tag));
  const select = (key: "weights" | "widths", value: string) =>
    onChange(actions.select(filter, key, value));
  const selectColor = (value: string) =>
    onChange(actions.selectColor(filter, value));
  const selectFontType = (value: string) =>
    onChange(actions.selectFontType(filter, value));
  const selectItalic = (value: string) =>
    onChange(actions.selectItalic(filter, value));
  // OR/AND toggle for a multi-select section, plus the current mode to show.
  const toggleMode = (key: ModeKey) =>
    onChange(actions.toggleMatchMode(filter, key));
  const modeOf = (key: ModeKey) => matchMode(filter, key);
  const resetFontType = () => onChange(actions.resetFontType(filter));
  const clearSection = (
    key: Parameters<typeof actions.clearSection>[1],
    items: [string, number][]
  ) => onChange(actions.clearSection(filter, key, items));

  const colorSelected = actions.colorSelection(filter);
  const fontTypeSelected = actions.fontTypeSelection(filter);

  // Metrics: set or clear one range key; toggle a boolean facet (off = absent).
  const setMetric = (key: MetricKey, next: MetricRange | undefined) => {
    const metrics = { ...filter.metrics };
    if (next) metrics[key] = next;
    else delete metrics[key];
    onChange({ ...filter, metrics });
  };
  // Hint: radio-style toggle. Re-selecting the active value clears it.
  const setHinting = (value: boolean) =>
    onChange({
      ...filter,
      hasHinting: filter.hasHinting === value ? undefined : value,
    });

  // Always open at the top; don't let router scroll restoration carry the
  // sidebar's position across list <-> detail navigation.
  const viewportRef = useScrollReset<HTMLDivElement>();

  // Each group opens scrolled to its top. This used to come free from
  // remounting the ScrollArea per group, but that remount blocked the exit
  // animation, so reset the viewport explicitly on group change instead.
  // biome-ignore lint/correctness/useExhaustiveDependencies: group is the trigger; viewportRef is stable.
  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [group]);

  // Base UI's ScrollArea re-evaluates overflow on scroll, but not when the
  // panel content is swapped by AnimatePresence. Switching away from a group
  // that was scrolled (its scrollbar showing) into a shorter group leaves the
  // scrollbar stuck visible even though nothing overflows. Once the outgoing
  // panel has left and the new one is measured, nudge a scroll event so the
  // primitive recomputes and hides the now-unneeded scrollbar.
  const resetScrollbar = () => {
    // The incoming panel isn't laid out on the same frame the exit completes;
    // it swaps in a few frames later. Nudge a scroll event across a short run
    // of frames so at least one lands after the new (non-overflowing) content
    // is measured, letting Base UI drop the now-unneeded scrollbar.
    let frame = 0;
    const nudge = () => {
      viewportRef.current?.dispatchEvent(
        new Event("scroll", { bubbles: true })
      );
      if (++frame < 10) requestAnimationFrame(nudge);
    };
    requestAnimationFrame(nudge);
  };

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea viewportRef={viewportRef} className="min-h-0 flex-1">
        {/* Cross-fade + slight rise on group switch. mode="wait" so the old
            panel fully leaves before the new one enters, avoiding overlap in
            the shared scroll viewport. The scroll reset (each group opens at
            the top) is handled by the group-change effect above, not a remount,
            so AnimatePresence can play the exit. */}
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={resetScrollbar}
        >
          <motion.div
            key={group}
            className="flex flex-col gap-12 p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {group === "style" && (
              <>
                <CategoryCards
                  items={index.classes}
                  selected={filter.classes}
                  onToggle={(v) => toggle("classes", v)}
                />
                <RadioPillSection
                  title="Italic"
                  icon={TextItalicIcon}
                  items={index.italic}
                  labels={ITALIC_LABELS}
                  selected={filter.italic}
                  onToggle={selectItalic}
                  onReset={() => onChange({ ...filter, italic: [] })}
                />
                {index.classifications.map((section, i) => (
                  <ClassificationSection
                    key={section.title}
                    title={section.title}
                    items={section.items}
                    selected={filter.classifications}
                    onToggle={(v) => toggle("classifications", v)}
                    onReset={() =>
                      clearSection("classifications", section.items)
                    }
                    // Serif/Sans/Expressive/… are separate visual sections but
                    // share one `classifications` state key, so they share one
                    // OR/AND mode. Host that single toggle on the first section's
                    // header (the group has no header of its own to carry it).
                    mode={i === 0 ? modeOf("classifications") : undefined}
                    onToggleMode={
                      i === 0 ? () => toggleMode("classifications") : undefined
                    }
                  />
                ))}
              </>
            )}
            {group === "tag" && (
              // One flat list of natural-language trait pills, static/variable
              // included. Font type also lives in Axes as a radio (same state).
              <Section
                title="Tag"
                icon={TagIcon}
                items={index.facets}
                selected={filter.facets}
                onToggle={(v) => toggle("facets", v)}
                onReset={() => clearSection("facets", index.facets)}
                label={facetLabel}
                expandAll
                mode={modeOf("facets")}
                onToggleMode={() => toggleMode("facets")}
              />
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
                  mode={modeOf("colorFormats")}
                  onToggleMode={() => toggleMode("colorFormats")}
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
                  mode={modeOf("scripts")}
                  onToggleMode={() => toggleMode("scripts")}
                />
                <LanguageSection
                  languages={index.languages}
                  selectedLanguages={filter.languages}
                  onToggleLanguage={(v) => toggle("languages", v)}
                  onResetLanguages={() =>
                    onChange({ ...filter, languages: [] })
                  }
                  mode={modeOf("languages")}
                  onToggleMode={() => toggleMode("languages")}
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
                  mode={modeOf("axes")}
                  onToggleMode={() => toggleMode("axes")}
                />
              </>
            )}
            {group === "features" && (
              <FeatureSection
                features={index.features}
                selectedFeatures={filter.features}
                onToggleFeature={(v) => toggle("features", v)}
                onResetFeatures={() => onChange({ ...filter, features: [] })}
                mode={modeOf("features")}
                onToggleMode={() => toggleMode("features")}
              />
            )}
            {group === "metrics" && (
              <>
                <MetricsSection
                  metrics={filter.metrics}
                  onMetricChange={setMetric}
                  onReset={() => onChange({ ...filter, metrics: {} })}
                />
                <UnitsPerEmSection
                  upmCounts={index.upmCounts}
                  selectedUpm={filter.upm}
                  onToggleUpm={(v) => toggle("upm", v)}
                  onResetUpm={() => clearSection("upm", index.upmCounts)}
                />
                <HintSection
                  hasHinting={filter.hasHinting}
                  hintedCount={index.hintedCount}
                  unhintedCount={index.unhintedCount}
                  onSetHinting={setHinting}
                />
              </>
            )}
            {group === "designer" && (
              <>
                <SourceSection
                  items={index.flags}
                  selected={filter.flags}
                  onToggle={(v) => onChange(actions.selectFlag(filter, v))}
                  onReset={() => onChange({ ...filter, flags: [] })}
                />
                <DesignerSection
                  designers={index.designers}
                  vendors={index.vendors}
                  selectedDesigners={filter.designers}
                  selectedVendors={filter.vendors}
                  onToggleDesigner={(v) => toggle("designers", v)}
                  onToggleVendor={(v) => toggle("vendors", v)}
                  onResetDesigners={() =>
                    onChange({ ...filter, designers: [] })
                  }
                  onResetVendors={() => onChange({ ...filter, vendors: [] })}
                  vendorCasing={index.vendorCasing}
                />
              </>
            )}
            {group === "other" && (
              <>
                <LicenseSection
                  items={index.license}
                  selected={filter.license}
                  onToggle={(v) => toggle("license", v)}
                  onReset={() => onChange({ ...filter, license: [] })}
                />
                <GithubSection
                  items={index.repoHosts}
                  selected={filter.repoHosts}
                  onToggle={(v) => toggle("repoHosts", v)}
                  onReset={() => onChange({ ...filter, repoHosts: [] })}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </aside>
  );
}
