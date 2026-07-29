import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { LogoIcon } from "@/components/logo-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/ui/sidebar";

// sidebar-09 layout: a parent icon-collapsible sidebar holding two child
// sidebars side by side. First child is the icon rail (the home link, plus
// whatever switcher the page hands us via `rail`), second child is the page's
// own panel (list filters / detail features), passed in as children.
export function AppSidebar({
  rail,
  children,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  rail?: React.ReactNode;
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

          Full height, so the column spans the shell alongside the panel beside
          it. h-[calc(100%-1rem)] subtracts the column's own 2-unit margins,
          which a plain h-full would overshoot by exactly that much.

          The wordmark and the page's rail buttons both scroll, so a short
          viewport can still reach all of it. The scroll has to wrap both, not
          just the buttons: the wordmark is a fixed h-16 that never shrinks, so
          on a short enough viewport it alone overflows the column and the
          overflow-hidden clips whatever follows it.

          mr-0, like the inset's ml-0: the panel to the right already carries an
          8px left margin, and two margins between neighbours would set the rail
          twice as far from the panel as the panel is from the content box.

          Width is --sidebar-width-icon minus its own left margin, so column plus
          margin comes to exactly the width the shell reserves for the rail when
          the panel is collapsed away. Deriving it the other way (icon width plus
          a bit) overflowed that reserved width and the box lost its right edge
          to the shell's overflow-hidden. */}
      <div className="my-2 mr-0 ml-2 flex h-[calc(100%-1rem)] w-[calc(var(--sidebar-width-icon)-0.5rem)] shrink-0 flex-col gap-2">
        {/* The wordmark, at the head of the rail. h-16 matches the Column
            header beside it, so the two top out on the same line.

            Outside the scroll below, so a short viewport scrolls the buttons
            past it rather than taking the wordmark with them — the same way the
            filter panel keeps its frame while its list moves.

            No border and no background: it sits directly on the shell's tint,
            the one thing in the column that is not a box. Hover still tints it,
            so it does not read as inert — but as a wash over the frame rather
            than a panel of its own.

            It links home, the default action for a wordmark. */}
        <Link
          to="/"
          // Must contain the visible "FontColle" text: WCAG 2.5.3 (Label in
          // Name) so voice-control users can say what they see.
          aria-label="FontColle, all fonts"
          className="group/logo flex h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl p-2 text-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring dark:hover:bg-white/6"
        >
          <LogoIcon className="size-7 transition-[stroke-width] group-hover/logo:[stroke-width:2]" />
          <span className="font-mono text-[9px] group-hover/logo:font-bold">
            FontColle
          </span>
        </Link>

        {/* The page's rail buttons, scrolling inside their own box: on a short
            viewport the list moves within the border rather than sliding the
            whole column. min-h-0 lets the box shrink below its content's height
            so the ScrollArea has something to scroll within.

            Nothing else lives here now. Favorite used to sit below as the
            fallback for a collapsed panel, on both pages; each page's own
            header carries it instead, and those are on screen whatever the
            panel is doing. Rendered only when there is a rail, so the empty box
            does not stack its two borders into a stray rule under the
            wordmark. */}
        {rail && (
          <div className="flex min-h-0 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col p-2">{rail}</div>
            </ScrollArea>
          </div>
        )}
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
      {/* mt-20 drops the panel clear of the page header lifted over
          it — 4.5rem for the header band (h-16 plus its mt-2) and 0.5rem for
          the gutter, so the gap under the header matches the 8px between every
          other pair of boxes in the shell. h-auto already measures what is
          left after the margins, so the box still ends level with the content
          beside it. */}
      <Sidebar
        collapsible="none"
        className="m-2 hidden h-auto min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-background md:mt-20 md:flex"
      >
        {/* No header strip any more. It once held Preset, Favorite, Theme and
            About; each turned out to belong with what it acts on — Preset at
            the foot of the filter rail, and Theme, About and Favorite in each
            page's own column header, where they stay put whatever the panel is
            doing. */}
        {children}
      </Sidebar>
    </Sidebar>
  );
}
