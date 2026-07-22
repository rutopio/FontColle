import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { LogoIcon } from "@/components/logo-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";

// sidebar-09 layout: a parent icon-collapsible sidebar holding two child
// sidebars side by side. First child is the icon rail (the home link, plus
// whatever switcher the page hands us via `rail`), second child is the page's
// own panel (list filters / detail features), passed in as children.
export function AppSidebar({
  rail,
  personal,
  favoriteFontId,
  children,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  rail?: React.ReactNode;
  // Page-supplied control that belongs with Favorite in the personal group
  // (the list page's Preset button). Sits directly above Favorite.
  personal?: React.ReactNode;
  // When set (the detail page), the footer Favorite button hearts this font
  // instead of toggling the list's favorites-only view.
  favoriteFontId?: string;
}) {
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
        {/* The wordmark is a plain link, not a SidebarMenuButton, it is
            just the home icon and doesn't need the button's icon-collapse
            styling. px-1.5 matches the rail nav below so it lines up with and
            spans the same width as the group buttons. aspect-square keeps it a
            square tile. */}
        {/* h-16 + border-b mirrors the Column header (filter-layout) exactly:
            both are 64px tall with the divider drawn *inside* that box, so the
            rail's line and the header's line land on the same pixel. Using a
            Separator here instead would sit outside the box and hang 1px low. */}
        <SidebarHeader className="h-16 justify-center border-border border-b p-2">
          <Link
            to="/"
            // Must contain the visible "FontColle" text: WCAG 2.5.3 (Label in
            // Name) so voice-control users can say what they see.
            aria-label="FontColle, all fonts"
            className="group/logo flex w-full flex-col items-center justify-center gap-1 rounded-lg text-primary"
          >
            <LogoIcon className="size-7 transition-[stroke-width] group-hover/logo:[stroke-width:2]" />
            <span className="font-mono text-[9px] transition-all group-hover/logo:font-bold">
              FontColle
            </span>
          </Link>
        </SidebarHeader>
        {rail && (
          <ScrollArea className="min-h-0 flex-1 p-2">
            <div className="pb-2">{rail}</div>
          </ScrollArea>
        )}
        {/* mt-auto pins the toggles to the rail's bottom whether or not a rail
            fills the space above it. Same p-2 as the rail's ScrollArea so the
            footer buttons line up with the rail buttons above.

            Two tiers, split by the separator: above it the personal, per-device
            things (Preset, Favorite — both localStorage, neither shareable via
            URL); below it the app-level ones (theme, about). The separator sits
            immediately above Dark, so the line reads as "your stuff ends here". */}
        <SidebarFooter className="mt-auto gap-1 p-2">
          {personal}
          <FavoriteToggle fontId={favoriteFontId} />
          {/* -mx-2 spans the rule past the footer's p-2 so it meets both edges,
              like the header's border-b. The width utility needs the same
              data-horizontal: variant the primitive uses, or its `w-full` wins
              and the rule stops short of the padding. my-1 keeps it off both
              neighbours. */}
          <Separator className="-mx-2 my-1 data-horizontal:w-auto" />
          <ThemeToggle />
          <AboutLink />
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar: the page's own panel, filling the remaining width. The
          panel provides its own ScrollArea for scrolling, the Sidebar's
          flex-col h-full gives it a bounded height to scroll within.

          min-w-0 is load-bearing: as a flex item this defaults to
          min-width:auto, so however wide its content wants to be wins over
          flex-basis:0. Expanding a long list (Variable axes' "more") pushed it
          from its 318px share to 365px inside a 391px sidebar and the panel
          spilled out. With min-w-0 it keeps its share and the content wraps or
          truncates inside instead. */}
      <Sidebar
        collapsible="none"
        className="hidden min-w-0 flex-1 bg-background md:flex"
      >
        {children}
      </Sidebar>
    </Sidebar>
  );
}
