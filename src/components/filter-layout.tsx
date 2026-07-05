import { FilterSidebar } from "@/components/filter-sidebar";
import type { FacetIndex } from "@/lib/fonts/data";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

// Shared shell for the list and detail pages: floating filter sidebar on the
// left, page-specific content on the right. The preview dock is mounted once in
// __root, so both pages share it without going through here.
export function FilterLayout({
  index,
  filter,
  onFilterChange,
  children,
}: {
  index: FacetIndex;
  filter: FilterState;
  onFilterChange: (next: FilterState) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-(--breakpoint-2xl) flex-col gap-6 p-6">
      <div className="flex gap-6">
        <FilterSidebar
          index={index}
          filter={filter}
          onChange={onFilterChange}
        />
        {children}
      </div>
    </div>
  );
}

// Right column of both pages: a sticky header pinned to the top, then the
// scrolling body under it. The header stays a fixed height on both pages so the
// two layouts line up.
export function Column({ children }: { children: React.ReactNode }) {
  return <main className="flex min-w-0 flex-1 flex-col gap-6">{children}</main>;
}

export function ColumnHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mt-6 flex h-20 items-center gap-3 border-border border-b bg-background pt-6",
        className
      )}
    >
      {children}
    </div>
  );
}
