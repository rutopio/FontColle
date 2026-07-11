import { TextAaIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

// sidebar-09 layout: a parent icon-collapsible sidebar holding two child
// sidebars side by side. First child is the icon rail (the home link, plus
// whatever switcher the page hands us via `rail`), second child is the page's
// own panel (list filters / detail features), passed in as children.
export function AppSidebar({
  rail,
  children,
  ...props
}: React.ComponentProps<typeof Sidebar> & { rail?: React.ReactNode }) {
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
              {/* The rail is icon-only, so the wordmark stays in the tooltip. */}
              <SidebarMenuButton
                size="lg"
                className="justify-center md:h-8 md:p-0"
                tooltip={{ children: "Font Finder", hidden: false }}
                render={<Link to="/" aria-label="All fonts" />}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <TextAaIcon className="size-4" weight="bold" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        {rail && (
          <ScrollArea className="min-h-0 flex-1">
            <div className="pb-2">{rail}</div>
          </ScrollArea>
        )}
        {/* mt-auto pins the toggle to the rail's bottom whether or not a rail
            fills the space above it. p-0 lets the toggle's own nav padding
            match the rail buttons above (px-1.5). */}
        <SidebarFooter className="mt-auto p-0 pb-2">
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar: the page's own panel, filling the remaining width. The
          panel provides its own ScrollArea for scrolling — the Sidebar's
          flex-col h-full gives it a bounded height to scroll within. */}
      <Sidebar
        collapsible="none"
        className="hidden flex-1 bg-background md:flex"
      >
        {children}
      </Sidebar>
    </Sidebar>
  );
}
