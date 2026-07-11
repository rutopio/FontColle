import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { LogoIcon } from "@/components/logo-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sidebar,
    SidebarFooter,
    SidebarHeader,
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
            {/* First sidebar: the icon rail. shrink-0 keeps its width fixed when the
          parent collapses (the panel closing must not squeeze the rail). */}
            <Sidebar
                collapsible="none"
                className="w-[calc(var(--sidebar-width-icon)+1px)]! shrink-0 border-r"
            >
                {/* The wordmark is a plain link, not a SidebarMenuButton — it is
            just the home icon and doesn't need the button's icon-collapse
            styling. px-1.5 matches the rail nav below so it lines up with and
            spans the same width as the group buttons. aspect-square keeps it a
            square tile. */}
                <SidebarHeader className="p-2 mb-8">
                    <Link
                        to="/"
                        aria-label="All fonts"
                        className="group/logo flex aspect-square w-full flex-col items-center justify-center rounded-lg text-primary"
                    >
                        <LogoIcon className="size-8 transition-[stroke-width] group-hover/logo:[stroke-width:2.5]" />
                        <span className="font-mono text-[9px]">FontColle</span>
                    </Link>
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
