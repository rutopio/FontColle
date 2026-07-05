import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { FacetIndex } from "@/lib/fonts/data";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

// sidebar-09 shell for the list and detail pages: a two-level sidebar (icon
// rail + filters) on the left, page content in the inset on the right. The
// preview dock is mounted once in __root, so both pages share it.
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
    <SidebarProvider
      style={
        {
          // Icon rail (3rem) + room for the filter panel at its original 20rem.
          "--sidebar-width": "23rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        index={index}
        filter={filter}
        onFilterChange={onFilterChange}
      />
      <SidebarInset>
        <div className="mx-auto flex w-full max-w-(--breakpoint-2xl) flex-1 flex-col gap-6 p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Right column of both pages: a sticky header pinned to the top, then the
// scrolling body under it. The header stays a fixed height on both pages so the
// two layouts line up.
export function Column({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>;
}

// sidebar-09 main header: a SidebarTrigger (collapses the sidebar) and a
// vertical separator, then the page's own header content. `className` styles
// the content row (e.g. justify-between on the detail page).
export function ColumnHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 -mt-6 flex h-20 items-center gap-3 border-border border-b bg-background pt-6">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-1 data-[orientation=vertical]:h-4"
      />
      <div className={cn("flex flex-1 items-center gap-3", className)}>
        {children}
      </div>
    </div>
  );
}
