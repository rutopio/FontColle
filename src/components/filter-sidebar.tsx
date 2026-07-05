import { CaretDown } from "@phosphor-icons/react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

// Pills for facets with fewer than this many fonts stay hidden behind a
// collapsible until the user opens it, unless they're already selected.
const RARE_THRESHOLD = 5;

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
        <div className="flex flex-col gap-4 p-3">
          <Section title="Category">
            <Pills
              items={index.classes}
              selected={filter.classes}
              onToggle={(v) => toggle("classes", v)}
            />
          </Section>

          <Section title="Properties">
            <Pills
              items={index.facets}
              selected={filter.facets}
              onToggle={(v) => toggle("facets", v)}
            />
          </Section>

          <Section title="Language">
            <Pills
              items={index.scripts}
              selected={filter.facets}
              onToggle={(v) => toggle("facets", v)}
            />
          </Section>

          <Section title="Variable axes">
            <Pills
              items={index.axes}
              selected={filter.axes}
              onToggle={(v) => toggle("axes", v)}
            />
          </Section>

          <Section title="OpenType features">
            <Pills
              items={index.features}
              selected={filter.features}
              onToggle={(v) => toggle("features", v)}
              mono
            />
          </Section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </h2>
      {children}
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

  // Rare (count < threshold) pills hide by default, but a selected one always
  // shows so the user can see and clear it.
  const common = items.filter(
    ([value, count]) => count >= RARE_THRESHOLD || selected.includes(value)
  );
  const rare = items.filter(
    ([value, count]) => count < RARE_THRESHOLD && !selected.includes(value)
  );

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
