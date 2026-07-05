import {
  ArrowsDownUpIcon,
  ArrowsOutLineHorizontalIcon,
  BookmarkSimpleIcon,
  CaretDownIcon,
  GlobeHemisphereWestIcon,
  type Icon,
  MagnifyingGlassIcon,
  ShapesIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
  ToggleRightIcon,
  TranslateIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type FilterState,
  WEIGHT_LABELS,
  WIDTH_LABELS,
  WIDTH_STEP_PCT,
} from "@/lib/fonts/filter";
import {
  languageLabel,
  languagePopulation,
  MAJOR_LANG_POPULATION,
  scriptLabel,
} from "@/lib/fonts/labels";
import {
  ensureFontLoaded,
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { cn } from "@/lib/utils";

// Pills for facets with fewer than this many fonts stay hidden behind a
// collapsible until the user opens it, unless they're already selected.
const RARE_THRESHOLD = 20;

// A representative Google Font per category, used to render "Aa" on each
// Category card in a typeface typical of that class.
const CATEGORY_SPECIMEN: Record<string, string> = {
  Sans: "Inter",
  Serif: "Playfair Display",
  Display: "Bebas Neue",
  Script: "Dancing Script",
  Mono: "JetBrains Mono",
};

// Per-section pill ordering: by font count (default) or alphabetically.
type SortMode = "count" | "alpha";

interface FacetIndex {
  classes: [string, number][];
  facets: [string, number][];
  subsetScripts: [string, number][];
  features: [string, number][];
  axes: [string, number][];
  weights: [string, number][];
  widths: [string, number][];
  wsScripts: [string, number][];
  languages: [string, number][];
}

// Render a weight/width pill by its human label ("Bold") instead of the raw
// numeric step, while the toggle value stays numeric.
const weightLabel = (v: string) => WEIGHT_LABELS[Number(v)] ?? v;
const widthLabel = (v: string) => WIDTH_LABELS[Number(v)] ?? v;

// Inconsolata is a variable face with weight (200–900) and width (50–200) axes,
// so its "Aa" specimen can render each Weight/Width card at the value it stands
// for. We load its full range once and clamp per-card coords to these bounds.
const SPECIMEN_FAMILY = "Inconsolata";
const SPECIMEN_AXES = [
  { tag: "wght", min: 200, max: 900 },
  { tag: "wdth", min: 50, max: 200 },
];
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

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
          <Section
            title="Subsets"
            icon={TranslateIcon}
            items={index.subsetScripts}
            selected={filter.facets}
            onToggle={(v) => toggle("facets", v)}
            sortable={false}
            grid
          />
          <WritingSystemSection
            scripts={index.wsScripts}
            languages={index.languages}
            selectedScripts={filter.scripts}
            selectedLanguages={filter.languages}
            onToggleScript={(v) => toggle("scripts", v)}
            onToggleLanguage={(v) => toggle("languages", v)}
            onResetScripts={() => onChange({ ...filter, scripts: [] })}
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
          />
          <Section
            title="OpenType features"
            icon={ToggleRightIcon}
            items={index.features}
            selected={filter.features}
            onToggle={(v) => toggle("features", v)}
            onReset={() => clearSection("features", index.features)}
            grid
            spread
          />
        </div>
      </ScrollArea>
    </aside>
  );
}

// Category filter as large square, tappable cards. Each card writes "Aa" in a
// typeface representative of that category. Multi-select is preserved: a card is
// a toggle, not a radio.
function CategoryCards({
  items,
  selected,
  onToggle,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
        <ShapesIcon className="size-4" />
        Category
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map(([value, count]) => (
          <CategoryCard
            key={value}
            value={value}
            count={count}
            on={selected.includes(value)}
            onToggle={() => onToggle(value)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  value,
  count,
  on,
  onToggle,
}: {
  value: string;
  count: number;
  on: boolean;
  onToggle: () => void;
}) {
  const specimen = CATEGORY_SPECIMEN[value];
  const loaded = useFontLoaded(specimen ?? "");

  useEffect(() => {
    if (specimen) ensureFontLoaded(specimen, [400]);
  }, [specimen]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        "relative flex cursor-pointer flex-col items-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow,border-color]",
        on ? "border-primary" : "border-input hover:border-foreground/40"
      )}
    >
      <span
        className="text-2xl leading-none"
        style={
          specimen
            ? { fontFamily: previewFontFamily(specimen, loaded) }
            : undefined
        }
      >
        Aa
      </span>
      <span className="font-medium text-muted-foreground text-xs leading-none">
        {value}
      </span>
      <span className="font-mono text-muted-foreground text-xs leading-none">
        {count}
      </span>
    </button>
  );
}

// Big-button grid (same shape as CategoryCards) for value dimensions like Weight
// and Width. Each card renders an Inconsolata "Aa" at the weight/width it stands
// for, above its label + family count. All cards render at once (no rare
// collapse): the value sets are small and fixed.
function CardGrid({
  title,
  icon: Icon,
  items,
  selected,
  onToggle,
  onReset,
  label,
  axis,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  // Clear this section's selection (single-select, so this section only).
  onReset: () => void;
  // Map a raw value to a display label (e.g. "700" -> "Bold").
  label: (value: string) => string;
  // Which axis the card value drives on the "Aa" specimen.
  axis: "wght" | "wdth";
}) {
  const specimenLoaded = useFontLoaded(SPECIMEN_FAMILY);
  useEffect(() => {
    ensureFontRangeLoaded(SPECIMEN_FAMILY, SPECIMEN_AXES);
  }, []);

  // Style the "Aa" for a card: Weight cards vary font-weight; Width cards vary
  // the wdth axis (value 1..9 -> percentage), clamped to Inconsolata's range.
  const specimenStyle = (value: string): React.CSSProperties => {
    const fontFamily = previewFontFamily(SPECIMEN_FAMILY, specimenLoaded);
    if (axis === "wght") {
      return { fontFamily, fontWeight: clamp(Number(value), 200, 900) };
    }
    const pct = WIDTH_STEP_PCT[Number(value)] ?? 100;
    return {
      fontFamily,
      fontVariationSettings: `"wdth" ${clamp(pct, 50, 200)}`,
    };
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <Icon className="size-4" />
          {title}
        </h2>
        {/* Always rendered (hidden while empty) so the title row keeps a
            constant height whether or not a selection exists. Same slot/style
            as the sort toggle on other sections. */}
        <button
          type="button"
          onClick={onReset}
          aria-label={`Reset ${title}`}
          disabled={selected.length === 0}
          aria-hidden={selected.length === 0}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
            selected.length === 0 && "invisible"
          )}
        >
          <XIcon className="size-3" />
          Reset
        </button>
      </div>
      {/* At most one value per section (enforced by the handler). */}
      <div className="grid grid-cols-3 gap-3">
        {items.map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={on}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow,border-color]",
                on
                  ? "border-primary"
                  : "border-input hover:border-foreground/40"
              )}
            >
              <span
                className="text-2xl leading-none"
                style={specimenStyle(value)}
              >
                Aa
              </span>
              <span className="w-full truncate font-medium text-muted-foreground text-xs leading-none">
                {label(value)}
              </span>
              <span className="font-mono text-muted-foreground text-xs leading-none">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Writing systems (real scripts, Latn/Cyrl/…) + a searchable language list.
// Scripts are the primary pills; languages are many, so they default to the
// major set (>=5M speakers) with a search box and a "show all" expander,
// mirroring the Google Fonts language picker (language-support task).
function WritingSystemSection({
  scripts,
  languages,
  selectedScripts,
  selectedLanguages,
  onToggleScript,
  onToggleLanguage,
  onResetScripts,
  onResetLanguages,
}: {
  scripts: [string, number][];
  languages: [string, number][];
  selectedScripts: string[];
  selectedLanguages: string[];
  onToggleScript: (v: string) => void;
  onToggleLanguage: (v: string) => void;
  onResetScripts: () => void;
  onResetLanguages: () => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Label scripts with human names; keep counts. Sort by count desc.
  const scriptItems = useMemo(
    () =>
      scripts.map(([code, count]) => [code, count, scriptLabel(code)] as const),
    [scripts]
  );

  const filteredLangs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withLabels = languages.map(
      ([id, count]) => [id, count, languageLabel(id)] as const
    );
    const matched = q
      ? withLabels.filter(
          ([id, , label]) =>
            label.toLowerCase().includes(q) || id.toLowerCase().includes(q)
        )
      : withLabels;
    // Default view: major languages only, unless searching or expanded.
    const visible =
      q || showAll
        ? matched
        : matched.filter(
            ([id]) => languagePopulation(id) >= MAJOR_LANG_POPULATION
          );
    // Selected-first, then by name, so active pills stay reachable.
    return [...visible].sort((a, b) => {
      const sa = selectedLanguages.includes(a[0]) ? 0 : 1;
      const sb = selectedLanguages.includes(b[0]) ? 0 : 1;
      return sa - sb || a[2].localeCompare(b[2]);
    });
  }, [languages, query, showAll, selectedLanguages]);

  const hiddenCount = languages.length - filteredLangs.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <GlobeHemisphereWestIcon className="size-4" />
          Writing system
        </h2>
        {(selectedScripts.length > 0 || selectedLanguages.length > 0) && (
          <button
            type="button"
            onClick={() => {
              onResetScripts();
              onResetLanguages();
            }}
            aria-label="Reset writing system"
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
          >
            <XIcon className="size-3" />
            Reset
          </button>
        )}
      </div>

      {/* Script pills (labelled by human name, value is the ISO code). */}
      <div className="flex flex-wrap gap-1.5">
        {scriptItems.map(([code, count, label]) => {
          const on = selectedScripts.includes(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => onToggleScript(code)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{label}</span>
              <span className="font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Language search + list. */}
      {languages.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search languages"
              className="w-full rounded-md border bg-transparent py-1.5 pr-2 pl-7 text-xs outline-none focus:border-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filteredLangs.map(([id, count, label]) => {
              const on = selectedLanguages.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onToggleLanguage(id)}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  <span className="truncate">{label}</span>
                  <span className="font-mono opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
          {!query && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            >
              <CaretDownIcon
                className={cn(
                  "size-3 transition-transform",
                  showAll && "rotate-180"
                )}
              />
              {showAll ? "Show major only" : `${hiddenCount} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  items,
  selected,
  onToggle,
  onReset,
  sortable = true,
  grid,
  spread,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  // Clear this section's own selection. When any of the section's values are
  // selected, the header's sort toggle turns into a Reset.
  onReset?: () => void;
  // When false, hide the Count/A–Z tabs and keep the default count order.
  sortable?: boolean;
  // When true, lay pills out three-per-row at equal width instead of wrapping.
  grid?: boolean;
  // When true, spread name left / count right with a mono name.
  spread?: boolean;
}) {
  const [sort, setSort] = useState<SortMode>("count");

  // `items` arrives count-sorted from the index; re-sort alphabetically when
  // asked. Copy first so we don't mutate the shared index array.
  const sorted = useMemo(() => {
    if (sort === "alpha") {
      return [...items].sort((a, b) => a[0].localeCompare(b[0]));
    }
    return items;
  }, [items, sort]);

  // This section's own selected values (Properties/Subsets share filter.facets,
  // so scope the Reset to the values this section actually shows).
  const hasSelection =
    !!onReset && items.some(([value]) => selected.includes(value));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <Icon className="size-4" />
          {title}
        </h2>
        {hasSelection ? (
          // Any value selected -> the sort slot becomes a Reset.
          <button
            type="button"
            onClick={onReset}
            aria-label={`Reset ${title}`}
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
          >
            <XIcon className="size-3" />
            Reset
          </button>
        ) : (
          sortable &&
          items.length > 1 && (
            // Single toggle showing the current order; click flips count <-> alpha.
            <button
              type="button"
              onClick={() =>
                setSort((s) => (s === "count" ? "alpha" : "count"))
              }
              aria-label={`Sort by ${sort === "count" ? "count" : "name"}, click to change`}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
            >
              <ArrowsDownUpIcon className="size-3" />
              {sort === "count" ? "123" : "A–Z"}
            </button>
          )
        )}
      </div>
      <Pills
        items={sorted}
        selected={selected}
        onToggle={onToggle}
        grid={grid}
        spread={spread}
      />
    </div>
  );
}

function Pills({
  items,
  selected,
  onToggle,
  grid,
  spread,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  grid?: boolean;
  // When true, push name left and count right (justify-between) and render the
  // name in a mono face. Used for Variable axes and OpenType features.
  spread?: boolean;
}) {
  const [showRare, setShowRare] = useState(false);

  // Rare = count below threshold. While collapsed, a selected rare pill is
  // pulled up into `common` so it stays visible and clearable. While expanded
  // the whole rare row is already shown, so leave selected pills in place —
  // otherwise toggling one makes it jump up to the common row.
  const isRare = ([value, count]: [string, number]) =>
    count < RARE_THRESHOLD && (showRare || !selected.includes(value));
  const common = items.filter((it) => !isRare(it));
  const rare = items.filter(isRare);

  const renderPill = ([value, count]: [string, number]) => {
    const on = selected.includes(value);
    return (
      <button
        key={value}
        type="button"
        onClick={() => onToggle(value)}
        className={cn(
          "flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
          spread ? "justify-between" : "justify-center",
          // Equal-width three-per-row: let each cell shrink and clip its label.
          grid && "min-w-0",
          on
            ? "border-foreground bg-foreground text-background"
            : "text-muted-foreground hover:border-foreground hover:text-foreground"
        )}
      >
        <span className={cn("truncate", spread && "font-mono")}>{value}</span>
        <span className="font-mono opacity-60">{count}</span>
      </button>
    );
  };

  // Grid mode lays pills out three-per-row at equal width; otherwise they wrap.
  const rowClass = grid ? "grid grid-cols-3 gap-1.5" : "flex flex-wrap gap-1.5";

  return (
    <div className="flex flex-col gap-2">
      <div className={rowClass}>{common.map(renderPill)}</div>
      {rare.length > 0 && (
        <>
          {/* Animate the rare row open/closed by transitioning grid rows
                        0fr -> 1fr. The inner wrapper needs overflow-hidden so the
                        collapsed content is clipped rather than spilling out. */}
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out",
              showRare ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className={rowClass}>{rare.map(renderPill)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRare((v) => !v)}
            className="flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          >
            <CaretDownIcon
              className={cn(
                "size-3 transition-transform",
                showRare && "rotate-180"
              )}
            />
            {showRare ? "Show less" : `${rare.length} more`}
          </button>
        </>
      )}
    </div>
  );
}
