import { useLayoutEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_H, columnsFor, LINE_H, type ViewMode } from "./font-grid";

// Placeholder shown while a filter change is being applied (the deferred result
// set is still catching up). It mirrors the real grid: same card/line heights,
// and the same column count — derived from the container width via the grid's
// own columnsFor, so a sidebar-narrowed panel that shows two columns gets a
// two-column skeleton rather than the viewport-breakpoint count CSS would pick.
export function FontGridSkeleton({ view }: { view: ViewMode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(view === "row" ? 1 : 3);

  useLayoutEffect(() => {
    const measure = () => {
      if (ref.current) setCols(columnsFor(ref.current.offsetWidth, view));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view]);

  // Roughly fill a viewport's worth of rows so the skeleton reads as a full
  // list, not a stub.
  const rows = view === "row" ? 6 : 3;
  const count = rows * cols;
  const height = view === "row" ? LINE_H : CARD_H;
  // Stable keys for the fixed, never-reordered placeholder set.
  const keys = Array.from({ length: count }, (_, i) => `skeleton-${i}`);

  return (
    <div
      ref={ref}
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {keys.map((k) => (
        <Skeleton key={k} style={{ height }} className="w-full" />
      ))}
    </div>
  );
}
