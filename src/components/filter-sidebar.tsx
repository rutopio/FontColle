import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

interface FacetIndex {
  classes: [string, number][];
  facets: [string, number][];
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
    <aside className="flex w-60 shrink-0 flex-col gap-6 overflow-y-auto pr-2">
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
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([value, count]) => {
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
            <span className="ml-1 opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
