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

// A directionless group disables the toggle and exposes only its `asc` order.
//
// With an active search query the results rank by relevance, so the control
// reads "Relevance" and is disabled: its label has to match the real order.
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

  if (relevance) {
    return (
      <div
        className="flex h-8 items-center rounded-lg border border-input px-3 text-sm dark:bg-input/30"
        title="Sorted by search relevance"
      >
        Relevance
      </div>
    );
  }

  const directionless = isDirectionless(group);
  // Directionless groups only expose `asc`; keep the current direction when both
  // groups support it.
  const dirLabel = asc ? group.ascLabel : (group.descLabel ?? group.ascLabel);

  const selectGroup = (g: string | null) => {
    const next = SORT_GROUPS.find((x) => x.group === g);
    if (next) onChange(!asc && next.desc ? next.desc : next.asc);
  };

  return (
    <div className="flex h-8 items-center rounded-lg border border-input dark:bg-input/30">
      {/* Same slot, two presentations: a dropdown on desktop, a bottom sheet on
          touch, where a native select popup is an awkward target. The frame and
          the direction toggle are identical either way. */}
      {mobile ? (
        <GroupDrawer group={group.group} onSelect={selectGroup} />
      ) : (
        <Select value={group.group} onValueChange={selectGroup}>
          <SelectTrigger
            className="h-full rounded-none border-0 bg-transparent shadow-none before:hidden focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
            aria-label="Sort by"
          >
            <SelectValue>{group.group}</SelectValue>
          </SelectTrigger>
          {/* Right-align the popup to the trigger so its right border
                    lands on the group's divider hairline, not out past the
                    direction button. */}
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
      {/* Solid 1px divider: a `border-l` renders lighter than the group's outer
          border (sub-pixel anti-aliasing), so use a real hairline in the same
          token as the frame. */}
      <div className="h-full w-px shrink-0 bg-input" />
      <button
        type="button"
        disabled={directionless}
        onClick={() => {
          if (!directionless) {
            onChange(asc ? (group.desc ?? group.asc) : group.asc);
          }
        }}
        aria-label={`Sort direction: ${dirLabel}`}
        title={dirLabel}
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

// The same trigger the Select renders, but tapping opens a bottom sheet.
function GroupDrawer({
  group,
  onSelect,
}: {
  group: string;
  onSelect: (group: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Mirrors SelectTrigger's own box (min-w-36, justify-between, the same
          px and caret) so swapping presentations doesn't move the frame. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sort by"
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
                // min-h-12 keeps every row a comfortable touch target.
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
