import {
  ArrowsDownUpIcon,
  ArrowsHorizontalIcon,
  BookmarkSimpleIcon,
  CaretDownIcon,
  type Icon,
  ShapesIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
  ToggleRightIcon,
  TranslateIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type FilterState,
  WEIGHT_LABELS,
  WIDTH_LABELS,
} from "@/lib/fonts/filter";
import {
  ensureFontLoaded,
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
  scripts: [string, number][];
  features: [string, number][];
  axes: [string, number][];
  weights: [string, number][];
  widths: [string, number][];
}

// Render a weight/width pill by its human label ("Bold") instead of the raw
// numeric step, while the toggle value stays numeric.
const weightLabel = (v: string) => WEIGHT_LABELS[Number(v)] ?? v;
const widthLabel = (v: string) => WIDTH_LABELS[Number(v)] ?? v;

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
          />
          <Section
            title="Subsets"
            icon={TranslateIcon}
            items={index.scripts}
            selected={filter.facets}
            onToggle={(v) => toggle("facets", v)}
            sortable={false}
            grid
          />
          <CardGrid
            title="Weight"
            icon={TextAaIcon}
            items={index.weights}
            selected={filter.weights}
            onToggle={(v) => toggle("weights", v)}
            label={weightLabel}
          />
          <CardGrid
            title="Width"
            icon={ArrowsHorizontalIcon}
            items={index.widths}
            selected={filter.widths}
            onToggle={(v) => toggle("widths", v)}
            label={widthLabel}
          />
          <Section
            title="Variable axes"
            icon={SlidersHorizontalIcon}
            items={index.axes}
            selected={filter.axes}
            onToggle={(v) => toggle("axes", v)}
            grid
            spread
          />
          <Section
            title="OpenType features"
            icon={ToggleRightIcon}
            items={index.features}
            selected={filter.features}
            onToggle={(v) => toggle("features", v)}
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
        "relative flex cursor-pointer flex-col items-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow]",
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
      <span className="font-medium text-foreground text-xs leading-none">
        {value}
      </span>
      <span className="font-mono text-muted-foreground text-xs leading-none">
        {count}
      </span>
    </button>
  );
}

// Big-button grid (same shape as CategoryCards) for value dimensions like Weight
// and Width. No font specimen — the card shows its label plus family count. All
// cards render at once (no rare collapse): the value sets are small and fixed.
function CardGrid({
  title,
  icon: Icon,
  items,
  selected,
  onToggle,
  label,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  // Map a raw value to a display label (e.g. "700" -> "Bold").
  label: (value: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
        <Icon className="size-4" />
        {title}
      </h2>
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
                "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow]",
                on
                  ? "border-primary"
                  : "border-input hover:border-foreground/40"
              )}
            >
              <span className="w-full truncate font-medium text-foreground text-xs leading-none">
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

function Section({
  title,
  icon: Icon,
  items,
  selected,
  onToggle,
  sortable = true,
  grid,
  spread,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <Icon className="size-4" />
          {title}
        </h2>
        {sortable && items.length > 1 && (
          // Single toggle showing the current order; click flips count <-> alpha.
          <button
            type="button"
            onClick={() => setSort((s) => (s === "count" ? "alpha" : "count"))}
            aria-label={`Sort by ${sort === "count" ? "count" : "name"}, click to change`}
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
          >
            <ArrowsDownUpIcon className="size-3" />
            {sort === "count" ? "123" : "A–Z"}
          </button>
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
