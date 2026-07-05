import { CaretDown } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

// Pills for facets with fewer than this many fonts stay hidden behind a
// collapsible until the user opens it, unless they're already selected.
const RARE_THRESHOLD = 5;

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
    <aside className="sticky top-6 flex h-[calc(100svh-3rem)] w-80 shrink-0 flex-col rounded-lg border border-sidebar-border bg-background text-sidebar-foreground shadow-sm">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-8 p-4">
          <Section
            title="Category"
            items={index.classes}
            selected={filter.classes}
            onToggle={(v) => toggle("classes", v)}
          />
          <Section
            title="Properties"
            items={index.facets}
            selected={filter.facets}
            onToggle={(v) => toggle("facets", v)}
          />
          <Section
            title="Subsets"
            items={index.scripts}
            selected={filter.facets}
            onToggle={(v) => toggle("facets", v)}
          />
          <Section
            title="Variable axes"
            items={index.axes}
            selected={filter.axes}
            onToggle={(v) => toggle("axes", v)}
          />
          <Section
            title="OpenType features"
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

function Section({
  title,
  items,
  selected,
  onToggle,
  mono,
}: {
  title: string;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  mono?: boolean;
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
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {title}
        </h2>
        {items.length > 1 && (
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
