import { TextAa } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { FilterSidebar } from "@/components/filter-sidebar";
import type { FacetIndex } from "@/lib/fonts/data";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

// Two-level shell (shadcn sidebar-09 layout): a narrow icon rail on the far
// left, the filter sidebar as the second level, then page-specific content on
// the right. The preview dock is mounted once in __root, so both pages share it
// without going through here.
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
    <div className="mx-auto flex min-h-svh w-full max-w-(--breakpoint-2xl) gap-6 p-6">
      <IconRail />
      <FilterSidebar index={index} filter={filter} onChange={onFilterChange} />
      {children}
    </div>
  );
}

// First level: a fixed-width, icon-only column. For now it holds a single link
// back to the font list; more destinations can slot in below it later.
function IconRail() {
  return (
    <nav className="sticky top-6 flex h-[calc(100svh-3rem)] w-14 shrink-0 flex-col items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar py-4 text-sidebar-foreground shadow-sm">
      <Link
        to="/"
        aria-label="All fonts"
        className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground transition-opacity hover:opacity-90"
      >
        <TextAa className="size-5" weight="bold" />
      </Link>
    </nav>
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
