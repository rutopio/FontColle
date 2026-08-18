import {
  CaretUpDownIcon,
  CheckIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  isDirectionless,
  SORT_GROUPS,
  type SortKey,
  sortGroupOf,
} from "@/lib/fonts/sort";
import { cn } from "@/lib/utils";

export const RELEVANCE_GROUP = "Relevance";

const SORT_NOTES: Record<string, string> = {
  // Google ranks by growth rate, not absolute downloads.
  Trending: "Google ranks by growth rate, so niche families can lead",
};

const announceSort = (group: string, direction?: string) => {
  const note = SORT_NOTES[group];
  const description = [direction, note].filter(Boolean).join(" · ");
  toast.info(`Sorted by ${group}`, {
    description: description || undefined,
    id: "sort-mode",
  });
};

export function SortControl({
  sort,
  onChange,
  onRelevance,
  relevance = false,
  sortedByRelevance = false,
}: {
  sort: SortKey;
  onChange: (next: SortKey) => void;
  onRelevance?: () => void;
  relevance?: boolean;
  sortedByRelevance?: boolean;
}) {
  const { group, asc } = sortGroupOf(sort);
  const mobile = useIsMobile();

  // Publish measured width on :root so the portal-rendered popup can match it.
  const wrapRef = useRef<HTMLDivElement>(null);
  useMountEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const publish = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) {
        document.documentElement.style.setProperty(
          "--sort-control-w",
          `${w}px`
        );
      }
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  });

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
      announceSort(RELEVANCE_GROUP, "Best matches first");
      return;
    }
    const next = SORT_GROUPS.find((x) => x.group === g);
    if (!next) return;
    const keepDesc = asc ? undefined : next.desc;
    onChange(keepDesc ?? next.asc);
    announceSort(next.group, keepDesc ? next.descLabel : next.ascLabel);
  };

  return (
    <div
      ref={wrapRef}
      className="flex h-9 items-center rounded-lg border border-input bg-background dark:bg-input/30"
    >
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
            variant="borderless"
            className="h-9 min-w-56 rounded-none rounded-l-md focus-visible:ring-0"
            aria-label="Sort by"
          />
          {/* Every sort group fits at once. Drop the shared 300px cap and
              let only the viewport limit the popup.
              The popup anchors to the trigger, which is only the left segment
              of this control, so by default it stops short of the direction
              button and the two read as separate widgets. Pinning its width to
              the whole control lines the right edges up, so trigger, direction
              button and popup read as one selector. Measured rather than
              derived from the class names: the gap is the divider plus the
              button plus the wrapper's own borders, which a hardcoded sum gets
              subtly wrong. The -ml-px cancels the wrapper's left border: the
              popup anchors to the trigger's content box, one pixel inside it. */}
          <SelectContent className="-ml-px max-h-[var(--available-height)] w-[var(--sort-control-w)]">
            {groups.map((g, i) => (
              <SelectItem key={g} index={i} value={g}>
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
          if (directionless) return;
          const nextAsc = !asc;
          onChange(nextAsc ? group.asc : (group.desc ?? group.asc));
          announceSort(
            group.group,
            nextAsc ? group.ascLabel : (group.descLabel ?? group.ascLabel)
          );
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
        <CaretUpDownIcon className="-me-1 size-4.5 shrink-0 opacity-80 sm:size-4" />
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
