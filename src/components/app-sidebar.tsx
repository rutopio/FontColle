import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { LogoIcon } from "@/components/logo-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarFooter } from "@/components/ui/sidebar";

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
      {/* The icon rail: a column of two, the wordmark bare at its head and the
          page's buttons in a box below. shrink-0 keeps its width fixed when the
          parent collapses (the panel closing must not squeeze the rail).

          Only as tall as those two, so self-start stops the flex row stretching
          it to fill the shell. max-h keeps it inside on a short viewport, where
          the buttons box gives way and its ScrollArea takes over; it subtracts
          the column's own 2-unit margins, which a plain max-h-full would
          overshoot by exactly that much.

          mr-0, like the inset's ml-0: the panel to the right already carries an
          8px left margin, and two margins between neighbours would set the rail
          twice as far from the panel as the panel is from the content box.

          Width is --sidebar-width-icon minus its own left margin, so column plus
          margin comes to exactly the width the shell reserves for the rail when
          the panel is collapsed away. Deriving it the other way (icon width plus
          a bit) overflowed that reserved width and the box lost its right edge
          to the shell's overflow-hidden. */}
      <div className="my-2 mr-0 ml-2 flex max-h-[calc(100%-1rem)] w-[calc(var(--sidebar-width-icon)-0.5rem)] shrink-0 flex-col gap-2 self-start">
        {/* The wordmark, at the head of the rail. h-16 matches the Column
            header beside it, so the two top out on the same line.

            No border and no background: it sits directly on the shell's tint,
            the one thing in the column that is not a box. Hover still tints it,
            so it does not read as inert — but as a wash over the frame rather
            than a panel of its own.

            It links home, the default action for a wordmark. About is not here:
            it has its own InfoIcon button in the footers below. */}
        <Link
          to="/"
          // Must contain the visible "FontColle" text: WCAG 2.5.3 (Label in
          // Name) so voice-control users can say what they see.
          aria-label="FontColle, all fonts"
          className="group/logo flex h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl p-2 text-primary outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-sidebar-ring dark:hover:bg-white/6"
        >
          <LogoIcon className="size-7 transition-[stroke-width] group-hover/logo:[stroke-width:2]" />
          <span className="font-mono text-[9px] group-hover/logo:font-bold">
            FontColle
          </span>
        </Link>

        {/* The page's rail buttons, plus the collapsed-state fallback controls.
            min-h-0 lets it give way on a short viewport, where the ScrollArea
            inside takes over. */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background">
          {rail && (
            <ScrollArea className="min-h-0 flex-1 p-2">
              <div className="pb-2">{rail}</div>
            </ScrollArea>
          )}
          {/* These four live in the panel's footer strip (below). They stay
              here as the fallback for when the panel is collapsed away — the
              detail page's read-only views do that — since otherwise Theme and
              About would have nowhere to be. Only ever one of the two is in the
              tree: `hidden` drops this copy from the a11y tree as well. */}
          <SidebarFooter className="mt-auto gap-1 p-2 group-data-[state=expanded]:hidden">
            {personal}
            <FavoriteToggle fontId={favoriteFontId} />
            {/* -mx-2 spans the rule past the footer's p-2 so it meets both
                edges. The width utility needs the same data-horizontal: variant
                the primitive uses, or its `w-full` wins and the rule stops short
                of the padding. my-1 keeps it off both neighbours. */}
            <Separator className="-mx-2 my-1 data-horizontal:w-auto" />
            <ThemeToggle />
            <AboutLink />
          </SidebarFooter>
        </div>
      </div>

      {/* Second sidebar: the page's own panel, filling the remaining width. The
          panel provides its own ScrollArea for scrolling, the Sidebar's
          flex-col h-full gives it a bounded height to scroll within.

          min-w-0 is load-bearing: as a flex item this defaults to
          min-width:auto, so however wide its content wants to be wins over
          flex-basis:0. Expanding a long list (Variable axes' "more") pushed it
          from its 318px share to 365px inside a 391px sidebar and the panel
          spilled out. With min-w-0 it keeps its share and the content wraps or
          truncates inside instead. */}
      {/* Boxed to mirror the main content area (see filter-layout's
          SidebarInset): same margin, radius, border and background, so the two
          read as a matched pair either side of the rail. No md: prefixes needed
          — this panel is already desktop-only, mobile reaches the filters
          through FilterDrawer instead. overflow-hidden clips the panel's own
          ScrollArea to the rounded corners, so the list scrolls inside the box.

          h-auto overrides the primitive's h-full, which is load-bearing here:
          100% height plus a 2-unit margin is 16px taller than the space it sits
          in, and the overflow it caused was clipped off the bottom — taking the
          box's bottom border with it. As a stretched flex item it now measures
          itself from what is left after the margins. */}
      <Sidebar
        collapsible="none"
        className="m-2 hidden h-auto min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-background md:flex"
      >
        {children}
        {/* Footer strip, mirroring the main area's preview field: a fixed row
            pinned to the bottom of the box with a rule above it, while only the
            body above scrolls. Left to right: Preset, Favorite, Theme, About —
            the two device-local personal things first, then the two app-level
            toggles, the same order the rail's stacked footer used.

            The "rail" variant, not "bar": these carry their captions like the
            preview field's Top button does, icon stacked over a 10px label. */}
        {/* h-16 to the pixel, not padding around the buttons: the main area's
            preview field is a fixed 4rem (see Column's footer), and letting
            this one be sized by its contents instead made it ~3px deeper — the
            captioned buttons come to 50px, and p-2 around them overshot. The
            buttons centre in the fixed height. */}
        <div className="flex h-16 shrink-0 items-center gap-1 border-border border-t px-2 *:flex-1">
          {/* The strip is always four columns wide. `personal` is the list
              page's Preset button; the detail page passes none, and with
              *:flex-1 the remaining three would spread out to fill the row and
              land nowhere near where they sit on the list page. An empty div
              holds the first column so Favorite, Theme and About keep the same
              three positions on both pages, and the eye sees them stay put
              across a navigation instead of sliding. aria-hidden: it is a
              spacer, with nothing to announce. */}
          {personal ?? <div aria-hidden />}
          <FavoriteToggle fontId={favoriteFontId} />
          <ThemeToggle />
          <AboutLink />
        </div>
      </Sidebar>
    </Sidebar>
  );
}
