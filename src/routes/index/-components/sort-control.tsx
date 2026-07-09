import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isDirectionless,
  SORT_GROUPS,
  type SortKey,
  sortGroupOf,
} from "@/lib/fonts/sort";

// The list sort control: a group picker on the left and a direction toggle on
// the right, joined into one bordered button group. A group maps to an asc key
// and (usually) a desc key; directionless groups (e.g. Popularity) disable the
// toggle and expose only their `asc` order.
export function SortControl({
  sort,
  onChange,
}: {
  sort: SortKey;
  onChange: (next: SortKey) => void;
}) {
  const { group, asc } = sortGroupOf(sort);
  const directionless = isDirectionless(group);
  // Directionless groups only expose `asc`; keep the current direction when both
  // groups support it.
  const dirLabel = asc ? group.ascLabel : (group.descLabel ?? group.ascLabel);

  return (
    <div className="flex h-8 items-center rounded-lg border border-input dark:bg-input/30">
      <Select
        value={group.group}
        onValueChange={(g) => {
          const next = SORT_GROUPS.find((x) => x.group === g);
          if (next) onChange(!asc && next.desc ? next.desc : next.asc);
        }}
      >
        <SelectTrigger
          className="h-full rounded-r-none border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
          aria-label="Sort by"
        >
          <SelectValue>{group.group}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_GROUPS.map((g) => (
            <SelectItem key={g.group} value={g.group}>
              {g.group}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
        className="flex h-full items-center border-input border-l px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-input/50"
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
