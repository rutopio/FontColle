import {
  BookmarkSimple,
  CaretDown,
  type Icon,
  Shapes,
  SlidersHorizontal,
  ToggleRight,
  Translate,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilterState } from "@/lib/fonts/filter";
import {
  ensureFontLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { cn } from "@/lib/utils";

// Pills for facets with fewer than this many fonts stay hidden behind a
// collapsible until the user opens it, unless they're already selected.
const RARE_THRESHOLD = 5;

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

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-8 p-4">
          <CategoryCards
            items={index.classes}
            selected={filter.classes}
            onToggle={(v) => toggle("classes", v)}
          />
          <Section
            title="Properties"
            icon={BookmarkSimple}
            items={index.facets}
            selected={filter.facets}
            onToggle={(v) => toggle("facets", v)}
          />
          <Section
            title="Subsets"
            icon={Translate}
            items={index.scripts}
            selected={filter.facets}
            onToggle={(v) => toggle("facets", v)}
            sortable={false}
          />
          <Section
            title="Variable axes"
            icon={SlidersHorizontal}
            items={index.axes}
            selected={filter.axes}
            onToggle={(v) => toggle("axes", v)}
          />
          <Section
            title="OpenType features"
            icon={ToggleRight}
            items={index.features}
            selected={filter.features}
            onToggle={(v) => toggle("features", v)}
            mono
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
        <Shapes className="size-4" />
        Category
      </h2>
      <div className="grid grid-cols-3 gap-1.5">
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
        "relative flex cursor-pointer flex-col items-center gap-2 rounded-md border px-2 py-3 text-center shadow-xs outline-none transition-[color,box-shadow]",
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
      <span className="font-mono text-[10px] text-muted-foreground leading-none">
        {count}
      </span>
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  items,
  selected,
  onToggle,
  mono,
  sortable = true,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  mono?: boolean;
  // When false, hide the Count/A–Z tabs and keep the default count order.
  sortable?: boolean;
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <Icon className="size-4" />
          {title}
        </h2>
        {sortable && items.length > 1 && (
          <Tabs value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <TabsList>
              <TabsTrigger value="count" className="text-xs">
                Count
              </TabsTrigger>
              <TabsTrigger value="alpha" className="text-xs">
                A–Z
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
      <Pills
        items={sorted}
        selected={selected}
        onToggle={onToggle}
        mono={mono}
      />
    </div>
  );
}

function Pills({
  items,
  selected,
  onToggle,
  mono,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  mono?: boolean;
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
          "rounded-full border px-2.5 py-1 text-xs transition-colors",
          mono && "font-mono",
          on
            ? "border-foreground bg-foreground text-background"
            : "text-muted-foreground hover:border-foreground hover:text-foreground"
        )}
      >
        {value}
        <span className="ml-1 font-mono opacity-60">{count}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">{common.map(renderPill)}</div>
      {rare.length > 0 && (
        <>
          {showRare && (
            <div className="flex flex-wrap gap-1.5">{rare.map(renderPill)}</div>
          )}
          <button
            type="button"
            onClick={() => setShowRare((v) => !v)}
            className="flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          >
            <CaretDown
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
