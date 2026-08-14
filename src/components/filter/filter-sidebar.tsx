import {
  ArrowsOutLineHorizontalIcon,
  BracketsSquareIcon,
  DiscoBallIcon,
  SlidersHorizontalIcon,
  SmileyMeltingIcon,
  TextAaIcon,
  TextItalicIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListScrollRestore } from "@/hooks/use-list-scroll-restore";
import { useScrollReset } from "@/hooks/use-scroll-reset";
import { useSectionScrollspy } from "@/hooks/use-section-scrollspy";
import { useFilter } from "@/lib/filter/context";
import {
  type FacetIndex,
  type FilterSearch,
  type FilterState,
  filterToSearch,
  ITALIC_LABELS,
  type MetricKey,
  type MetricRange,
  type ModeKey,
  matchMode,
  SPACING_LABELS,
} from "@/lib/fonts/filter";
import * as actions from "@/lib/fonts/filter-actions";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CardGrid } from "./card-grid";
import { CategoryCards } from "./category-cards";
import { ClassificationSection } from "./classification-section";
import { ColorFormatSection, ColorSection } from "./color-section";
import { weightLabel, widthLabel } from "./constants";
import { DesignerSection } from "./designer-section";
import { FeatureSection } from "./feature-section";
import { FontTypeSection } from "./font-type-section";
import { FILTER_GROUP_IDS, FILTER_GROUPS, type FilterGroupId } from "./groups";
import { InstancesSection } from "./instances-section";
import { LanguageSection } from "./language-section";
import { LicenseSection } from "./license-section";
import { MaintenanceSection } from "./maintenance-section";
import {
  HintSection,
  MetricsSection,
  UnitsPerEmSection,
} from "./metrics-section";
import { NotoSection } from "./noto-section";
import { PresetSection } from "./preset-section";
import { PreviewSizeSection } from "./preview-size-section";
import { RadioPillSection } from "./radio-pill-section";
import { RepositorySection } from "./repository-section";
import { VariableAxesSection } from "./variable-axes-section";
import { WritingSystemSection } from "./writing-system-section";

interface Props {
  index: FacetIndex;
  filter: FilterState;
  onChange: (next: FilterState) => void;
  group: FilterGroupId;
  onActiveGroupChange?: (id: FilterGroupId) => void;
  axisValues: Record<string, number>;
  onAxisValueChange: (tag: string, pct: number) => void;
  onApplyPreset: (search: FilterSearch) => void;
  /** Keep the panel's scroll offset across route changes (desktop sidebar only). */
  restoreScroll?: boolean;
}

export function FilterSidebar({
  index,
  filter,
  onChange,
  group,
  onActiveGroupChange,
  axisValues,
  onAxisValueChange,
  onApplyPreset,
  restoreScroll = false,
}: Props) {
  const [flash, setFlash] = useState<{
    section: "weights" | "widths" | "axes";
    key: number;
  } | null>(null);
  const flashKeyFor = (s: "weights" | "widths" | "axes") =>
    flash?.section === s ? flash.key : undefined;

  const toggle = (key: Parameters<typeof actions.toggle>[1], value: string) =>
    onChange(actions.toggle(filter, key, value));
  const toggleAxis = (tag: string) => {
    const next = actions.toggleAxis(filter, tag);
    const cleared = (["weights", "widths"] as const).find(
      (k) => filter[k].length > 0 && next[k].length === 0
    );
    if (cleared) setFlash({ section: cleared, key: Date.now() });
    onChange(next);
  };
  const select = (key: "weights" | "widths", value: string) => {
    const next = actions.select(filter, key, value);
    if (filter.axes.length > 0 && next.axes.length < filter.axes.length) {
      setFlash({ section: "axes", key: Date.now() });
    }
    onChange(next);
  };
  const selectColor = (value: string) =>
    onChange(actions.selectColor(filter, value));
  const selectFontType = (value: string) =>
    onChange(actions.selectFontType(filter, value));

  const categoryCount = (v: string) =>
    index.categories.find(([c]) => c === v)?.[1] ?? 0;
  const categoryCards = [
    "Sans",
    "Serif",
    "Display",
    "Script",
    "Slab",
    "Graphics",
  ]
    .map((v) => ({
      value: v,
      count: categoryCount(v),
      selected: filter.categories.includes(v),
    }))
    .filter((c) => c.count > 0 || c.selected);
  const toggleCategory = (value: string) => toggle("categories", value);
  const selectItalic = (value: string) =>
    onChange(actions.selectItalic(filter, value));
  const selectSpacing = (value: string) =>
    onChange(actions.selectSpacing(filter, value));
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

  const styleClassifications = useMemo(
    () => index.style.filter((s) => s.group === "style"),
    [index.style]
  );
  const moodClassifications = useMemo(
    () => index.style.filter((s) => s.group === "mood"),
    [index.style]
  );

  const setMetric = (key: MetricKey, next: MetricRange | undefined) => {
    const metrics = { ...filter.metrics };
    if (next) metrics[key] = next;
    else delete metrics[key];
    onChange({ ...filter, metrics });
  };
  const setHinting = (value: boolean) =>
    onChange({
      ...filter,
      hasHinting: filter.hasHinting === value ? undefined : value,
    });

  const currentSearch = useMemo(() => filterToSearch(filter), [filter]);

  const viewportRef = useScrollReset<HTMLDivElement>(!restoreScroll);
  const { panelScrollY } = useFilter();

  const showingPreset = group === "preset";
  const { registerSection } = useSectionScrollspy({
    viewportRef,
    ids: FILTER_GROUP_IDS,
    active: group,
    onActiveChange: useCallback(
      (id: FilterGroupId) => onActiveGroupChange?.(id),
      [onActiveGroupChange]
    ),
    enabled: !showingPreset,
  });

  // Runs after the scrollspy's mount jump so the remembered offset wins.
  useListScrollRestore(viewportRef, panelScrollY, restoreScroll);

  // Nudge scroll so ScrollArea recalculates overflow after panel swap.
  const resetScrollbar = () => {
    let frame = 0;
    const nudge = () => {
      viewportRef.current?.dispatchEvent(
        new Event("scroll", { bubbles: true })
      );
      if (++frame < 10) requestAnimationFrame(nudge);
    };
    requestAnimationFrame(nudge);
  };

  const groupContent = (id: FilterGroupId) => (
    <>
      {id === "style" && (
        <>
          <CategoryCards
            cards={categoryCards}
            onToggle={toggleCategory}
            onReset={() => clearSection("categories", index.categories)}
          />
          <RadioPillSection
            title="Spacing"
            icon={BracketsSquareIcon}
            items={index.spacing}
            labels={SPACING_LABELS}
            selected={filter.spacing}
            onToggle={selectSpacing}
            onReset={() => onChange({ ...filter, spacing: [] })}
          />
          <ClassificationSection
            title="Style"
            icon={DiscoBallIcon}
            groups={styleClassifications}
            selected={filter.style}
            onToggle={(v) => toggle("style", v)}
            onReset={() =>
              clearSection(
                "style",
                styleClassifications.flatMap((s) => s.items)
              )
            }
            info="Letterform classifications published by Google Fonts, from the google/fonts tags data. A family can carry several, so these combine rather than partition — unlike the Category cards above, where each family sits in exactly one."
            mode={modeOf("style")}
            onToggleMode={() => toggleMode("style")}
          />
        </>
      )}
      {id === "mood" && (
        <ClassificationSection
          title="Mood"
          icon={SmileyMeltingIcon}
          info="Subjective trait ratings published by Google Fonts, scored 0–100 per family. A pill lists the families scoring 50 or above, so it reads as “this is a vintage face” rather than “this has a trace of vintage” — Google rates nearly every family on nearly every trait."
          groups={moodClassifications}
          selected={filter.style}
          onToggle={(v) => toggle("style", v)}
          onReset={() =>
            clearSection(
              "style",
              moodClassifications.flatMap((s) => s.items)
            )
          }
          mode={modeOf("style")}
          onToggleMode={() => toggleMode("style")}
        />
      )}
      {id === "color" && (
        <>
          <ColorSection
            items={index.color}
            selected={colorSelected}
            onToggle={selectColor}
            onReset={() => onChange({ ...filter, color: [], colorFormats: [] })}
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
      {id === "language" && (
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
            onResetLanguages={() => onChange({ ...filter, languages: [] })}
            mode={modeOf("languages")}
            onToggleMode={() => toggleMode("languages")}
          />
        </>
      )}
      {id === "axes" && (
        <>
          <FontTypeSection
            items={index.fontTypes}
            selected={fontTypeSelected}
            onToggle={selectFontType}
            onReset={resetFontType}
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
          <InstancesSection
            histogram={index.instances}
            value={filter.instances}
            onChange={(next) => onChange({ ...filter, instances: next })}
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
            info="The nine standard steps a family can reach, not the styles it ships. A variable family matches every step inside its wght axis range, so it can appear here for a weight it has no named instance for — reach that weight by dragging the axis on the detail page. A static family matches the weights of its own files, snapped to the nearest step."
            flashKey={flashKeyFor("weights")}
            mode={modeOf("weights")}
            onToggleMode={() => toggleMode("weights")}
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
            info="The nine standard steps a family can reach, not the styles it ships. A variable family matches every step inside its wdth axis range, so a family whose named instances are all normal width still appears under Ultra Cond. and Ultra Expd. if its axis stretches that far — reach those widths by dragging the axis on the detail page. A static family matches the single width recorded in its OS/2 table."
            mode={modeOf("widths")}
            onToggleMode={() => toggleMode("widths")}
          />
          <VariableAxesSection
            icon={SlidersHorizontalIcon}
            items={index.axes}
            selected={filter.axes}
            onToggle={toggleAxis}
            onReset={() => clearSection("axes", index.axes)}
            sliderValue={axisValues}
            onSliderChange={onAxisValueChange}
            disabled={filter.tags.includes("static")}
            mode={modeOf("axes")}
            onToggleMode={() => toggleMode("axes")}
            flashKey={flashKeyFor("axes")}
          />
        </>
      )}
      {id === "features" && (
        <FeatureSection
          features={index.features}
          selectedFeatures={filter.features}
          onToggleFeature={(v) => toggle("features", v)}
          onResetFeatures={() => onChange({ ...filter, features: [] })}
          mode={modeOf("features")}
          onToggleMode={() => toggleMode("features")}
        />
      )}
      {id === "metrics" && (
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
      {id === "designer" && (
        <>
          <NotoSection
            items={index.flags}
            selected={filter.source}
            onToggle={(v) => onChange(actions.selectFlag(filter, v))}
            onReset={() => onChange({ ...filter, source: [] })}
          />
          <DesignerSection
            designers={index.designers}
            vendors={index.vendors}
            selectedDesigners={filter.designers}
            selectedVendors={filter.vendors}
            onToggleDesigner={(v) => toggle("designers", v)}
            onToggleVendor={(v) => toggle("vendors", v)}
            onResetDesigners={() => onChange({ ...filter, designers: [] })}
            onResetVendors={() => onChange({ ...filter, vendors: [] })}
            designerMode={modeOf("designers")}
            onToggleDesignerMode={() => toggleMode("designers")}
            vendorCasing={index.vendorCasing}
          />
        </>
      )}
      {id === "other" && (
        <>
          <LicenseSection
            items={index.license}
            selected={filter.license}
            onToggle={(v) => toggle("license", v)}
            onReset={() => onChange({ ...filter, license: [] })}
          />
          <RepositorySection
            items={index.repoHosts}
            selected={filter.repoHosts}
            onToggle={(v) => toggle("repoHosts", v)}
            onReset={() => onChange({ ...filter, repoHosts: [] })}
          />
          <MaintenanceSection
            items={index.activity}
            selected={filter.activity}
            onToggle={(v) => toggle("activity", v)}
            onReset={() => onChange({ ...filter, activity: [] })}
          />
        </>
      )}
    </>
  );

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-foreground">
      {/* Display setting, not a filter — pinned so the list scroll never moves it. */}
      {!showingPreset && (
        <div className="shrink-0 border-border border-b p-4">
          <PreviewSizeSection />
        </div>
      )}
      {/* Remount clears Base UI stale overflow when toggling preset/filters. */}
      <ScrollArea
        key={showingPreset ? "preset" : "filters"}
        fade
        viewportRef={viewportRef}
        className="min-h-0 flex-1"
      >
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={resetScrollbar}
        >
          <motion.div
            key={showingPreset ? "preset" : "filters"}
            className={cn(
              "flex flex-col p-4",
              showingPreset
                ? "min-h-full gap-12"
                : "[&>section+section]:mt-7 [&>section+section]:border-border [&>section+section]:border-t [&>section+section]:pt-7"
            )}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: MOTION_S.fast, ease: EASE_OUT }}
          >
            {showingPreset ? (
              <PresetSection
                currentSearch={currentSearch}
                onApply={onApplyPreset}
              />
            ) : (
              FILTER_GROUPS.map((g) => (
                <section
                  key={g.id}
                  ref={(el) => {
                    registerSection(g.id, el);
                  }}
                  aria-labelledby={`filter-group-${g.id}`}
                  className="flex flex-col gap-12"
                >
                  <h2 id={`filter-group-${g.id}`} className="sr-only">
                    {g.label}
                  </h2>
                  {groupContent(g.id)}
                </section>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </aside>
  );
}
