import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode } from "./font-grid";

// Placeholder shown while a filter change is being applied (the deferred result
// set is still catching up). Mirrors the grid/row card sizes so swapping it for
// the real list doesn't shift layout. A fixed count is enough — it's only ever
// on screen for the brief filtering window.
export function FontGridSkeleton({ view }: { view: ViewMode }) {
  const count = view === "row" ? 8 : 9;
  return view === "row" ? (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-72 w-full" />
      ))}
    </div>
  );
}
