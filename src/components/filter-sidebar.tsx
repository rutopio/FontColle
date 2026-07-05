import {
  ArrowsDownUpIcon,
  ArrowsOutLineHorizontalIcon,
  BookmarkSimpleIcon,
  CaretDownIcon,
  CheckIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

// Writing systems (real scripts, Latn/Cyrl/…). Script pills for the common
// ones, plus a Browse all dialog over the full searchable list.
function WritingSystemSection({
  scripts,
  selectedScripts,
  onToggleScript,
  onResetScripts,
}: {
  scripts: [string, number][];
  selectedScripts: string[];
  onToggleScript: (v: string) => void;
  onResetScripts: () => void;
}) {
  // Label scripts with human names; keep counts. Already count-sorted.
  const items = useMemo(
    () =>
      scripts.map(([code, count]) => [code, count, scriptLabel(code)] as const),
    [scripts]
  );

  return (
    <FacetPickerSection
      title="Writing system"
      icon={GlobeHemisphereWestIcon}
      items={items}
      selected={selectedScripts}
      onToggle={onToggleScript}
      onReset={onResetScripts}
      dialogTitle="Writing systems"
      dialogDescription="Filter fonts by the scripts they support."
      searchPlaceholder="Search writing systems"
    />
  );
}

// Languages: a searchable list of hundreds of language ids. Pills show the
// major languages (>=5M speakers); the Browse all dialog searches every one.
function LanguageSection({
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
  // Full labelled list for the dialog (name-sorted).
  const allItems = useMemo(
    () =>
      languages
        .map(([id, count]) => [id, count, languageLabel(id)] as const)
        .sort((a, b) => a[2].localeCompare(b[2])),
    [languages]
  );
  // Sidebar pills show only the major languages (plus any selected minor ones,
  // so an active pill stays visible and clearable).
  const pillItems = useMemo(
    () =>
      allItems.filter(
        ([id]) =>
          languagePopulation(id) >= MAJOR_LANG_POPULATION ||
          selectedLanguages.includes(id)
      ),
    [allItems, selectedLanguages]
  );

  return (
    <FacetPickerSection
      title="Language"
      icon={TranslateIcon}
      items={allItems}
      pillItems={pillItems}
      selected={selectedLanguages}
      onToggle={onToggleLanguage}
      onReset={onResetLanguages}
      dialogTitle="Languages"
      dialogDescription="Filter fonts by the languages they support."
      searchPlaceholder="Search languages"
    />
  );
}

// A sidebar section that shows selectable pills for a facet dimension plus a
// "Browse all" dialog over the full searchable, scrollable list. Shared by the
// Writing system and Language sections. Each item is [value, count, label].
type FacetItem = readonly [string, number, string];
function FacetPickerSection({
  title,
  icon: Icon,
  items,
  pillItems,
  selected,
  onToggle,
  onReset,
  dialogTitle,
  dialogDescription,
  searchPlaceholder,
}: {
  title: string;
  icon: Icon;
  items: readonly FacetItem[];
  // Which items to show as sidebar pills; defaults to all of `items`.
  pillItems?: readonly FacetItem[];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  dialogTitle: string;
  dialogDescription: string;
  searchPlaceholder: string;
}) {
  const pills = pillItems ?? items;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <Icon className="size-4" />
          {title}
        </h2>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Reset ${title}`}
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
          >
            <XIcon className="size-3" />
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pills.map(([value, count, label]) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
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
        <FacetPickerDialog
          items={items}
          selected={selected}
          onToggle={onToggle}
          title={dialogTitle}
          description={dialogDescription}
          searchPlaceholder={searchPlaceholder}
        />
      </div>
    </div>
  );
}

// A dialog for picking a facet value from a searchable, scrollable list. Each
// row toggles the filter live, so the grid narrows behind the open dialog.
function FacetPickerDialog({
  items,
  selected,
  onToggle,
  title,
  description,
  searchPlaceholder,
}: {
  items: readonly FacetItem[];
  selected: string[];
  onToggle: (v: string) => void;
  title: string;
  description: string;
  searchPlaceholder: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      ([value, , label]) =>
        label.toLowerCase().includes(q) || value.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground"
          >
            <MagnifyingGlassIcon className="size-3" />
            Browse all
          </button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
            className="w-full rounded-md border bg-transparent py-2 pr-2 pl-8 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="-mr-1 max-h-80 overflow-y-auto pr-1">
          <div className="flex flex-col gap-0.5">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-muted-foreground text-sm">
                Nothing matches “{query}”.
              </p>
            )}
            {filtered.map(([value, count, label]) => {
              const on = selected.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToggle(value)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    on
                      ? "bg-foreground text-background"
                      : "hover:bg-muted dark:hover:bg-muted/50"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                        on ? "border-background" : "border-muted-foreground/50"
                      )}
                    >
                      {on && <CheckIcon className="size-3" weight="bold" />}
                    </span>
                    <span className="truncate">{label}</span>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        on ? "opacity-70" : "text-muted-foreground"
                      )}
                    >
                      {value}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs",
                      on ? "opacity-70" : "text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
