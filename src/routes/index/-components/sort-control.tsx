import {
  CaretUpDownIcon,
  CheckIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectTriggerIconClassName,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  isDirectionless,
  SORT_GROUPS,
  type SortKey,
  sortGroupOf,
} from "@/lib/fonts/sort";
import { cn } from "@/lib/utils";

// Relevance only ranks something against a query, so it is offered as a sort
// group only while one is active. It carries no SortKey: picking it means
// "no explicit sort", which is what lets searchByQuery's own order stand.
export const RELEVANCE_GROUP = "Relevance";

export function SortControl({
  sort,
  onChange,
  onRelevance,
  relevance = false,
  sortedByRelevance = false,
}: {
  sort: SortKey;
  onChange: (next: SortKey) => void;
  /** Clears the explicit sort, restoring relevance order. */
  onRelevance?: () => void;
  /** A query is active, so Relevance is an available choice. */
  relevance?: boolean;
  /** Relevance is the live selection, not merely available. */
  sortedByRelevance?: boolean;
}) {
  const { group, asc } = sortGroupOf(sort);
  const mobile = useIsMobile();

  const onRelevanceNow = relevance && sortedByRelevance;
  const directionless = onRelevanceNow || isDirectionless(group);
  const dirLabel = asc ? group.ascLabel : (group.descLabel ?? group.ascLabel);

  const current = onRelevanceNow ? RELEVANCE_GROUP : group.group;
  const groups = relevance
    ? [RELEVANCE_GROUP, ...SORT_GROUPS.map((g) => g.group)]
    : SORT_GROUPS.map((g) => g.group);

  const selectGroup = (g: string | null) => {
    if (g === RELEVANCE_GROUP) {
      onRelevance?.();
      return;
    }
    const next = SORT_GROUPS.find((x) => x.group === g);
    if (next) onChange(!asc && next.desc ? next.desc : next.asc);
  };

  return (
    <div className="flex h-9 items-center rounded-lg border border-input bg-background dark:bg-input/30">
      {mobile ? (
        <GroupDrawer
          group={current}
          groups={groups}
          label="Sort by"
          onSelect={selectGroup}
        />
      ) : (
        <Select value={current} onValueChange={selectGroup}>
          <SelectTrigger
            className="h-full rounded-none border-0 bg-transparent shadow-none before:hidden focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
            aria-label="Sort by"
          >
            <SelectValue>{current}</SelectValue>
          </SelectTrigger>
          <SelectContent
            align="end"
            alignOffset={-3}
            alignItemWithTrigger={false}
          >
            {groups.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="h-full w-px shrink-0 bg-input" />
      <button
        type="button"
        disabled={directionless}
        onClick={() => {
          if (!directionless) {
            onChange(asc ? (group.desc ?? group.asc) : group.asc);
          }
        }}
        aria-label={
          onRelevanceNow
            ? "Sort direction: unavailable while sorted by relevance"
            : `Sort direction: ${dirLabel}`
        }
        title={onRelevanceNow ? "Relevance has no sort direction" : dirLabel}
        className="flex h-full items-center px-2.5 transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-input/50"
      >
        {asc ? (
          <SortAscendingIcon className="size-4" />
        ) : (
          <SortDescendingIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

function GroupDrawer({
  group,
  groups,
  label,
  onSelect,
}: {
  group: string;
  groups: string[];
  label: string;
  onSelect: (group: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-expanded={open}
        className="inline-flex h-full w-full min-w-36 select-none items-center justify-between gap-2 px-[calc(--spacing(3)-1px)] text-left text-sm outline-none"
      >
        {group}
        <CaretUpDownIcon className={selectTriggerIconClassName} />
      </button>

      <SheetContent side="bottom" className="gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <SortAscendingIcon className="size-4 text-primary" />
          <SheetTitle>Sort by</SheetTitle>
        </div>
        <div
          className="flex flex-col overflow-y-auto p-2"
          style={{
            paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
          }}
        >
          {groups.map((g) => {
            const on = g === group;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  onSelect(g);
                  setOpen(false);
                }}
                aria-pressed={on}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-md px-3 text-left text-sm transition-colors",
                  on
                    ? "bg-accent font-medium text-accent-foreground"
                    : "active:bg-accent/50"
                )}
              >
                <span className="truncate">{g}</span>
                {on && <CheckIcon className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
