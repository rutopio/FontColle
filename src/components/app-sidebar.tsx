import { TextAa } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { FilterSidebar } from "@/components/filter-sidebar";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { FacetIndex } from "@/lib/fonts/data";
import type { FilterState } from "@/lib/fonts/filter";

// sidebar-09 layout: a parent icon-collapsible sidebar holding two child
// sidebars side by side. First child is the icon rail (one link home, for now),
// second child is the filter sidebar. Wired for font-finder's data instead of
// the demo's mail list.
export function AppSidebar({
  index,
  filter,
  onFilterChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  index: FacetIndex;
  filter: FilterState;
  onFilterChange: (next: FilterState) => void;
}) {
  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* First sidebar: the icon rail. */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="md:h-8 md:p-0"
                tooltip={{ children: "All fonts", hidden: false }}
                render={<Link to="/" aria-label="All fonts" />}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TextAa className="size-4" weight="bold" />
                </div>
                <span className="truncate font-medium">Font Finder</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      </Sidebar>

      {/* Second sidebar: the filters, filling the remaining width. Render
          FilterSidebar directly so its own ScrollArea owns the scrolling — the
          Sidebar's flex-col h-full gives it a bounded height to scroll within. */}
      <Sidebar
        collapsible="none"
        className="hidden flex-1 bg-background md:flex"
      >
        <FilterSidebar
          index={index}
          filter={filter}
          onChange={onFilterChange}
        />
      </Sidebar>
    </Sidebar>
  );
}
