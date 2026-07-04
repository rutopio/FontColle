import { FilterSidebar } from "@/components/filter-sidebar";
import type { FacetIndex } from "@/lib/fonts/data";
import type { FilterState } from "@/lib/fonts/filter";

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
    <div className="container flex min-h-svh flex-col gap-6 p-6">
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
