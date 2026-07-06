import {
  ArrowsDownUpIcon,
  CheckIcon,
  type Icon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SectionHeader, type SortMode } from "./section-header";

// A labelled facet value: [value, family count, human label].
export type FacetItem = readonly [string, number, string];

// A facet section that surfaces the top-N most common values as toggleable pills
// (plus any selected outside the top N) with a sort toggle, backed by a
// "Browse all" dialog over the full list. Shared by Writing system and Language.
export function FacetPickerSection({
  title,
  icon: Icon,
  items,
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
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  dialogTitle: string;
  dialogDescription: string;
  searchPlaceholder: string;
}) {
  const TOP_N = 15;
  const [sort, setSort] = useState<SortMode>("count");

  // The most common values, count-sorted regardless of the incoming order, so
  // the top-N pills are the same set whether items arrive count- or name-sorted.
  const topNSet = useMemo(
    () =>
      new Set(
        [...items]
          .sort((a, b) => b[1] - a[1])
          .slice(0, TOP_N)
          .map((it) => it[0])
      ),
    [items]
  );

  // Top-N pills plus any selected value outside the top N, ordered by the
  // active sort: count desc (default) or alphabetically by label.
  const visiblePills = useMemo(() => {
    const shown = items.filter(
      ([value]) => topNSet.has(value) || selected.includes(value)
    );
    return [...shown].sort((a, b) =>
      sort === "alpha" ? a[2].localeCompare(b[2]) : b[1] - a[1]
    );
  }, [items, topNSet, selected, sort]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={title}
        icon={Icon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={visiblePills.length > 1}
        sort={sort}
        onToggleSort={() => setSort((s) => (s === "count" ? "alpha" : "count"))}
      />

      <div className="flex flex-wrap gap-1.5">
        {/* Top-N most common values as toggleable pills; click to toggle. */}
        {visiblePills.map(([value, count, label]) => {
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
// `primary` chooses which of the pair is prominent: features lead with the tag
// ("liga"); writing systems/languages lead with the human label ("Latin").
export function FacetPickerDialog({
  items,
  selected,
  onToggle,
  title,
  description,
  searchPlaceholder,
  primary = "label",
}: {
  items: readonly FacetItem[];
  selected: string[];
  onToggle: (v: string) => void;
  title: string;
  description: string;
  searchPlaceholder: string;
  primary?: "label" | "value";
}) {
  const [query, setQuery] = useState("");
  // Row order inside the dialog: by family count (default) or alphabetically,
  // mirroring the sort toggle on the plain sidebar sections.
  const [sort, setSort] = useState<SortMode>("count");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? items.filter(
          ([value, , label]) =>
            label.toLowerCase().includes(q) || value.toLowerCase().includes(q)
        )
      : items;
    if (sort === "alpha") {
      return [...matched].sort((a, b) => a[2].localeCompare(b[2]));
    }
    return [...matched].sort((a, b) => b[1] - a[1] || a[2].localeCompare(b[2]));
  }, [items, query, sort]);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground"
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

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSort((s) => (s === "count" ? "alpha" : "count"))}
            aria-label={`Sort by ${sort === "count" ? "count" : "name"}, click to change`}
            className="shrink-0 font-mono text-muted-foreground text-xs"
          >
            <ArrowsDownUpIcon className="size-3" />
            {sort === "count" ? "123" : "A–Z"}
          </Button>
        </div>

        <ScrollArea className="-mr-1 h-80 pr-1">
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
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted dark:hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                        on
                          ? "border-foreground bg-foreground text-background"
                          : "border-muted-foreground/50"
                      )}
                    >
                      {on && <CheckIcon className="size-3" weight="bold" />}
                    </span>
                    {primary === "value" ? (
                      <>
                        <span className="truncate font-mono">{value}</span>
                        <span className="truncate text-muted-foreground text-xs">
                          {label}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="truncate">{label}</span>
                        <span className="font-mono text-muted-foreground text-xs">
                          {value}
                        </span>
                      </>
                    )}
                  </span>
                  <span className="font-mono text-muted-foreground text-xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
