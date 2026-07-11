import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { PillButton } from "./pill-button";

// A row-virtualized, two-column pill grid for a large facet (Designer, 700+).
// The plain Pills component renders every value at once, so searching a
// high-cardinality facet floods the DOM with hundreds of buttons; here only the
// visible rows exist. The list lives in its own fixed-height scroller (nested in
// the sidebar's ScrollArea) so the virtualizer has a stable scroll element and
// row offsets don't shift as other filter sections expand.

// Pills per row and the fixed height of one row (button + gap), in px.
const COLS = 2;
const ROW_H = 34;
// Cap the scroller so the whole list doesn't stretch the sidebar; it scrolls
// within this box instead.
const MAX_H = 320;

export function VirtualPills({
  items,
  selected,
  onToggle,
  label,
}: {
  // Pre-sorted [value, family count] pairs.
  items: [string, number][];
  selected: string[];
  onToggle: (value: string) => void;
  // Display name for a value; the toggle still passes the raw value.
  label?: (value: string) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(items.length / COLS);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  });

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto"
      style={{ maxHeight: MAX_H }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vrow) => {
          const start = vrow.index * COLS;
          const rowItems = items.slice(start, start + COLS);
          return (
            <div
              key={vrow.key}
              className="grid grid-cols-2 gap-1.5"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: ROW_H,
                transform: `translateY(${vrow.start}px)`,
              }}
            >
              {rowItems.map(([value, count]) => (
                <PillButton
                  key={value}
                  value={value}
                  count={count}
                  label={label ? label(value) : value}
                  selected={selected.includes(value)}
                  onToggle={onToggle}
                  className="min-w-0"
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
