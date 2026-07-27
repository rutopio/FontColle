import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { LogoIcon } from "@/components/logo-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarFooter } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// sidebar-09 layout: a parent icon-collapsible sidebar holding two child
// sidebars side by side. First child is the icon rail (the home link, plus
// whatever switcher the page hands us via `rail`), second child is the page's
// own panel (list filters / detail features), passed in as children.
export function AppSidebar({
  rail,
  favoriteFontId,
  children,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  rail?: React.ReactNode;
  // When set (the detail page), the Favorite button hearts this font instead of
  // toggling the list's favorites-only view.
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

          Full height, not self-start: Theme and About sit in their own box at
          the foot of the column, level with the bottom of the panel beside it,
          so the column has to span the shell for them to be pushed down to.
          h-[calc(100%-1rem)] subtracts the column's own 2-unit margins, which a
          plain h-full would overshoot by exactly that much.

          Everything above that box — the wordmark and the page's rail buttons —
          scrolls, so a short viewport can still reach all of it. The scroll has
          to wrap both, not just the buttons: the wordmark is a fixed h-16 that
          never shrinks, so on a short enough viewport it alone overflows the
          column and the overflow-hidden clips whatever follows it.

          mr-0, like the inset's ml-0: the panel to the right already carries an
          8px left margin, and two margins between neighbours would set the rail
          twice as far from the panel as the panel is from the content box.

          Width is --sidebar-width-icon minus its own left margin, so column plus
          margin comes to exactly the width the shell reserves for the rail when
          the panel is collapsed away. Deriving it the other way (icon width plus
          a bit) overflowed that reserved width and the box lost its right edge
          to the shell's overflow-hidden. */}
      <div className="my-2 mr-0 ml-2 flex h-[calc(100%-1rem)] w-[calc(var(--sidebar-width-icon)-0.5rem)] shrink-0 flex-col gap-2">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2">
            {/* The wordmark, at the head of the rail. h-16 matches the Column
            header beside it, so the two top out on the same line.

            No border and no background: it sits directly on the shell's tint,
            the one thing in the column that is not a box. Hover still tints it,
            so it does not read as inert — but as a wash over the frame rather
            than a panel of its own.

            It links home, the default action for a wordmark. About is not here:
            it has its own InfoIcon button in the box at the foot of the
            column. */}
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

            {/* The page's rail buttons, plus the detail page's Favorite as the
            fallback for when the panel is collapsed away (its read-only views
            do that), since otherwise that control would have nowhere to be.
            Only ever one of the two copies is in the tree: `hidden` drops this
            one from the a11y tree as well.

            No scroll of its own: the column around it scrolls, so this box is
            just as tall as its contents.

            While the list's catalog loads there is no `rail` yet, and on the
            list page there is no Favorite here either — the box had nothing in
            it, collapsed to zero height, and its two borders stacked into a
            stray rule under the wordmark. So with no rail, hide the box in
            exactly the state that empties it; the rail's arrival (or a
            collapsed panel on the detail page) shows it again. */}
            <div
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border border-border bg-background",
                !rail && "group-data-[state=expanded]:hidden"
              )}
            >
              {rail && <div className="p-2">{rail}</div>}
              {favoriteFontId && (
                <SidebarFooter
                  className={cn(
                    "gap-1 p-2 group-data-[state=expanded]:hidden",
                    rail && "pt-0"
                  )}
                >
                  <FavoriteToggle fontId={favoriteFontId} />
                </SidebarFooter>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Theme and About, in a box of their own at the foot of the column.
            These two are the only controls that mean the same thing on every
            page — they act on the app, not on the list or the font you are
            looking at — so they sit apart from the page's own rail above,
            outside its scroll, always in the same place. mt-auto pins the box
            to the bottom of the column, level with the foot of the panel
            beside it. */}
        <div className="mt-auto flex shrink-0 flex-col gap-1 rounded-xl border border-border bg-background p-2">
          <ThemeToggle />
          <AboutLink />
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
        {/* Header strip, mirroring the list column's header (filter-layout's
            headerEl): a fixed row pinned to the top of the box with a rule
            below it, while only the body underneath scrolls.

            Detail page only, and down to one control. This row once held
            Preset, Favorite, Theme and About; each turned out to belong with
            what it acts on — Preset at the head of the filter rail, the list
            page's Favorite in the list column's own header, and Theme/About in
            their own box at the foot of the rail, since they are the same on
            every page. What is left is the detail page's Favorite, which hearts
            the font you are looking at. With nothing to show on the list page
            the strip is dropped there, rather than ruling off an empty row.

            The "rail" variant, not "bar": it carries its caption like the
            preview field's Top button does, icon stacked over a 10px label. */}
        {/* h-16 to the pixel, not padding around the button: the list header
            beside it is a fixed 4rem, and letting this one be sized by its
            contents instead made it ~3px deeper — the captioned button comes to
            50px, and p-2 around it overshot. The button centres in the fixed
            height. */}
        {favoriteFontId && (
          <div className="flex h-16 shrink-0 items-center gap-1 border-border border-b px-2 *:flex-1">
            <FavoriteToggle fontId={favoriteFontId} />
          </div>
        )}
        {children}
      </Sidebar>
    </Sidebar>
  );
}
