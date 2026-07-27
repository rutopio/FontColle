import {
  ArrowsOutLineHorizontalIcon,
  DiscoBallIcon,
  SlidersHorizontalIcon,
  SmileyMeltingIcon,
  TextAaIcon,
  TextItalicIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/lib/fonts/filter";
import * as actions from "@/lib/fonts/filter-actions";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { useScrollReset } from "@/lib/use-scroll-reset";
import { useSectionScrollspy } from "@/lib/use-section-scrollspy";
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
import { RadioPillSection } from "./radio-pill-section";
import { RepositorySection } from "./repository-section";
import { VariableAxesSection } from "./variable-axes-section";
import { WritingSystemSection } from "./writing-system-section";

interface Props {
  index: FacetIndex;
  filter: FilterState;
  onChange: (next: FilterState) => void;
  // "preset" swaps the whole panel out; any other id is a section to scroll to.
  group: FilterGroupId;
  // Omitted where no rail is showing.
  onActiveGroupChange?: (id: FilterGroupId) => void;
  // A 0-100 position per axis tag; each font maps it onto its own range.
  axisValues: Record<string, number>;
  onAxisValueChange: (tag: string, pct: number) => void;
  // Replaces the filter half of the URL search wholesale, leaving sort/fav
  // alone. Separate from onChange because a preset is already in search shape.
  onApplyPreset: (search: FilterSearch) => void;
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
}: Props) {
  // A section whose selection was just silently cleared by a mutually-exclusive
  // pick elsewhere. The bumped key drives a one-shot header flash.
  const [flash, setFlash] = useState<{
    section: "weights" | "widths" | "axes";
    key: number;
  } | null>(null);
  const flashKeyFor = (s: "weights" | "widths" | "axes") =>
    flash?.section === s ? flash.key : undefined;

  // Every rule lives in filter-actions.ts, pure and testable.
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

  // Italic is a separate section below, not a Category card.
  const categoryCount = (v: string) =>
    index.categories.find(([c]) => c === v)?.[1] ?? 0;
  const categoryCards = [
    "Sans",
    "Serif",
    "Mono",
    "Display",
    "Script",
    "Slab",
    "Emoji",
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

  // Split by the group they render under. Both feed a single
  // ClassificationSection, so the shared OR/AND mode and reset sit on one
  // header rather than on whichever sub-list came first.
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

  // Always open at the top; don't let router scroll restoration carry the
  // sidebar's position across list <-> detail navigation.
  const viewportRef = useScrollReset<HTMLDivElement>();

  // Preset is the exception: not a facet, so it replaces the panel wholesale
  // rather than being one more section in this scroll.
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

  // Base UI's ScrollArea re-evaluates overflow on scroll, but not when
  // AnimatePresence swaps the panel content, so leaving the tall filter list
  // for the shorter Preset panel strands a scrollbar over content that no
  // longer overflows.
  const resetScrollbar = () => {
    // The incoming panel isn't laid out on the frame the exit completes, so
    // nudge a scroll event across several frames: at least one then lands after
    // the new content is measured and Base UI drops the scrollbar.
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
          {/* Serif/Sans/Slab/Script share the one `style` key,
                    so they render as sub-lists under a single "Style" header
                    that hosts their shared OR/AND toggle and reset. */}
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
      {/* Same shape as Style above, and the same shared OR/AND mode. */}
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
          {/* How many named styles the family ships: a range over the
                    counts the catalog actually has. */}
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
            flashKey={flashKeyFor("widths")}
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
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea viewportRef={viewportRef} className="min-h-0 flex-1">
        {/* Cross-fade + slight rise when Preset swaps in or out. mode="wait" so
            the old panel fully leaves before the new one enters, avoiding
            overlap in the shared scroll viewport. Keyed on which panel is
            showing, not on the group: switching group now scrolls the list
            rather than replacing it, and a remount would kill the scroll. */}
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={resetScrollbar}
        >
          <motion.div
            key={showingPreset ? "preset" : "filters"}
            className={cn(
              "flex flex-col p-4",
              // Preset's empty state centres vertically, so it needs a height
              // to centre in; the tall filter list has no use for one.
              showingPreset
                ? "min-h-full gap-12"
                : // One rule per rail group, not between the sections inside
                  // them, so the line reads as the boundary the rail names.
                  // Equal margin above and padding below centres it in the gap.
                  "[&>section+section]:mt-7 [&>section+section]:border-border [&>section+section]:border-t [&>section+section]:pt-7"
            )}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: MOTION_S.fast, ease: EASE_OUT }}
          >
            {showingPreset ? (
              <PresetSection
                // Encoded here rather than passed down, so the active-preset
                // highlight is computed from the same call that a save writes.
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
                  {/* Not shown: the rail already names the group you are in, and
                      a second running header repeated that. Kept in the tree
                      because it is this section's accessible name — dropping it
                      would leave nine unlabelled regions in the panel. */}
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
