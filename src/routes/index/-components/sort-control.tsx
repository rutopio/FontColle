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

export function SortControl({
  sort,
  onChange,
  relevance = false,
}: {
  sort: SortKey;
  onChange: (next: SortKey) => void;
  relevance?: boolean;
}) {
  const { group, asc } = sortGroupOf(sort);
  const mobile = useIsMobile();

  const directionless = relevance || isDirectionless(group);
  const dirLabel = asc ? group.ascLabel : (group.descLabel ?? group.ascLabel);

  // Both controls go disabled under relevance, which drops them out of the tab
  // order and takes the wrapper's title with them. State the reason in the
  // accessible name so it isn't carried by opacity alone.
  const sortByLabel = relevance
    ? "Sort by: locked to search relevance"
    : "Sort by";

  const selectGroup = (g: string | null) => {
    const next = SORT_GROUPS.find((x) => x.group === g);
    if (next) onChange(!asc && next.desc ? next.desc : next.asc);
  };

  return (
    <div
      className="flex h-9 items-center rounded-lg border border-input bg-background dark:bg-input/30"
      title={relevance ? "Sorted by search relevance" : undefined}
    >
      {mobile ? (
        <GroupDrawer
          group={relevance ? "Relevance" : group.group}
          disabled={relevance}
          label={sortByLabel}
          onSelect={selectGroup}
        />
      ) : (
        <Select
          value={group.group}
          onValueChange={selectGroup}
          disabled={relevance}
        >
          <SelectTrigger
            className="h-full rounded-none border-0 bg-transparent shadow-none before:hidden focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
            aria-label={sortByLabel}
          >
            <SelectValue>{relevance ? "Relevance" : group.group}</SelectValue>
          </SelectTrigger>
          <SelectContent
            align="end"
            alignOffset={-3}
            alignItemWithTrigger={false}
          >
            {SORT_GROUPS.map((g) => (
              <SelectItem key={g.group} value={g.group}>
                {g.group}
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
          relevance
            ? "Sort direction: locked to search relevance"
            : `Sort direction: ${dirLabel}`
        }
        title={relevance ? "Sorted by search relevance" : dirLabel}
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
  disabled = false,
  label,
  onSelect,
}: {
  group: string;
  disabled?: boolean;
  label: string;
  onSelect: (group: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-expanded={open}
        className="inline-flex h-full w-full min-w-36 select-none items-center justify-between gap-2 px-[calc(--spacing(3)-1px)] text-left text-sm outline-none disabled:pointer-events-none disabled:opacity-64"
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
          {SORT_GROUPS.map((g) => {
            const on = g.group === group;
            return (
              <button
                key={g.group}
                type="button"
                onClick={() => {
                  onSelect(g.group);
                  setOpen(false);
                }}
                aria-pressed={on}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-md px-3 text-left text-sm transition-colors",
                  on
                    ? "bg-black/10 font-medium dark:bg-white/12"
                    : "active:bg-muted"
                )}
              >
                <span className="truncate">{g.group}</span>
                {on && <CheckIcon className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
